"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useWebSocket } from "./WebSocketProvider";
import { Base64 } from "js-base64";
import { Send, Play, Square } from "lucide-react";
import Carousel from "./ui/carousel";

const ScreenShare = () => {
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const chatScrollRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([
    {
      text: "Welcome! Click 'Start Conversation' to begin an audio conversation with AI.",
      sender: "AI",
      timestamp: "",
      isComplete: true,
    },
  ]);
  const {
    sendMessage,
    sendMediaChunk,
    isConnected,
    playbackAudioLevel,
    lastTranscription,
    lastTextMessage,
    onClientInterrupt,
    disconnect,
  } = useWebSocket();

  const carouselItems = [
    { image: "https://placekitten.com/300/200", text: "Cute Kitten 1" },
    { image: "https://placekitten.com/301/200", text: "Cute Kitten 2" },
    { text: "Just some text, no image!" },
    { image: "https://placekitten.com/302/200", text: "Cute Kitten 3" },
    { text: "Another text-only slide." },
  ];
  const carouselRef = useRef();

  // Button Control State
  const [buttonStates, setButtonStates] = useState({
    "Light 1": false,
    "Light 2": false,
    "Fan": false,
  });

  // Word Cloud State
  const [wordCloudImg, setWordCloudImg] = useState(null);

  // Chart States
  const [barChartImg, setBarChartImg] = useState(null);
  const [lineChartImg, setLineChartImg] = useState(null);
  const [pieChartImg, setPieChartImg] = useState(null);

  // Helper function to generate consistent timestamps
  const generateTimestamp = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Set initial timestamp on client side only to avoid hydration mismatch
  useEffect(() => {
    setMessages((prev) =>
      prev.map((msg, index) =>
        index === 0 && msg.timestamp === ""
          ? { ...msg, timestamp: generateTimestamp() }
          : msg
      )
    );
  }, []);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      const scrollElement =
        chatScrollRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) || chatScrollRef.current;
      setTimeout(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle incoming transcriptions
  useEffect(() => {
    if (lastTranscription) {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        const shouldUpdateLast =
          lastMessage &&
          lastMessage.sender === lastTranscription.sender &&
          !lastMessage.isComplete;

        if (shouldUpdateLast) {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            text: lastMessage.text + lastTranscription.text,
            isComplete: lastTranscription.finished === true,
          };
          return updatedMessages;
        }

        const newMessage = {
          text: lastTranscription.text,
          sender: lastTranscription.sender,
          timestamp: generateTimestamp(),
          isComplete: lastTranscription.finished === true,
        };
        return [...prev, newMessage];
      });
    }
  }, [lastTranscription]);

  // Handle incoming text messages (tool responses or Gemini text)
  useEffect(() => {
    console.log("lastTextMessage (ScreenShare):", lastTextMessage);
    if (lastTextMessage && lastTextMessage.trim() !== "") {
      setMessages((prev) => [
        ...prev,
        {
          text: lastTextMessage,
          sender: lastTextMessage.includes("The current time is") ? "Tool" : "Gemini",
          timestamp: generateTimestamp(),
          isComplete: true,
        },
      ]);
    }
  }, [lastTextMessage]);

  useEffect(() => {
    if (isConnected) {
      // Auto-start conversation when connected
      startConversation();
    }

    return () => {
      endConversation();
    };
  }, [isConnected]);

  const startConversation = async () => {
    if (isSharing) return;

    try {
      // Get audio stream
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      // Set up audio context and processing
      audioContextRef.current = new AudioContext({
        sampleRate: 16000,
        latencyHint: "interactive",
      });

      const ctx = audioContextRef.current;
      await ctx.audioWorklet.addModule("/worklets/audio-processor.js");

      const source = ctx.createMediaStreamSource(audioStream);
      audioWorkletNodeRef.current = new AudioWorkletNode(
        ctx,
        "audio-processor",
        {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          processorOptions: {
            sampleRate: 16000,
            bufferSize: 4096,
          },
          channelCount: 1,
          channelCountMode: "explicit",
          channelInterpretation: "speakers",
        }
      );

      // Set up audio processing
      audioWorkletNodeRef.current.port.onmessage = (event) => {
        const { pcmData, level } = event.data;
        setAudioLevel(level);

        if (pcmData) {
          const base64Data = Base64.fromUint8Array(new Uint8Array(pcmData));
          sendMediaChunk({
            mime_type: "audio/pcm",
            data: base64Data,
          });
        }
      };

      source.connect(audioWorkletNodeRef.current);
      audioStreamRef.current = audioStream;

      setIsSharing(true);
    } catch (err) {
      console.error("Error starting conversation:", err);
      alert(
        "Microphone access denied. Please allow microphone access and try again."
      );
    }
  };

  const endConversation = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop audio playback
    if (onClientInterrupt) {
      onClientInterrupt();
    }

    // Send end conversation message
    sendMessage({
      end_conversation: true,
    });

    setIsSharing(false);
    setAudioLevel(0);
  };

  const fullDisconnect = () => {
    endConversation();
    if (disconnect) {
      disconnect();
    }
  };

  const handleSendMessage = () => {
    if (inputText.trim() && isConnected) {
      sendMessage({ text: inputText });
      setInputText("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Listen for carousel navigation commands from WebSocket
  useEffect(() => {
    const wsHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.carousel === "next") {
          carouselRef.current?.goToNext();
        } else if (data.carousel === "prev") {
          carouselRef.current?.goToPrev();
        }
      } catch {}
    };
    if (window && window.WebSocket && window.ws) {
      window.ws.addEventListener("message", wsHandler);
    }
    return () => {
      if (window && window.WebSocket && window.ws) {
        window.ws.removeEventListener("message", wsHandler);
      }
    };
  }, []);

  // Handle WebSocket button control and word cloud messages
  useEffect(() => {
    const wsHandler = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.button && data.button.name && data.button.state) {
          setButtonStates((prev) => ({
            ...prev,
            [data.button.name]: data.button.state === "on",
          }));
        }
        if (data.wordcloud) {
          setWordCloudImg("data:image/png;base64," + data.wordcloud);
        }
        if (data.barchart) {
          setBarChartImg("data:image/png;base64," + data.barchart);
        }
        if (data.linechart) {
          setLineChartImg("data:image/png;base64," + data.linechart);
        }
        if (data.piechart) {
          setPieChartImg("data:image/png;base64," + data.piechart);
        }
        // Carousel handler (keep existing)
        if (data.carousel === "next") {
          carouselRef.current?.goToNext();
        } else if (data.carousel === "prev") {
          carouselRef.current?.goToPrev();
        }
      } catch {}
    };
    if (window && window.WebSocket && window.ws) {
      window.ws.addEventListener("message", wsHandler);
    }
    return () => {
      if (window && window.WebSocket && window.ws) {
        window.ws.removeEventListener("message", wsHandler);
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 mb-4 min-h-0">
        <ScrollArea className="h-full" ref={chatScrollRef}>
          <div className="space-y-4 p-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === "You" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === "You"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                  } ${!message.isComplete ? "opacity-70" : ""}`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.sender} • {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Demo Sections */}
      <div className="space-y-6 my-4">
        {/* Carousel */}
        <Card>
          <CardHeader>
            <CardTitle>Carousel Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <Carousel ref={carouselRef} items={carouselItems} />
          </CardContent>
        </Card>

        {/* Button Control */}
        <Card>
          <CardHeader>
            <CardTitle>Button Control Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center flex-wrap">
              {Object.entries(buttonStates).map(([name, state]) => (
                <Button
                  key={name}
                  variant={state ? "default" : "outline"}
                  className={state ? "bg-green-500 text-white" : "bg-gray-200 dark:bg-gray-700"}
                  disabled
                >
                  {name}: {state ? "ON" : "OFF"}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Word Cloud */}
        <Card>
          <CardHeader>
            <CardTitle>Word Cloud Demo</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {wordCloudImg ? (
              <img
                src={wordCloudImg}
                alt="Word Cloud"
                className="border rounded shadow max-w-full"
                style={{ maxHeight: 200 }}
              />
            ) : (
              <div className="text-gray-500">No word cloud generated yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <Card>
          <CardHeader>
            <CardTitle>Chart Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="font-semibold mb-2">Bar Chart</p>
                {barChartImg ? (
                  <img
                    src={barChartImg}
                    alt="Bar Chart"
                    className="mx-auto border rounded shadow max-w-full"
                    style={{ maxHeight: 200 }}
                  />
                ) : (
                  <p className="text-gray-500 text-sm">No bar chart yet.</p>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold mb-2">Line Chart</p>
                {lineChartImg ? (
                  <img
                    src={lineChartImg}
                    alt="Line Chart"
                    className="mx-auto border rounded shadow max-w-full"
                    style={{ maxHeight: 200 }}
                  />
                ) : (
                  <p className="text-gray-500 text-sm">No line chart yet.</p>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold mb-2">Pie Chart</p>
                {pieChartImg ? (
                  <img
                    src={pieChartImg}
                    alt="Pie Chart"
                    className="mx-auto border rounded shadow max-w-full"
                    style={{ maxHeight: 200 }}
                  />
                ) : (
                  <p className="text-gray-500 text-sm">No pie chart yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audio Controls */}
      <Card className="my-4">
        <CardContent>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <Button
              onClick={isSharing ? endConversation : startConversation}
              disabled={!isConnected}
              variant={isSharing ? "destructive" : "default"}
              className="flex items-center gap-2 text-xs"
            >
              {isSharing ? (
                <>
                  <Square size={14} />
                  Stop
                </>
              ) : (
                <>
                  <Play size={14} />
                  Start
                </>
              )}
            </Button>

            {isSharing && (
              <Button
                onClick={fullDisconnect}
                variant="destructive"
                className="flex items-center gap-2 text-xs"
              >
                <Square size={14} />
                End Conversation
              </Button>
            )}

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-xs">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Audio Level Indicators */}
            <div className="flex items-center gap-2">
              <span className="text-xs">Mic:</span>
              <div className="w-16 h-1 bg-gray-200 rounded">
                <div
                  className="h-full bg-green-500 rounded transition-all duration-300"
                  style={{ width: `${Math.min(100, audioLevel)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">Speaker:</span>
              <div className="w-16 h-1 bg-gray-200 rounded">
                <div
                  className="h-full bg-blue-500 rounded transition-all duration-300"
                  style={{ width: `${Math.min(100, playbackAudioLevel)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Text Input */}
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!isConnected || !inputText.trim()}
              className="px-4"
            >
              <Send size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScreenShare;
