import { Link } from "react-router";
import { motion } from "framer-motion";
import { AlertCircle, Clock, Eye, Image as ImageIcon, MapPin, Play, TrendingUp } from "lucide-react";
import { type UserProject } from "../../../../hooks/useUserProjects";
import ProjectMenu from "./ProjectMenu";

// Card view used in the Projects gallery grid.
const getProjectOpenPath = (project: UserProject) =>
  project.status === "Processed" ? `/viewer/${project.id}` : `/processing/${project.id}`;

function ProjectCard({
  project,
  onRequestDelete,
}: {
  project: UserProject;
  onRequestDelete: (project: UserProject) => void;
}) {
  const statusConfig = {
    Processed: { bg: "bg-primary", text: "text-white", icon: TrendingUp },
    Processing: { bg: "bg-yellow-500", text: "text-white", icon: Clock },
    "Not Started": { bg: "bg-muted", text: "text-muted-foreground", icon: Play },
    Failed: { bg: "bg-red-500", text: "text-white", icon: AlertCircle },
  };

  const config = statusConfig[project.status as keyof typeof statusConfig];
  const StatusIcon = config.icon;

  return (
    <motion.div
      className="bg-card border-2 border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-2xl transition-all group"
    >
      <div className="aspect-video bg-secondary relative overflow-hidden">
        {project.iconUrl && (
          <img
            src={project.iconUrl}
            alt={`${project.name} icon`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!project.iconUrl && (
          <div className="absolute inset-0 bg-linear-to-br from-secondary via-accent to-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">Preparing preview...</span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md ${config.bg} ${config.text}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {project.status}
        </div>

        <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs text-white font-medium">
          {project.typeLabel}
        </div>

        {project.progress > 0 && project.progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              className="h-full bg-primary"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <Link to={getProjectOpenPath(project)}>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 bg-primary hover:bg-primary/90 rounded-xl flex items-center justify-center transition-colors shadow-2xl"
            >
              <Eye className="w-6 h-6 text-white" />
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-base line-clamp-1 flex-1 group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <ProjectMenu project={project} onRequestDelete={onRequestDelete} />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className="truncate">{project.locationLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary opacity-0" />
            <span>{project.dateLabel}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{project.imageCount}</span>
            <span className="text-xs text-muted-foreground">images</span>
          </div>
          <div className="text-sm font-medium text-muted-foreground">{project.sizeLabel}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default ProjectCard;