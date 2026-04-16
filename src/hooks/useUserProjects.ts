import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { auth, db } from "../Config/Firebase";

// Shared project model and derived labels used across the workspace views.
export type ProjectStatus = "Not Started" | "Processing" | "Processed" | "Failed";

export type UserProject = {
  documentId: string;
  id: string;
  uid: string;
  name: string;
  description: string;
  status: ProjectStatus;
  imageCount: number;
  totalImageSizeBytes: number;
  projectPath: string;
  basePath: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  createdAtMs: number;
  dateLabel: string;
  sizeLabel: string;
  locationLabel: string;
  progress: number;
  typeLabel: string;
};

const getDateFromFirestoreValue = (value: unknown): Date | null => {
  // Convert Firestore timestamps when present.
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
};

const normalizeStatus = (statusValue?: string): ProjectStatus => {
  // Collapse backend status strings into the four UI states.
  const normalizedStatus = statusValue?.trim().toLowerCase();

  if (normalizedStatus === "processed" || normalizedStatus === "completed") {
    return "Processed";
  }

  if (normalizedStatus === "processing") {
    return "Processing";
  }

  if (normalizedStatus === "failed") {
    return "Failed";
  }

  return "Not Started";
};

const getProgressByStatus = (status: ProjectStatus, persistedProgress?: number) => {
  // Fall back to a representative progress value when the document lacks one.
  if (typeof persistedProgress === "number") {
    return Math.min(100, Math.max(0, Math.round(persistedProgress)));
  }

  if (status === "Processed") return 100;
  if (status === "Processing") return 55;
  return 0;
};

const formatRelativeDate = (date: Date | null) => {
  if (!date) return "No date";

  const diffMs = Date.now() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) {
    return "Just now";
  }

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} min ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
};

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 ** 2) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  if (sizeInBytes < 1024 ** 3) return `${(sizeInBytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(sizeInBytes / 1024 ** 3).toFixed(2)} GB`;
};

const getTypeLabel = (
  options: { generate3D?: boolean; generateOrtho?: boolean; generateNDVI?: boolean } | undefined
) => {
  if (!options) return "Photogrammetry";

  if (options.generateNDVI) {
    return "NDVI";
  }

  if (options.generate3D && options.generateOrtho) {
    return "3D + Ortho";
  }

  if (options.generate3D) {
    return "3D";
  }

  if (options.generateOrtho) {
    return "Orthophoto";
  }

  return "Photogrammetry";
};

const getLocationLabel = (basePath: string, projectPath: string) => {
  const sourcePath = basePath || projectPath;

  if (!sourcePath) {
    return "No location";
  }

  const normalizedPath = sourcePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/").filter(Boolean);

  return segments[segments.length - 1] || sourcePath;
};

export function useUserProjects() {
  // Subscribe to the signed-in user's project collection and derive display fields.
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProjects: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProjects?.();
      setIsLoading(true);

      if (!user) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      const projectsQuery = query(
        collection(db, "Users", user.uid, "Projects"),
        orderBy("createdAt", "desc")
      );

      unsubscribeProjects = onSnapshot(
        projectsQuery,
        (snapshot) => {
          const mappedProjects = snapshot.docs.map((projectDoc) => {
            const projectData = projectDoc.data() as {
              projectId?: string;
              uid?: string;
              name?: string;
              description?: string;
              status?: string;
              progress?: number;
              imageCount?: number;
              totalImageSizeBytes?: number;
              projectPath?: string;
              basePath?: string;
              createdAt?: unknown;
              updatedAt?: unknown;
              processingOptions?: {
                generate3D?: boolean;
                generateOrtho?: boolean;
                generateNDVI?: boolean;
              };
            };

            const createdAt = getDateFromFirestoreValue(projectData.createdAt);
            const updatedAt = getDateFromFirestoreValue(projectData.updatedAt);
            const normalizedStatus = normalizeStatus(projectData.status);
            const imageCount = typeof projectData.imageCount === "number" ? projectData.imageCount : 0;
            const storedProgress = typeof projectData.progress === "number" ? projectData.progress : undefined;
            const totalImageSizeBytes =
              typeof projectData.totalImageSizeBytes === "number" ? projectData.totalImageSizeBytes : 0;
            const projectPath = typeof projectData.projectPath === "string" ? projectData.projectPath : "";
            const basePath = typeof projectData.basePath === "string" ? projectData.basePath : "";

            return {
              documentId: projectDoc.id,
              id: projectData.projectId || projectDoc.id,
              uid: projectData.uid || user.uid,
              name: projectData.name?.trim() || "Untitled Project",
              description: projectData.description?.trim() || "",
              status: normalizedStatus,
              imageCount,
              totalImageSizeBytes,
              projectPath,
              basePath,
              createdAt,
              updatedAt,
              createdAtMs: createdAt?.getTime() ?? 0,
              dateLabel: formatRelativeDate(createdAt),
              sizeLabel: formatFileSize(totalImageSizeBytes),
              locationLabel: getLocationLabel(basePath, projectPath),
              progress: getProgressByStatus(normalizedStatus, storedProgress),
              typeLabel: getTypeLabel(projectData.processingOptions),
            } satisfies UserProject;
          });

          setProjects(mappedProjects);
          setIsLoading(false);
        },
        (error) => {
          console.error("Failed to load user projects", error);
          setProjects([]);
          setIsLoading(false);
        }
      );
    });

    return () => {
      unsubscribeProjects?.();
      unsubscribeAuth();
    };
  }, []);

  return { projects, isLoading };
}
