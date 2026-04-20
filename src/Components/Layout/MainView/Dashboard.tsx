import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { motion } from "framer-motion";
import RecentProjectCard from "../../DashboardView/RecentProjectCard";
import StatCard from "../../DashboardView/StatCard";
import {
  Plus,
  FolderOpen,
  Upload,
  Clock,
  CheckCircle,
  Target,
  Award,
  ArrowRight,
  Sparkles,
  Activity,
  Folder,
  Image as ImageIcon,
} from "lucide-react";
import { useSystemMetrics } from "../../../hooks/useSystemMetrics";
import { auth, db } from "../../../Config/Firebase";

// Canonical project status values used by the dashboard summary and activity feed.
type ProjectStatus = "Not Started" | "Processing" | "Processed" | "Failed";

type DashboardProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  date: string;
  images: number;
  iconUrl: string;
  createdAtMs: number;
};

const toFileAssetUrl = (value: string) => {
  if (!value) return "";

  if (/^(https?:|data:|file:)/i.test(value)) {
    return value;
  }

  const normalizedPath = value.replace(/\\/g, "/").replace(/^\/+/, "");
  return encodeURI(`file:///${normalizedPath}`);
};

const getDateFromFirestoreValue = (value: unknown) => {
  // Firestore timestamps expose toDate(); convert them when available.
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return undefined;
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
  // Favor stored progress, then fall back to a representative default.
  if (typeof persistedProgress === "number") {
    return Math.min(100, Math.max(0, Math.round(persistedProgress)));
  }

  if (status === "Processed") return 100;
  if (status === "Processing") return 55;
  return 0;
};

