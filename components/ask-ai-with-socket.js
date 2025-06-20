import React from "react";
import { X } from "lucide-react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { WebSocketProvider } from "./WebSocketProvider";
import ScreenShare from "./ScreenShare";

const AskAIWithSocket = ({ isOpen, onClose, setupInput, useCaseId }) => {
  if (!isOpen) return null;

  return (
    <div className="w-full bg-gradient-to-r bg-white dark:bg-black/10 rounded-xl border dark:border-[#333] overflow-hidden shadow-lg">
      {/* Minimal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-[#333] flex-shrink-0">
        <div className="flex items-center gap-2">
          <AutoAwesomeIcon
            className="text-[#7F56D9]"
            style={{ fontSize: "16px" }}
          />
          <h3 className="text-sm font-medium dark:text-white text-black">
            Ask AI
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div style={{ minHeight: 600 }}>
        <WebSocketProvider
          url="ws://localhost:9084"
          setup={{
            system_prompt: "You are a helpful AI assistant.",
            enable_audio: true,
            voice_name: "Kore"
          }}
          useCaseId={useCaseId}
          tools={[]}
          toolMappings={{}}
        >
          <div className="p-4">
            <ScreenShare />
          </div>
        </WebSocketProvider>
      </div>
    </div>
  );
};

export default AskAIWithSocket;
