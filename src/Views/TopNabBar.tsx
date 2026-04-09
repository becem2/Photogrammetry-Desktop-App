import { Box, Minus, X } from "lucide-react";

declare global {
  interface Window {
    windowControl?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

function TopNavBar() {
  const handleMinimize = () => {
    window.windowControl?.minimize();
  };

  const handleMaximize = () => {
    window.windowControl?.maximize();
  };

  const handleClose = () => {
    window.windowControl?.close();
  };

  return (
    <div className="w-full bg-[#0F1419] flex justify-end p-0 drag">
      <div className="text-white  flex gap-0 no-drag">
        <button
          onClick={handleMinimize}
          className="hover:bg-slate-700  px-4 py-3 transition-colors flex items-center justify-center"
          title="Minimize"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={handleMaximize}
          className="hover:bg-slate-700 px-4 py-3 transition-colors flex items-center justify-center"
          title="Maximize"
        >
          <Box size={16} />
        </button>

        <button
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