const formatRelativeDate = (date?: Date) => {
  // Compact relative-time labels for dashboard cards.
  if (!date) return "Just now";

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

function Dashboard() {
  // Load the signed-in user's projects and present summary metrics.
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);
  const [userFirstName, setUserFirstName] = useState("there");
  const { storagePercent, storageUsedGB, storageTotalGB, storageLabel } = useSystemMetrics();

  useEffect(() => {
    // Keep the dashboard in sync with auth state and Firestore updates.
    let unsubscribeProjects: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeProjects?.();
      setIsProjectsLoading(true);

      if (!user) {
        setProjects([]);
        setUserFirstName("there");
        setIsProjectsLoading(false);
        return;
      }

      const fallbackName = user.displayName || user.email?.split("@")[0] || "there";

      try {
        const userSnapshot = await getDoc(doc(db, "Users", user.uid));
        const userData = userSnapshot.data() as { firstName?: string } | undefined;
        setUserFirstName(userData?.firstName?.trim() || fallbackName);
      } catch {
        setUserFirstName(fallbackName);
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
              name?: string;
              status?: string;
              progress?: number;
              imageCount?: number;
              projectIconPath?: string;
              createdAt?: unknown;
            };

            const createdAtDate = getDateFromFirestoreValue(projectData.createdAt);
            const status = normalizeStatus(projectData.status);
            const progress =
              typeof projectData.progress === "number"
                ? Math.min(100, Math.max(0, Math.round(projectData.progress)))
                : undefined;

            return {
              id: projectData.projectId || projectDoc.id,
              name: projectData.name?.trim() || "Untitled Project",
              status,
              progress: getProgressByStatus(status, progress),
              date: formatRelativeDate(createdAtDate),
              images: typeof projectData.imageCount === "number" ? projectData.imageCount : 0,
              iconUrl: toFileAssetUrl(typeof projectData.projectIconPath === "string" ? projectData.projectIconPath : ""),
              createdAtMs: createdAtDate?.getTime() ?? 0,
            } satisfies DashboardProject;
          });

          setProjects(mappedProjects);
          setIsProjectsLoading(false);
        },
        (error) => {
          console.error("Failed to load projects from Firestore", error);
          setProjects([]);
          setIsProjectsLoading(false);
        }
      );
    });

    return () => {
      unsubscribeProjects?.();
      unsubscribeAuth();
    };
  }, []);

  const recentProjects = useMemo(() => projects.slice(0, 4), [projects]);
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (project) => project.status === "Processing" || project.status === "Not Started"
  ).length;
  const completedProjects = projects.filter((project) => project.status === "Processed").length;
  const totalImages = projects.reduce((total, project) => total + project.images, 0);
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;
  const projectsCreatedThisWeek = projects.filter(
    (project) => project.createdAtMs >= Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length;

  const activityItems = useMemo(
    () =>
      recentProjects.map((project) => {
        if (project.status === "Processed") {
          return {
            action: "Processing completed",
            project: project.name,
            time: project.date,
            icon: CheckCircle,
            color: "text-primary",
          };
        }

        if (project.status === "Processing") {
          return {
            action: "Processing started",
            project: project.name,
            time: project.date,
            icon: Activity,
            color: "text-yellow-500",
          };
        }

        if (project.status === "Failed") {
          return {
            action: "Processing failed",
            project: project.name,
            time: project.date,
            icon: Activity,
            color: "text-red-500",
          };
        }

        return {
          action: "Project created",
          project: project.name,
          time: project.date,
          icon: Plus,
          color: "text-blue-500",
        };
      }),
    [recentProjects]
  );

  return (
    <div className="h-full overflow-auto">
      {/* Hero Section */}
      <div className="relative px-8 py-12 border-b border-border bg-linear-to-br from-primary/5 via-background to-background overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium">
                Welcome back
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-3">
              Hello, {userFirstName}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              You currently have {totalProjects} project{totalProjects === 1 ? "" : "s"} in your workspace.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                icon={Folder}
                label="Total Projects"
                value={String(totalProjects)}
                trend={`${projectsCreatedThisWeek} created this week`}
                color="bg-primary/10 text-primary"
              />
              <StatCard
                icon={Clock}
                label="In Progress"
                value={String(activeProjects)}
                trend={activeProjects > 0 ? "Currently running or queued" : "No active projects"}
                color="bg-yellow-500/10 text-yellow-500"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed"
                value={String(completedProjects)}
                trend={`${completionRate}% completion rate`}
                color="bg-primary/10 text-primary"
              />
              <StatCard
                icon={ImageIcon}
                label="Total Images"
                value={String(totalImages)}
                trend="Linked to your projects"
                color="bg-blue-500/10 text-blue-500"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                Quick Actions
              </h2>
              <p className="text-sm text-muted-foreground">
                Start your workflow in seconds
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Link to="/newproject">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="relative group overflow-hidden bg-linear-to-br from-primary to-primary/80 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Create New Project
                  </h3>
                  <p className="text-sm text-white/80 mb-4">
                    Start a new photogrammetry project from
                    scratch
                  </p>
                  <div className="flex items-center gap-2 text-white font-medium">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link to="/openproject">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="relative group overflow-hidden bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FolderOpen className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Open Project
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Continue working on existing projects
                </p>
                <div className="flex items-center gap-2 text-primary font-medium">
                  <span>Browse Projects</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>

            <Link to="/dashboard/import-images">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="relative group overflow-hidden bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Import Images
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload drone images for processing
                </p>
                <div className="flex items-center gap-2 text-primary font-medium">
                  <span>Upload Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-8">
          {/* Recent Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="col-span-2"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  Recent Projects
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your latest work
                </p>
              </div>
              <Link
                to="/projects"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {isProjectsLoading ? (
              <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
                Loading your projects...
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
                No projects yet. Create your first project to see it here.
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.2 + index * 0.08,
                    }}
                  >
                    <RecentProjectCard project={project} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Activity Feed & Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Recent Activity */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Recent Activity
                </h2>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                {isProjectsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading activity...</p>
                ) : activityItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Activity will appear as you create projects.</p>
                ) : (
                  activityItems.map((activity, index) => (
                    <div
                      key={`${activity.project}-${index}`}
                      className="flex items-start gap-3 pb-3 last:pb-0 border-b border-border last:border-0"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0 ${activity.color}`}
                      >
                        <activity.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.project}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pro Tips */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Pro Tips
                </h2>
              </div>
              <div className="bg-linear-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      Optimize Image Overlap
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Maintain 70-80% overlap between images for
                      best reconstruction results.
                    </p>
                  </div>
                </div>
                <button className="w-full py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-lg transition-colors">
                  Learn More
                </button>
              </div>
            </div>

            {/* Storage Usage */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Storage
                </h2>
                <span className="text-sm text-muted-foreground">
                  {storageUsedGB.toFixed(1)} GB / {storageTotalGB.toFixed(1)} GB
                </span>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {Math.round(storagePercent)}% used on {storageLabel}
                  </span>
                  <button className="text-primary hover:underline">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}



export default Dashboard;