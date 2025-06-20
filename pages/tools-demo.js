import React, { useState, useRef } from "react";
import { useToolRegistry } from "../ai-tools/ask-ai";
import Carousel from "../components/ui/carousel";

export default function ToolsDemo() {
  const { getRegisteredTools, callTool } = useToolRegistry();
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const tools = getRegisteredTools();

  const handleCallCurrentTime = async () => {
    setLoading(true);
    try {
      const res = await callTool("currentTime", {});
      setResult(res);
    } catch (err) {
      setResult(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const carouselItems = [
    { image: "https://placekitten.com/300/200", text: "Cute Kitten 1" },
    { image: "https://placekitten.com/301/200", text: "Cute Kitten 2" },
    { text: "Just some text, no image!" },
    { image: "https://placekitten.com/302/200", text: "Cute Kitten 3" },
    { text: "Another text-only slide." },
  ];
  const carouselRef = useRef();

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Tools Demo</h1>
      <div style={{ margin: "1.5rem 0" }}>
        <h2 style={{ fontSize: 18 }}>Registered Tools:</h2>
        <ul>
          {tools.length === 0 && <li>No tools registered.</li>}
          {tools.map((tool) => (
            <li key={tool.name}>
              <b>{tool.name}</b>: {tool.definition.description}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ margin: "2rem 0" }}>
        <button
          onClick={handleCallCurrentTime}
          style={{ padding: "0.5rem 1.5rem", fontSize: 16, borderRadius: 4, background: "#2563eb", color: "white", border: "none", cursor: "pointer" }}
          disabled={loading}
        >
          {loading ? "Loading..." : "Get Current Time"}
        </button>
        {result && (
          <div style={{ marginTop: 16, fontSize: 18 }}>
            <b>Result:</b> {result}
          </div>
        )}
      </div>
      <div style={{ margin: "2rem 0" }}>
        <h2 style={{ fontSize: 18 }}>Carousel Demo:</h2>
        <Carousel ref={carouselRef} items={carouselItems} />
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={() => carouselRef.current?.goToPrev()} style={{ padding: "0.5rem 1rem" }}>Previous</button>
          <button onClick={() => carouselRef.current?.goToNext()} style={{ padding: "0.5rem 1rem" }}>Next</button>
        </div>
      </div>
    </div>
  );
} 