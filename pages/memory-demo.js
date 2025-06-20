import React, { useState, useRef } from "react";

const WS_URL = "ws://localhost:9084";

export default function MemoryDemo() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState([]);
  const [prefKey, setPrefKey] = useState("");
  const [prefValue, setPrefValue] = useState("");
  const [getPrefKey, setGetPrefKey] = useState("");
  const logRef = useRef(null);

  React.useEffect(() => {
    const socket = new window.WebSocket(WS_URL);
    setWs(socket);
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = (e) => setLog((l) => [...l, { type: "error", data: String(e) }]);
    socket.onmessage = (event) => {
      setLog((l) => [...l, { type: "response", data: event.data }]);
    };
    return () => {
      socket.close();
    };
  }, []);

  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const send = (msg) => {
    if (ws && connected) {
      ws.send(JSON.stringify(msg));
      setLog((l) => [...l, { type: "sent", data: JSON.stringify(msg) }]);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Memory Management Demo</h1>
      <div style={{ margin: "1.5rem 0" }}>
        <button onClick={() => send({ memory: "enable" })} style={{ marginRight: 8 }}>Enable Memory</button>
        <button onClick={() => send({ memory: "disable" })} style={{ marginRight: 8 }}>Disable Memory</button>
        <button onClick={() => send({ memory: "clear" })} style={{ marginRight: 8 }}>Clear Memory</button>
        <button onClick={() => send({ memory: "status" })}>Status</button>
      </div>
      <div style={{ margin: "1.5rem 0" }}>
        <input
          type="text"
          placeholder="Preference Key"
          value={prefKey}
          onChange={(e) => setPrefKey(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          type="text"
          placeholder="Preference Value"
          value={prefValue}
          onChange={(e) => setPrefValue(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={() => {
          if (prefKey && prefValue) {
            send({ memory: "set_preference", key: prefKey, value: prefValue });
          }
        }}>Set Preference</button>
      </div>
      <div style={{ margin: "1.5rem 0" }}>
        <input
          type="text"
          placeholder="Preference Key"
          value={getPrefKey}
          onChange={(e) => setGetPrefKey(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={() => {
          if (getPrefKey) {
            send({ memory: "get_preference", key: getPrefKey });
          }
        }}>Get Preference</button>
      </div>
      <div style={{ margin: "2rem 0", maxHeight: 300, overflowY: "auto", background: "#f9f9f9", borderRadius: 4, padding: 12 }} ref={logRef}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Log</h2>
        {log.length === 0 && <div style={{ color: '#888' }}>No messages yet.</div>}
        {log.map((entry, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: entry.type === "sent" ? "#2563eb" : entry.type === "error" ? "#dc2626" : "#059669" }}>
              {entry.type === "sent" ? "Sent:" : entry.type === "error" ? "Error:" : "Response:"}
            </span>
            <span style={{ marginLeft: 8, fontFamily: "monospace", wordBreak: "break-all" }}>{entry.data}</span>
          </div>
        ))}
      </div>
      <div style={{ color: connected ? "#059669" : "#dc2626" }}>
        WebSocket: {connected ? "Connected" : "Disconnected"}
      </div>
    </div>
  );
} 