import { useEffect, useState } from "react";
import { FolderOpen, Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { deleteDoc, doc, getDoc, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../Config/Firebase";
import ToggleOption from "./NewProject/ToggleOption";

// Full new-project wizard for naming, configuring, and saving image sets.
type SelectedImage = {
  path: string;
  name: string;
  size: number;
};

const generateProjectId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toProjectNameKey = (name: string) =>
  encodeURIComponent(name.trim().toLowerCase().replace(/\s+/g, " "));

function NewProject() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [defaultProjectLocation, setDefaultProjectLocation] = useState("");
  const [description, setDescription] = useState("");
  const [generate3D, setGenerate3D] = useState(false);
  const [generateOrtho, setGenerateOrtho] = useState(false);
  const [generateNDVI, setGenerateNDVI] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createNudgeKey, setCreateNudgeKey] = useState(0);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [pathInvalid, setPathInvalid] = useState(false);

  const selectedImageCount = selectedImages.length;
  const selectedImageSize = selectedImages.reduce((total, image) => total + image.size, 0);
  const hasAtLeastOneOption = generate3D || generateOrtho || generateNDVI;
  const resolvedProjectLocation = projectPath.trim() || defaultProjectLocation.trim();
  const isProjectNameValid = projectName.trim().length > 0;
  const isProjectPathValid = resolvedProjectLocation.length > 0;
  const isDescriptionValid = description.trim().length > 0;
  const hasEnoughImages = selectedImageCount >= 5;
  
  const isCreateFormValid =
    isProjectNameValid &&
    isProjectPathValid &&
    isDescriptionValid &&
    hasEnoughImages &&
    hasAtLeastOneOption;

  const shouldShowCreateErrorAnimation =
    (validationAttempted && !isCreateFormValid) || pathInvalid;

  useEffect(() => {
    const loadDefaultProjectLocation = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser?.uid) {
        setDefaultProjectLocation("");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
        const userData = userDoc.data() as { defaultProjectLocation?: string } | undefined;
        setDefaultProjectLocation(userData?.defaultProjectLocation?.trim() || "");
      } catch (error) {
        console.error("Failed to load default project location", error);
        setDefaultProjectLocation("");
      }
    };
    void loadDefaultProjectLocation();
  }, []);

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 ** 2) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    if (sizeInBytes < 1024 ** 3) return `${(sizeInBytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(sizeInBytes / 1024 ** 3).toFixed(2)} GB`;
  };

  const mergeSelectedImages = (images: SelectedImage[]) => {
    setSelectedImages((currentImages) => {
      const imageMap = new Map(currentImages.map((image) => [image.path, image]));
      for (const image of images) {
        imageMap.set(image.path, image);
      }
      return Array.from(imageMap.values());
    });
  };

  const isImageFile = (fileName: string) =>
    /\.(jpg|jpeg|png|tif|tiff|bmp|webp)$/i.test(fileName);

  const collectDroppedImages = (files: FileList) => {
    return Array.from(files)
      .filter((file) => isImageFile(file.name))
      .map((file) => {
        const fileWithPath = file as File & { path?: string };
        return {
          path: fileWithPath.path ?? file.name,
          name: file.name,
          size: file.size,
        } satisfies SelectedImage;
      });
  };

  const handleCreateProject = async () => {
    setValidationAttempted(true);
    setPathInvalid(false);

    if (!isCreateFormValid) {
      setCreateNudgeKey((currentKey) => currentKey + 1);
      return;
    }

    let reservedProjectDocRef: any = null;

    try {
      setIsCreating(true);

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in.");

      const cleanedProjectName = projectName.trim();
      const projectId = generateProjectId();
      const projectNameKey = toProjectNameKey(cleanedProjectName);
      const projectDocRef = doc(db, "Users", currentUser.uid, "Projects", projectNameKey);

      // 1. Reserve name in Firestore
      await runTransaction(db, async (transaction) => {
        const existingProjectWithSameName = await transaction.get(projectDocRef);
        if (existingProjectWithSameName.exists()) {
          throw new Error("A project with this name already exists.");
        }
        transaction.set(projectDocRef, {
          projectId,
          uid: currentUser.uid,
          nameKey: projectNameKey,
          name: cleanedProjectName,
          description: description.trim(),
          imageCount: selectedImageCount,
          totalImageSizeBytes: selectedImageSize,
          projectPath: "",
          basePath: resolvedProjectLocation,
          status: "Processing", // Updated status since we launch immediately
          processingOptions: { generate3D, generateOrtho, generateNDVI },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      reservedProjectDocRef = projectDocRef;

      // 2. Create local folders and copy images via Electron
      const result = await window.electronAPI.createProject({
        projectId,
        projectName: cleanedProjectName,
        projectLocation: resolvedProjectLocation,
        description,
        images: selectedImages,
      });

      // 3. Update project path in Firestore
      await setDoc(projectDocRef, {
        projectPath: result.projectPath,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 4. Cleanup and Navigate
      reservedProjectDocRef = null;
      await window.electronAPI.openExplorer(result.projectPath);
      
      navigate(`/processing/${projectId}`, {
        state: { projectId, projectName: cleanedProjectName, imageCount: selectedImageCount },
      });

    } catch (error: any) {
      if (reservedProjectDocRef) {
        try { await deleteDoc(reservedProjectDocRef); } catch { /* ignore */ }
      }
      console.error("Failed to create project", error);
      const invalidPathError = /project location|folder|not found/i.test(error.message);
      setPathInvalid(invalidPathError);
      setCreateNudgeKey((currentKey) => currentKey + 1);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBrowseProjectLocation = async () => {
    const selectedFolder = await window.electronAPI.selectFolder();
    if (selectedFolder) {
      setPathInvalid(false);
      setProjectPath(selectedFolder);
    }
  };

  const handleBrowseImages = async () => {
    const images = await window.electronAPI.selectImages();
    if (images && images.length > 0) mergeSelectedImages(images);
  };

  return (
    <div className="h-full flex flex-col">
      <style>{`
        @keyframes projectCreateShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-4px); }
          30% { transform: translateX(4px); }
          45% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>

      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-2xl mb-2 font-semibold">Create New Project</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new drone mapping project and start autonomous processing.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          {/* Project Information */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-base font-medium mb-4">Project Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 font-medium">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Corn Field Mapping"
                  className={`w-full px-4 py-2.5 bg-input border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all ${
                    validationAttempted && !isProjectNameValid ? "border-red-500 ring-1 ring-red-500/50" : "border-border"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm mb-2 font-medium">Project Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectPath}
                    onChange={(e) => { setPathInvalid(false); setProjectPath(e.target.value); }}
                    placeholder={defaultProjectLocation || "Select storage folder"}
                    className={`flex-1 px-4 py-2.5 bg-input border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all ${
                      validationAttempted && !isProjectPathValid ? "border-red-500 ring-1 ring-red-500/50" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleBrowseProjectLocation}
                    className="px-4 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter project details..."
                  rows={3}
                  className={`w-full px-4 py-2.5 bg-input border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all resize-none ${
                    validationAttempted && !isDescriptionValid ? "border-red-500 ring-1 ring-red-500/50" : "border-border"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Image Import */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-base font-medium mb-4">Drone Imagery</h2>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                mergeSelectedImages(collectDroppedImages(e.dataTransfer.files));
              }}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base mb-2">Drag and drop drone images</h3>
              <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, TIFF</p>
              <button
                type="button"
                onClick={handleBrowseImages}
                className="px-6 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg"
              >
                Browse Files
              </button>
            </div>

            <div className="mt-4 text-sm space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {selectedImageCount} images · {formatFileSize(selectedImageSize)}
                </span>
                {validationAttempted && !hasEnoughImages && (
                  <span className="text-red-500 text-xs">Need at least 5 images</span>
                )}
              </div>
              
              {selectedImages.length > 0 && (
                <div className="max-h-32 overflow-auto rounded-lg border border-border bg-input/20 p-2">
                  {selectedImages.map((img) => (
                    <div key={img.path} className="flex justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                      <span className="truncate max-w-[200px]">{img.name}</span>
                      <span className="text-muted-foreground">{formatFileSize(img.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Processing Options */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-base font-medium mb-4">Output Generation</h2>
            <div className="grid grid-cols-1 gap-4">
              <ToggleOption
                label="3D Textured Mesh"
                description="High-detail .OBJ and .PLY models"
                checked={generate3D}
                onChange={setGenerate3D}
                invalid={validationAttempted && !hasAtLeastOneOption}
              />
              <ToggleOption
                label="Orthophoto Map"
                description="Georeferenced 2D aerial map (GeoTIFF)"
                checked={generateOrtho}
                onChange={setGenerateOrtho}
                invalid={validationAttempted && !hasAtLeastOneOption}
              />
              <ToggleOption
                label="NDVI Index"
                description="Vegetation health analysis (Multispectral)"
                checked={generateNDVI}
                onChange={setGenerateNDVI}
                invalid={validationAttempted && !hasAtLeastOneOption}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pb-10">
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 bg-secondary hover:bg-accent border border-border rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isCreating}
              className={`px-8 py-2.5 text-white rounded-lg transition-all flex items-center gap-2 font-medium ${
                shouldShowCreateErrorAnimation ? "bg-red-600" : "bg-primary hover:bg-primary/90"
              }`}
              style={shouldShowCreateErrorAnimation ? { animation: "projectCreateShake 0.45s ease-in-out" } : undefined}
              key={createNudgeKey}
            >
              {isCreating ? "Processing Files..." : "Start Project"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewProject;