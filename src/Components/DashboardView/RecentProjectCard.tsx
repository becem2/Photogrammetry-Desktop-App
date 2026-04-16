import { Activity, Clock, Eye, ImageIcon, Play } from "lucide-react";
import { Link } from "react-router-dom";

type RecentProject = {
  id: string;
  name: string;
  status: "Processed" | "Processing" | "Not Started" | "Failed";
  progress: number;
  date: string;
  images: number;
};

// Compact dashboard card that links to the viewer or processing screen.
function RecentProjectCard({ project }: { project: RecentProject }) {
  const statusColors = {
    Processed: "text-primary",
    Processing: "text-yellow-500",
    "Not Started": "text-muted-foreground",
    Failed: "text-red-500",
  };

  const destinationPath = project.status === "Processing" ? `/processing/${project.id}` : `/viewer/${project.id}`;

  return (
    <Link to={destinationPath}>
      <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="w-48 h-32 bg-secondary relative overflow-hidden shrink-0">
            {project.progress < 100 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 py-4 pr-4 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  <span>{project.images} images</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{project.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`text-xs font-medium ${statusColors[project.status as keyof typeof statusColors]}`}
                >
                  {project.status}
                </div>
                {project.progress < 100 &&
                  project.progress > 0 && (
                    <div className="text-xs text-muted-foreground">
                      • {project.progress}% complete
                    </div>
                  )}
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-2">
              {project.status === "Processed" ? (
                <button className="w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg flex items-center justify-center transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
              ) : project.status === "Processing" ? (
                <button className="w-10 h-10 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg flex items-center justify-center transition-colors">
                  <Activity className="w-5 h-5" />
                </button>
              ) : (
                <button className="w-10 h-10 bg-secondary hover:bg-accent rounded-lg flex items-center justify-center transition-colors">
                  <Play className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default RecentProjectCard;