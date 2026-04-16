import { AlertCircle, Folder, Grid3x3, List, Play, Search, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "../../../Config/Firebase";
import { useUserProjects } from "../../../hooks/useUserProjects";
import ProjectCard from "./Projects/ProjectCard";
import ProjectListItem from "./Projects/ProjectListItem";
import { type UserProject } from "../../../hooks/useUserProjects";

// Tabs and sorting modes for the projects browser.
type FilterTab = "all" | "active" | "completed" | "failed";
type SortBy = "date" | "name" | "size" | "images";

function Projects() {
  // Manage the project gallery, search/filter controls, and delete flow.
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<UserProject | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { projects, isLoading } = useUserProjects();

  const handleRequestDeleteProject = (project: UserProject) => {
    // Open the delete confirmation modal for a specific project.
    setDeleteError("");
    setProjectToDelete(project);
  };

  const handleCancelDeleteProject = () => {
    if (isDeletingProject) return;
    setDeleteError("");
    setProjectToDelete(null);
  };

  const handleConfirmDeleteProject = async () => {
    // Remove the project record and optionally trash its local folder.
    if (!projectToDelete || isDeletingProject) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setDeleteError("You must be signed in to delete a project.");
      return;
    }

    setIsDeletingProject(true);
    setDeleteError("");

    try {
      if (projectToDelete.projectPath) {
        await window.electronAPI.trashProjectFolder(projectToDelete.projectPath);
      }

      await deleteDoc(doc(db, "Users", currentUser.uid, "Projects", projectToDelete.documentId));

      setProjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete project", error);
      setDeleteError("Failed to delete project. Please try again.");
    } finally {
      setIsDeletingProject(false);
    }
  };

  const stats = useMemo(
    () => [
      {
        label: "All Projects",
        value: projects.length,
        icon: Folder,
        color: "bg-primary/10 text-primary",
        filter: "all" as FilterTab,
      },
      {
        label: "Active",
        value: projects.filter(
          (project) => project.status === "Processing" || project.status === "Not Started"
        ).length,
        icon: Play,
        color: "bg-blue-500/10 text-blue-500",
        filter: "active" as FilterTab,
      },
      {
        label: "Completed",
        value: projects.filter((project) => project.status === "Processed").length,
        icon: TrendingUp,
        color: "bg-primary/10 text-primary",
        filter: "completed" as FilterTab,
      },
      {
        label: "Failed",
        value: projects.filter((project) => project.status === "Failed").length,
        icon: AlertCircle,
        color: "bg-red-500/10 text-red-500",
        filter: "failed" as FilterTab,
      },
    ],
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchedProjects = projects.filter((project) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        project.locationLabel.toLowerCase().includes(normalizedSearch) ||
        project.typeLabel.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch);

      const matchesTab =
        filterTab === "all"
          ? true
          : filterTab === "active"
          ? project.status === "Processing" || project.status === "Not Started"
          : filterTab === "completed"
          ? project.status === "Processed"
          : project.status === "Failed";

      return matchesSearch && matchesTab;
    });

    return [...matchedProjects].sort((firstProject, secondProject) => {
      if (sortBy === "name") {
        return firstProject.name.localeCompare(secondProject.name);
      }

      if (sortBy === "size") {
        return secondProject.totalImageSizeBytes - firstProject.totalImageSizeBytes;
      }

      if (sortBy === "images") {
        return secondProject.imageCount - firstProject.imageCount;
      }

      return secondProject.createdAtMs - firstProject.createdAtMs;
    });
  }, [projects, searchQuery, filterTab, sortBy]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border bg-linear-to-r from-background via-primary/5 to-background">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage and organize your photogrammetry projects
            </p>
          </div>
          <Link to="/newproject">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors shadow-lg flex items-center gap-2 font-medium"
            >
              <Folder className="w-5 h-5" />
              New Project
            </motion.button>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <motion.button
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilterTab(stat.filter)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                filterTab === stat.filter
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
              <div className="text-sm font-medium">{stat.label}</div>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects by name, location, type, or description..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
            />
          </div>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortBy)}
            className="px-4 py-3 bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm min-w-40"
          >
            <option value="date">Latest First</option>
            <option value="name">Name A-Z</option>
            <option value="size">Largest Size</option>
            <option value="images">Most Images</option>
          </select>
          <div className="flex bg-card border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition-colors ${
                viewMode === "grid" ? "bg-primary text-white" : "hover:bg-accent"
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list" ? "bg-primary text-white" : "hover:bg-accent"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Folder className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {searchQuery ? "Try adjusting your search terms" : "Start creating your first project"}
            </p>
            <Link to="/newproject">
              <button className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
                Create New Project
              </button>
            </Link>
          </motion.div>
        ) : viewMode === "grid" ? (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-3 gap-6">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <ProjectCard project={project} onRequestDelete={handleRequestDeleteProject} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <ProjectListItem project={project} onRequestDelete={handleRequestDeleteProject} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {projectToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-xl font-semibold">Delete project?</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to delete the project <span className="font-semibold text-foreground">{projectToDelete.name}</span>?
            </p>
            <p className="mb-6 text-xs text-muted-foreground">
              Choosing Yes will move the entire project folder to your recycle bin/trash.
            </p>

            {deleteError && <p className="mb-4 text-sm text-red-500">{deleteError}</p>}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCancelDeleteProject}
                disabled={isDeletingProject}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                No
              </button>
              <button
                onClick={() => void handleConfirmDeleteProject()}
                disabled={isDeletingProject}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingProject ? "Deleting..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
