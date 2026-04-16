import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Box, Download, FolderOpen, Image as ImageIcon } from "lucide-react";
import { auth, db } from "../../../Config/Firebase";

// Viewer screen that loads processed project outputs and offers download/preview links.
type ViewerProjectData = {
    name?: string;
    projectPath?: string;
    status?: string;
    outputs?: {
        outputsFolder?: string;
        allArchivePath?: string;
        orthomosaicPath?: string;
        reconstructionPath?: string;
    };
};

const imagePreviewExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp"]);

const toFileUrl = (filePath: string) => {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const withRoot = /^[A-Za-z]:/.test(normalizedPath) ? `/${normalizedPath}` : normalizedPath;
    return encodeURI(`file://${withRoot}`);
};

const canPreviewImage = (filePath: string) => {
    const extension = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
    return imagePreviewExtensions.has(extension);
};

function Viewer() {
    const { projectId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectStatus, setProjectStatus] = useState("");
    const [projectPath, setProjectPath] = useState("");
    const [orthomosaicPath, setOrthomosaicPath] = useState("");
    const [reconstructionPath, setReconstructionPath] = useState("");
    const [archivePath, setArchivePath] = useState("");

    useEffect(() => {
        const loadProject = async () => {
            if (!projectId) {
                setIsLoading(false);
                return;
            }

            const currentUser = auth.currentUser;
            if (!currentUser?.uid) {
                setErrorMessage("You need to be signed in to open project results.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            try {
                const projectsRef = collection(db, "Users", currentUser.uid, "Projects");
                const projectQuery = query(projectsRef, where("projectId", "==", projectId), limit(1));
                const projectSnapshot = await getDocs(projectQuery);

                if (projectSnapshot.empty) {
                    throw new Error("Project not found.");
                }

                const payload = projectSnapshot.docs[0].data() as ViewerProjectData;
                setProjectName(payload.name?.trim() || projectId);
                setProjectStatus(payload.status?.trim() || "Unknown");
                setProjectPath(payload.projectPath?.trim() || "");
                setArchivePath(payload.outputs?.allArchivePath?.trim() || "");
                setOrthomosaicPath(payload.outputs?.orthomosaicPath?.trim() || "");
                setReconstructionPath(payload.outputs?.reconstructionPath?.trim() || "");
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to load project results.";
                setErrorMessage(message);
            } finally {
                setIsLoading(false);
            }
        };

        void loadProject();
    }, [projectId]);

    const hasAnyOutput = useMemo(
        () => Boolean(archivePath || orthomosaicPath || reconstructionPath),
        [archivePath, orthomosaicPath, reconstructionPath]
    );

    if (!projectId) {
        return (
            <div className="h-full p-8 flex items-center justify-center">
                <div className="max-w-lg text-center bg-card border border-border rounded-xl p-8">
                    <h2 className="text-xl mb-3">Open a processed project</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Select a processed project from Projects to load generated outputs in this viewer.
                    </p>
                    <Link to="/projects" className="px-4 py-2 bg-primary text-white rounded-lg inline-flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Go to Projects
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-card border border-border rounded-xl p-6">
                    <h1 className="text-2xl mb-2">Viewer: {projectName || projectId}</h1>
                    <p className="text-sm text-muted-foreground">
                        Status: {projectStatus}
                    </p>
                </div>

                {isLoading && (
                    <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
                        Loading project outputs...
                    </div>
                )}

                {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-sm text-red-500">
                        {errorMessage}
                    </div>
                )}

                {!isLoading && !errorMessage && !hasAnyOutput && (
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg mb-2">No outputs found yet</h2>
                        <p className="text-sm text-muted-foreground">
                            Finish processing in the Processing tab to generate reconstruction and orthomosaic files.
                        </p>
                    </div>
                )}

                {hasAnyOutput && (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ImageIcon className="w-5 h-5 text-primary" />
                                <h2 className="text-lg">Orthomosaic</h2>
                            </div>
                            {orthomosaicPath ? (
                                <>
                                    {canPreviewImage(orthomosaicPath) ? (
                                        <img
                                            src={toFileUrl(orthomosaicPath)}
                                            alt="Orthomosaic preview"
                                            className="w-full max-h-96 object-contain rounded-lg border border-border bg-secondary"
                                        />
                                    ) : (
                                        <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">
                                            Orthomosaic generated at {orthomosaicPath}. This format cannot be previewed directly here.
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            void window.electronAPI.openExplorer(orthomosaicPath);
                                        }}
                                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg inline-flex items-center gap-2"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        Open Orthomosaic
                                    </button>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">Orthomosaic output is not available for this task.</p>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Box className="w-5 h-5 text-primary" />
                                <h2 className="text-lg">3D Reconstruction</h2>
                            </div>

                            {reconstructionPath ? (
                                <div className="space-y-4">
                                    <div className="rounded-lg border border-border bg-secondary p-4 text-sm break-all">
                                        {reconstructionPath}
                                    </div>
                                    <button
                                        onClick={() => {
                                            void window.electronAPI.openExplorer(reconstructionPath);
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-lg inline-flex items-center gap-2"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        Open Reconstruction
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">3D reconstruction output is not available for this task.</p>
                            )}

                            {archivePath && (
                                <button
                                    onClick={() => {
                                        void window.electronAPI.openExplorer(archivePath);
                                    }}
                                    className="mt-4 px-4 py-2 bg-secondary border border-border rounded-lg inline-flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Open Full Output Archive
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {projectPath && (
                    <div>
                        <button
                            onClick={() => {
                                void window.electronAPI.openExplorer(projectPath);
                            }}
                            className="px-4 py-2 bg-secondary border border-border rounded-lg inline-flex items-center gap-2"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Open Project Folder
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Viewer;