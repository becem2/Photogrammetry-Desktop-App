import { Link } from "react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Copy, Download, Eye, FileText, Share2, Trash2, MoreVertical } from "lucide-react";
import { type UserProject } from "../../../../hooks/useUserProjects";

// Context menu for project-level actions.
const getProjectOpenPath = (project: UserProject) =>
  project.status === "Processed" ? `/viewer/${project.id}` : `/processing/${project.id}`;

function ProjectMenu({
  project,
  onRequestDelete,
}: {
  project: UserProject;
  onRequestDelete: (project: UserProject) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="w-8 h-8 hover:bg-accent rounded-lg flex items-center justify-center transition-colors outline-none">
        <MoreVertical className="w-4 h-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="min-w-50 bg-card border border-border rounded-xl shadow-2xl p-2 z-50" sideOffset={5}>
          <DropdownMenu.Item asChild>
            <Link
              to={getProjectOpenPath(project)}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-accent outline-none rounded-lg flex items-center gap-3 font-medium"
            >
              <Eye className="w-4 h-4 text-primary" />
              {project.status === "Processed" ? "Open in Viewer" : "Open Processing"}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="px-4 py-2.5 text-sm cursor-pointer hover:bg-accent outline-none rounded-lg flex items-center gap-3">
            <Copy className="w-4 h-4" />
            Duplicate
          </DropdownMenu.Item>
          <DropdownMenu.Item className="px-4 py-2.5 text-sm cursor-pointer hover:bg-accent outline-none rounded-lg flex items-center gap-3">
            <Share2 className="w-4 h-4" />
            Share
          </DropdownMenu.Item>
          <DropdownMenu.Item className="px-4 py-2.5 text-sm cursor-pointer hover:bg-accent outline-none rounded-lg flex items-center gap-3">
            <FileText className="w-4 h-4" />
            Export Report
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="h-px bg-border my-2" />
          <DropdownMenu.Item className="px-4 py-2.5 text-sm cursor-pointer hover:bg-accent outline-none rounded-lg flex items-center gap-3">
            <Download className="w-4 h-4" />
            Download
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="h-px bg-border my-2" />
          <DropdownMenu.Item
            onSelect={(event) => {
              event.preventDefault();
              onRequestDelete(project);
            }}
            className="px-4 py-2.5 text-sm cursor-pointer hover:bg-red-500/10 outline-none rounded-lg flex items-center gap-3 text-red-500 font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default ProjectMenu;