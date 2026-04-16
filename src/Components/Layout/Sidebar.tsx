import { Link, useLocation } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Home, FolderOpen, Eye, Settings as SettingsIcon, type LucideIcon } from "lucide-react";

// Route metadata used to render the compact icon sidebar.
interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

function Sidebar() {
  // Highlight the active route and show tooltips for each destination.
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/projects", label: "Projects", icon: FolderOpen },
    { path: "/viewer", label: "Viewer", icon: Eye },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Tooltip.Root key={item.path}>
              <Tooltip.Trigger asChild>
                <Link
                  to={item.path}
                  className={`
                    w-12 h-12 rounded-lg flex items-center justify-center transition-all
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={6}
                  className="bg-card text-card-foreground px-3 py-1 rounded-md text-sm shadow-lg border border-border z-50"
                >
                  {item.label}
                  <Tooltip.Arrow className="fill-card" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </aside>
    </Tooltip.Provider>
  );
}

export default Sidebar;