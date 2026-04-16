import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Search, FolderOpen } from "lucide-react";
import { type UserProject, useUserProjects } from "../../../hooks/useUserProjects";
import ProjectCard from "./OpenProject/ProjectCard";

// Convert project status into the filter value used by the dropdown.
const statusToFilterValue = (status: UserProject["status"]) =>
  status.toLowerCase().replace(/\s+/g, "-");

// Choose the route a project should open in based on its status.
const getProjectOpenPath = (project: UserProject) =>
  project.status === "Processed" ? `/viewer/${project.id}` : `/processing/${project.id}`;

function OpenProject() {
  // Browse existing projects and jump directly into viewing or processing.
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const navigate = useNavigate();
  const { projects, isLoading } = useUserProjects();

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchedProjects = projects.filter((project) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        project.locationLabel.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || statusToFilterValue(project.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return matchedProjects.sort((firstProject, secondProject) => {
      if (sortBy === "name") {
        return firstProject.name.localeCompare(secondProject.name);
      }

      return secondProject.createdAtMs - firstProject.createdAtMs;
    });
  }, [projects, searchQuery, statusFilter, sortBy]);

  const handleOpenProject = (project: UserProject) => {
    navigate(getProjectOpenPath(project));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-2">Open Project</h1>
            <p className="text-sm text-muted-foreground">
              Select a project to view or continue working on
            </p>
          </div>
          <Link
            to="/newproject"
            className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            New Project
          </Link>
        </div>
      </div>

      <div className="px-8 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="processed">Processed</option>
            <option value="processing">Processing</option>
            <option value="not-started">Not Started</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Create your first project to get started"}
            </p>
            <Link
              to="/newproject"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
            >
              Create New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ProjectCard project={project} onOpen={() => handleOpenProject(project)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OpenProject;
