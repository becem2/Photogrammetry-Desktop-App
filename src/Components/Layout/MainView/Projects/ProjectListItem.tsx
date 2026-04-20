import { Link } from "react-router";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, Clock, Image as ImageIcon, MapPin, Play, TrendingUp } from "lucide-react";
import { type UserProject } from "../../../../hooks/useUserProjects";
import ProjectMenu from "./ProjectMenu";

// List-row variant used when the Projects page switches to compact mode.
const getProjectOpenPath = (project: UserProject) =>
  project.status === "Processed" ? `/viewer/${project.id}` : `/processing/${project.id}`;

function ProjectListItem({
  project,
  onRequestDelete,
}: {
  project: UserProject;
  onRequestDelete: (project: UserProject) => void;
}) {
  const statusConfig = {
    Processed: { bg: "bg-primary/10", text: "text-primary", icon: TrendingUp },
    Processing: { bg: "bg-yellow-500/10", text: "text-yellow-500", icon: Clock },
    "Not Started": { bg: "bg-muted", text: "text-muted-foreground", icon: Play },
    Failed: { bg: "bg-red-500/10", text: "text-red-500", icon: AlertCircle },
  };

  const config = statusConfig[project.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  return (
    <Link to={getProjectOpenPath(project)}>
      <motion.div
        whileHover={{ x: 4 }}
        className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-32 h-20 bg-secondary rounded-lg overflow-hidden shrink-0 relative">
            {project.iconUrl && (
              <img
                src={project.iconUrl}
                alt={`${project.name} icon`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {!project.iconUrl && (
              <div className="absolute inset-0 bg-linear-to-br from-secondary via-accent to-secondary flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-5 h-5" />
              </div>
            )}
            {project.progress > 0 && project.progress < 100 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-2">
              <h3 className="font-semibold text-base flex-1 truncate group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <div className={`px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium ${config.bg} ${config.text}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {project.status}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{project.locationLabel}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>{project.imageCount} images</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{project.dateLabel}</span>
              </div>
              <div className="text-muted-foreground">{project.sizeLabel}</div>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(event) => event.preventDefault()}>
            <ProjectMenu project={project} onRequestDelete={onRequestDelete} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default ProjectListItem;