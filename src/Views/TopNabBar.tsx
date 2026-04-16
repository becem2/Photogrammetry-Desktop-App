import { Box, Minus, X } from "lucide-react";

interface TopNavBarProps {
  isProfileCompletionRequired?: boolean;
}

function TopNavBar({ isProfileCompletionRequired = false }: TopNavBarProps) {
  const handleMinimize = () => {
    // Forward window control to Electron.
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximize();
  };

  const handleClose = () => {
    if (isProfileCompletionRequired) {
      // Prevent closing while the profile-completion flow is still required.
      window.alert("Please complete and save your profile information before closing the app.");
      return;
    }

    window.electronAPI?.close();
  };

  return (
    <div className="w-full bg-[#0F1419] flex justify-end p-0 drag">
      <div className="text-white  flex gap-0 no-drag">
        <button
          type="button"
          onClick={handleMinimize}
          className="hover:bg-slate-700  px-4 py-3 transition-colors flex items-center justify-center"
          title="Minimize"
        >
          <Minus size={16} />
        </button>

        <button
          type="button"
          onClick={handleMaximize}
          className="hover:bg-slate-700 px-4 py-3 transition-colors flex items-center justify-center"
          title="Maximize"
        >
          <Box size={16} />
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="hover:bg-red-600 px-4 py-3 transition-colors flex items-center justify-center"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default TopNavBar;