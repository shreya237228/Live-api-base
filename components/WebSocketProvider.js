import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { Base64 } from "js-base64";

const WebSocketContext = createContext(null);

const RECONNECT_TIMEOUT = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 30000; // 30 seconds

export const WebSocketProvider = ({
  children,
  url,
  setup = {},
  useCaseId = null,
  tools = [],
  toolMappings = {},
  startAutomatically = true,
}) => {
  console.log("WebSocketProvider mounted");
  const [isConnected, setIsConnected] = useState(false);
  const [playbackAudioLevel, setPlaybackAudioLevel] = useState(0);
  const [lastTranscription, setLastTranscription] = useState(null);
  const [lastTextMessage, setLastTextMessage] = useState(null);
  const [lastAudioData, setLastAudioData] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef();
  const connectionTimeoutRef = useRef();
  const audioContextRef = useRef(null);
  const audioBufferQueueRef = useRef([]);
  const currentAudioSourceRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Flag to track intentional disconnections
  const isIntentionalDisconnect = useRef(false);
  const localUseCaseId =
    useCaseId || `use-case-${Math.random().toString(36).substring(2, 15)}`;

  // Function to handle client-side interruption (stopping audio playback and clearing buffers)
  const onClientInterrupt = useCallback(() => {
    console.log(
      "Client interruption - stopping audio playback and clearing buffers"
    );

    // Stop current audio playback
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }

    // Clear audio buffer queue
    audioBufferQueueRef.current = [];

    // Reset playback audio level
    setPlaybackAudioLevel(0);
  }, []);

  // Function to properly disconnect and clean up all resources
  const disconnect = useCallback(() => {
    console.log("Disconnecting WebSocket and cleaning up all resources");

    // Set flag to indicate this is an intentional disconnect
    isIntentionalDisconnect.current = true;

    // First, interrupt any ongoing audio playback
    onClientInterrupt();

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Close audio context if it exists
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((error) => {
        console.warn("Error closing audio context:", error);
      });
      audioContextRef.current = null;
    }

    // Reset all state
    setIsConnected(false);
    setPlaybackAudioLevel(0);
    setLastTranscription(null);
    setLastTextMessage(null);
    setLastAudioData(null);

    // Reset reconnection attempts
    reconnectAttemptsRef.current = 0;

    console.log("WebSocket disconnected and resources cleaned up");
  }, [onClientInterrupt]);

  // Initialize audio context for playback
  const initAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
          latencyHint: 'interactive'
        });
      }
      if (audioContextRef.current.state === 'suspended') {
        void audioContextRef.current.resume();
      }
      return audioContextRef.current;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw error;
    }
  }, []);

  const connect = () => {
    // Reset the intentional disconnect flag when connecting
    isIntentionalDisconnect.current = false;

    // Don't reconnect if already connecting or connected
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.CONNECTING ||
        wsRef.current.readyState === WebSocket.OPEN)
    ) {
      console.log(
        "WebSocket already connecting or connected, skipping reconnect"
      );
      return;
    }

    // Close existing connection if it's in a bad state
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      console.log("WebSocket created:", url);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reconnect();
        }
      }, CONNECTION_TIMEOUT);

      ws.binaryType = "arraybuffer"; // Enable binary message support

      ws.onopen = () => {
        setIsConnected(true);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // Initialize audio context when connection is established
        try {
          initAudioContext();
        } catch (error) {
          console.warn("Audio context initialization failed:", error);
        }

        // Send initial setup message with provided configuration
        console.log("WebSocket connected, sending initial setup", setup);
        sendMessage({
          setup: setup,
          use_case_id: localUseCaseId,
          tools: tools,
        });

        if (startAutomatically) {
          sendMessage({
            text: "Hey there!",
          });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);

        // Only reconnect if this wasn't an intentional disconnect
        if (!isIntentionalDisconnect.current) {
          console.log("WebSocket closed unexpectedly, attempting to reconnect");
          reconnect();
        } else {
          console.log("WebSocket closed intentionally, not reconnecting");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);

          if (data.text) {
            setLastTextMessage(data.text);
          }

          if (data.audio) {
            console.log("Received audio data");
            try {
              const audioContext = initAudioContext();
              console.log("Audio context initialized:", audioContext.state);

              // Decode base64 audio data
              const audioData = Base64.toUint8Array(data.audio);
              console.log("Decoded audio data length:", audioData.length);

              // Create audio buffer from raw data
              const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);
              console.log("Created audio buffer:", audioBuffer.duration, "seconds");

              // Create and configure source node
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;

              // Create and configure gain node for volume control
              const gainNode = audioContext.createGain();
              gainNode.gain.value = 1.0; // Increase volume

              // Connect nodes
              source.connect(gainNode);
              gainNode.connect(audioContext.destination);

              // Store the current source
              if (currentAudioSourceRef.current) {
                currentAudioSourceRef.current.stop();
              }
              currentAudioSourceRef.current = source;

              // Play the audio
              source.start(0);
              console.log("Started audio playback");

              // Update state
              setLastAudioData(data.audio);
            } catch (error) {
              console.error("Error playing audio:", error);
              console.error(error.stack);
            }
          }

          if (data.transcription) {
            setLastTranscription(data.transcription);
          }

          // Handle tool responses
          if (data.tool_response) {
            handleToolCalls(data.tool_response);
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      reconnect();
    }
  };

  const handleToolCalls = async (toolCallRequests) => {
    try {
      let toolPromises = [];
      let idx_to_params = {};
      let idx = 0;

      for (const toolCallRequest of toolCallRequests) {
        const toolName = toolCallRequest.name;
        const toolArgs = toolCallRequest.args;

        if (toolMappings[toolName]) {
          const toolPromise = toolMappings[toolName](toolArgs);
          idx_to_params[idx] = toolCallRequest;
          idx++;
          toolPromises.push(toolPromise);
        } else {
          console.warn(`Tool ${toolName} not found in toolMappings`);
        }
      }

      const toolResults = await Promise.all(toolPromises);
      let toolResponses = [];

      for (let i = 0; i < toolResults.length; i++) {
        const toolResult = toolResults[i];
        const toolParams = idx_to_params[i];
        const toolId = toolParams.id;
        toolResponses.push({
          id: toolId,
          name: toolParams.name,
          result: toolResult,
        });
      }

      sendMessage({
        tool_responses: toolResponses,
      });
    } catch (error) {
      console.error("Error handling tool calls:", error);
    }
  };

  // Simplified audio playback
  const playAudioChunk = useCallback(
    (audioBuffers) => {
      return new Promise((resolve, reject) => {
        try {
          const ctx = initAudioContext();
          if (ctx.state === 'suspended') {
            void ctx.resume();
          }
          console.log("Playing audio");

          const totalLength = audioBuffers.reduce(
            (acc, buffer) => acc + new Int16Array(buffer).length,
            0
          );

          console.log("Total audio length:", totalLength);

          if (totalLength === 0) {
            console.warn("Empty audio buffer received");
            return resolve();
          }

          const combinedInt16Array = new Int16Array(totalLength);
          let offset = 0;

          audioBuffers.forEach((buffer) => {
            const int16Data = new Int16Array(buffer);
            combinedInt16Array.set(int16Data, offset);
            offset += int16Data.length;
          });

          const audioBuffer = ctx.createBuffer(1, totalLength, 24000);
          const channelData = audioBuffer.getChannelData(0);

          for (let i = 0; i < totalLength; i++) {
            channelData[i] = combinedInt16Array[i] / 32768.0;
          }

          const source = ctx.createBufferSource();
          currentAudioSourceRef.current = source;
          const gainNode = ctx.createGain();
          gainNode.gain.value = 2.0; // Increased volume

          source.buffer = audioBuffer;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);

          const durationMs =
            (audioBuffer.length / audioBuffer.sampleRate) * 1000;

          console.log("Starting audio playback, duration:", durationMs, "ms");
          source.start();

          // Simple audio level simulation
          const simulateLevel = () => {
            const randomLevel = 20 + Math.floor(Math.random() * 20);
            setPlaybackAudioLevel(randomLevel);
          };

          const levelInterval = setInterval(simulateLevel, 200);

          setTimeout(() => {
            clearInterval(levelInterval);
            setPlaybackAudioLevel(0);
            currentAudioSourceRef.current = null;
            resolve();
          }, durationMs);

          source.onended = () => {
            clearInterval(levelInterval);
            setPlaybackAudioLevel(0);
            currentAudioSourceRef.current = null;
            resolve();
          };
        } catch (error) {
          console.error("Error playing audio:", error);
          reject(error);
        }
      });
    },
    [initAudioContext]
  );

  // Audio playback management
  useEffect(() => {
    let isPlaybackActive = false;

    const playNextWhenReady = async () => {
      if (isPlaybackActive || audioBufferQueueRef.current.length === 0) {
        return;
      }

      isPlaybackActive = true;

      try {
        const allChunks = [...audioBufferQueueRef.current];
        audioBufferQueueRef.current = [];

        const allBuffers = [];
        allChunks.forEach((chunk) => {
          allBuffers.push(...chunk.data);
        });

        await playAudioChunk(allBuffers);

        if (audioBufferQueueRef.current.length > 0) {
          void playNextWhenReady();
        }
      } catch (error) {
        console.error("Error in audio playback:", error);
      } finally {
        isPlaybackActive = false;
      }
    };

    const checkInterval = setInterval(() => {
      if (audioBufferQueueRef.current.length > 0 && !isPlaybackActive) {
        void playNextWhenReady();
      }
    }, 50);

    return () => {
      clearInterval(checkInterval);
    };
  }, [playAudioChunk]);

  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const backoffTime = Math.min(
      30000,
      RECONNECT_TIMEOUT * (reconnectAttemptsRef.current || 1)
    );
    console.log(`Scheduling reconnect in ${backoffTime}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current = (reconnectAttemptsRef.current || 0) + 1;
      connect();
    }, backoffTime);
  };

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [url]);

  useEffect(() => {
    if (isConnected) {
      reconnectAttemptsRef.current = 0;
    }
  }, [isConnected]);

  const sendMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const sendMediaChunk = (chunk) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          realtime_input: {
            media_chunks: [chunk],
          },
        })
      );
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        sendMediaChunk,
        lastTranscription,
        lastTextMessage,
        lastAudioData,
        isConnected,
        playbackAudioLevel,
        onClientInterrupt,
        disconnect,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (setupInput) => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};