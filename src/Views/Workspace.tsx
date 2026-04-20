import { HashRouter as Router, Routes, Route, useLocation, useMatch } from "react-router-dom";

import Sidebar from "../Components/Layout/Sidebar";
import StatusBar from "../Components/Layout/StatusBar";
import Projects from "../Components/Layout/MainView/Projects";
import Dashboard from "../Components/Layout/MainView/Dashboard";
import { Viewer } from "../Components/Layout/MainView/Viewer";
import Setting from "../Components/Layout/MainView/Settings";
import NewProject  from "../Components/Layout/MainView/NewProject";
import OpenProject from "../Components/Layout/MainView/OpenProject";
import Processing from "../Components/Layout/MainView/Processing";

function WorkspaceShell() {
  const location = useLocation();
  const viewerProjectMatch = useMatch("/viewer/:projectId");
  const isViewerRoute = location.pathname === "/viewer" || Boolean(viewerProjectMatch);
  const viewerProjectId = viewerProjectMatch?.params.projectId;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Middle band: sidebar on the left and the active screen on the right. */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Keep Viewer mounted so model/camera state persists across navigation. */}
        <main className="relative flex-1 overflow-hidden bg-background">
          <div className={isViewerRoute ? "absolute inset-0 z-10" : "absolute inset-0 z-0 opacity-0 pointer-events-none"}>
            <Viewer projectIdOverride={viewerProjectId ?? null} />
          </div>

          <div className={isViewerRoute ? "hidden" : "h-full overflow-auto"}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/viewer" element={null} />
              <Route path="/viewer/:projectId" element={null} />
              <Route path="/settings" element={<Setting />} />
              <Route path="/newproject" element={<NewProject />} />
              <Route path="/openproject" element={<OpenProject />} />
              <Route path="/processing" element={<Processing />} />
              <Route path="/processing/:projectId" element={<Processing />} />
            </Routes>
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

function Layout() {
  return (
    <Router>
      <WorkspaceShell />
    </Router>
  );
}

export default Layout;