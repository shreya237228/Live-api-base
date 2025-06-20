import { useState, useEffect } from "react";
import AskAIWithSocket from "../components/ask-ai-with-socket";
import { useToolRegistry } from "../ai-tools/ask-ai";

export default function Home() {
  console.log("Home page rendered");
  const [isAskAIOpen, setIsAskAIOpen] = useState(true); // Start with chat open
  const { clearAllTools } = useToolRegistry();

  // Cleanup all tools on unmount
  useEffect(() => {
    return () => {
      console.log("[Home] Cleaning up all registered tools");
      clearAllTools();
    };
  }, [clearAllTools]);

  return (
    <div className="min-h-screen bg-[#F3EFE0] dark:bg-black text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Assignment Live API Demo
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              A simplified WebSocket chat interface with real-time voice and
              text communication.
            </p>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left Side - Key Highlights */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-6">✨ Key Features</h2>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 dark:text-green-400 text-sm">
                        🎤
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Real-time Voice Chat</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        High-quality voice conversation with live audio
                        streaming and transcription
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 text-sm">
                        💬
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Text Messaging</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Send and receive text messages with real-time responses
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 dark:text-purple-400 text-sm">
                        🔄
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">WebSocket Connection</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Live connection with automatic reconnection and status
                        indicators
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 dark:text-orange-400 text-sm">
                        📊
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Audio Visualization</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Visual feedback for microphone input and speaker output
                        levels
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">🚀 How to Use</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <li>
                    Allow microphone access when prompted for voice conversation
                  </li>
                  <li>Click "Start Conversation" to begin voice chat</li>
                  <li>Or type messages directly in the text input</li>
                  <li>Watch the audio level indicators for activity</li>
                  <li>Use "End Conversation" to stop voice chat</li>
                </ol>
              </div>

              {/* Technical Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">
                  🔧 Technical Stack
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    • Next.js
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    • React
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    • WebSocket
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    • Web Audio API
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    • Tailwind CSS
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    • Real-time Audio
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - AI Chat */}
            <div className="lg:sticky lg:top-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <AskAIWithSocket
                  isOpen={isAskAIOpen}
                  onClose={() => setIsAskAIOpen(false)}
                  setupInput="You are a market research expert."
                  useCaseId="assignment-demo"
                />
              </div>

              {!isAskAIOpen && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setIsAskAIOpen(true)}
                    className="button-primary"
                  >
                    Restart Chat with AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
