import { Calendar, FolderOpen, MoreVertical, Trash2, CheckCircle, Loader2, AlertCircle, Play, MapPin, Image as ImageIcon } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { type UserProject } from "../../../../hooks/useUserProjects";

interface ProjectCardProps {
  project: UserProject;
  onOpen: () => void;
}

// Compact picker card used in the Open Project screen.
function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const getStatusIcon = (status: UserProject["status"]) => {
    switch (status) {
      case "Processed":
        return <CheckCircle className="w-4 h-4" />;
      case "Processing":
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case "Failed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Play className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: UserProject["status"]) => {
    switch (status) {
      case "Processed":
        return "bg-primary text-white";
      case "Processing":
        return "bg-yellow-500 text-white";
      case "Failed":
        return "bg-red-500 text-white";
      default:
        return "bg-secondary text-foreground";
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all group">
      <div className="aspect-video bg-secondary relative overflow-hidden cursor-pointer" onClick={onOpen}>
        {project.iconUrl && (
          <img
            src={project.iconUrl}
            alt={`${project.name} icon`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!project.iconUrl && (
          <div className="absolute inset-0 bg-linear-to-br from-secondary via-accent to-secondary flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-7 h-7" />
          </div>
        )}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium ${getStatusColor(
            project.status
          )}`}
        >
          {getStatusIcon(project.status)}
          {project.status}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-medium cursor-pointer hover:text-primary transition-colors flex-1" onClick={onOpen}>
            {project.name}
          </h3>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-45 bg-card border border-border rounded-lg shadow-lg p-1 z-50" sideOffset={5}>
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    onOpen();
                  }}
                  className="px-3 py-2 text-sm rounded hover:bg-accent cursor-pointer outline-none"
                >
                  <FolderOpen className="w-4 h-4 inline-block mr-2" />
                  Open Project
                </DropdownMenu.Item>
                <DropdownMenu.Item className="px-3 py-2 text-sm rounded hover:bg-accent cursor-pointer outline-none">
                  Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Item className="px-3 py-2 text-sm rounded hover:bg-accent cursor-pointer outline-none">
                  Export
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item className="px-3 py-2 text-sm rounded hover:bg-red-500/10 text-red-500 cursor-pointer outline-none">
                  <Trash2 className="w-4 h-4 inline-block mr-2" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{project.locationLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{project.dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{project.imageCount} images • {project.sizeLabel}</span>
          </div>
        </div>

        <button onClick={onOpen} className="w-full mt-4 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm transition-colors">
          Open Project
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;