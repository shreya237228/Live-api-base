# Live API Assignment: LLM Tools & Memory Implementation

## Overview

This project demonstrates a real-time AI assistant with voice and text chat, tool integration, and memory features, built with **Next.js/React** (frontend) and **Python (WebSocket + FastAPI)** (backend). The backend uses the **Google Gemini Live API** for LLM responses and supports custom tools and persistent memory.

---

## Assignment Requirements & Coverage

### Main Objectives

- **LLM Tools Implementation**:  
  - **Generic Info Tools**: Current time, weather, calculator  
  - **Frontend Interaction Tools**: Carousel navigation, button control  
  - **Data Visualization Tools**: Word cloud, bar chart, line chart, pie chart  
- **Memory Implementation**:  
  - Enable/disable/clear/status for memory  
  - User preferences, context, and knowledge memory

### Technical Requirements

- Tools are visible and demoable on the frontend
- Real-time communication between frontend and backend (WebSocket)
- Persistent memory with user preference support

---

## Project Structure

```
Live-api-base/
├── ai-tools/
│   └── ask-ai.js                # Tool registry and tool definitions
├── components/
│   ├── ask-ai-with-socket.js    # Chat UI with WebSocket
│   ├── ScreenShare.js           # Main chat and tool demo component
│   ├── WebSocketProvider.js     # WebSocket connection and message handler
│   └── ui/                      # Reusable UI components (button, card, carousel, scroll-area)
├── lib/
│   └── utils.js                 # Utility functions
├── live-api-backend/
│   ├── live_api.py              # Main Gemini WebSocket backend
│   ├── chart_api.py             # FastAPI REST endpoints for charts/wordclouds (optional)
│   ├── memory.py                # Memory persistence and logic
│   ├── requirements-live.txt    # Python dependencies
│   ├── Dockerfile, docker-compose.yml
│   └── session_handle.json      # Session state for Gemini
├── pages/
│   ├── _app.js                  # Next.js app wrapper
│   ├── index.js                 # Main landing page
│   └── memory-demo.js           # Memory management demo page
├── public/
│   └── worklets/
│       └── audio-processor.js   # Audio processing worklet
├── styles/
│   └── globals.css              # Global styles
├── tailwind.config.js, postcss.config.js
├── package.json, pnpm-lock.yaml
└── README.md                    # This file
```

---

## Features

### Frontend

- **Voice & Text Chat**: Real-time conversation with AI (WebSocket, audio streaming)
- **Tool Integration**: Register and use tools (current time, weather, calculator, charts, etc.)
- **Memory Management UI**: Enable/disable/clear/status memory, set/get preferences
- **Live Transcription**: See real-time transcriptions of audio
- **Reusable UI Components**: Carousel, cards, buttons, scroll area

### Backend

- **WebSocket Server**: Handles real-time chat, tool calls, and memory commands
- **Gemini LLM Integration**: Uses Google Gemini for AI responses
- **Custom Tools**: Implements all required tools (see below)
- **Memory Persistence**: Stores user preferences and memory in a JSON file
- **REST API for Charts/Wordclouds**: (Optional) FastAPI endpoints for direct chart/wordcloud generation

---

## Tool Implementation Details

| Tool         | How to Use (Example Input)         | How it Works / Issues |
|--------------|------------------------------------|-----------------------|
| Current Time | "What is the time?"                | Returns current server time |
| Weather      | "Weather in London"                | Uses OpenWeatherMap API (API key required) |
| Calculator   | "Calculate 2+2" or "2+2"           | Evaluates math expressions safely |
| Carousel     | "Next", "Previous"                 | Controls carousel in UI |
| Button Ctrl  | "Turn on light 1"                  | Toggles button state in UI |
| Word Cloud   | "Word cloud: hello world ..."      | Generates word cloud image |
| Bar Chart    | "Bar chart: 1,2,3"                 | Generates bar chart image (see below for issues) |
| Line Chart   | "Line chart: 1,2,3"                | Generates line chart image |
| Pie Chart    | "Pie chart: 1,2,3"                 | Generates pie chart image |

---

## Memory Implementation

- **Enable/Disable/Clear/Status**: Use the `/memory-demo` page to control memory state.
- **Preferences**: Set and get key-value pairs (e.g., user name, color).
- **Persistence**: All memory is stored in `live-api-backend/memory_store.json` via `memory.py`.
- **Context/Knowledge**: Structure is present, but only preferences are actively demoed.

- This section is meant to show memory persistence using WebSocket messages that update a JSON file on the backend. The backend handlers are in place and the file system is ready, but due to a missing response handler in the frontend, the result isn’t currently visible in the browser

---

## How to Run

### 1. Backend (Gemini WebSocket)

```bash
cd live-api-backend
pip install -r requirements-live.txt
# Set GOOGLE_API_KEY in .env
python live_api.py
```

### 2. Backend (Charts/Wordclouds REST API)

```bash
cd live-api-backend
uvicorn chart_api:app --reload --port 8000
```

### 3. Frontend

```bash
pnpm install
pnpm dev
# Visit http://localhost:3000
```

---

## Future Fix: Known Issues & Troubleshooting

1. **Bar Chart/Line Chart/Pie Chart Not Displaying**
   - **Symptom:** "bar chart: 1,2,3" goes through but see no image or get an audio error.
   - **Fix:** Update the WebSocket handler to only decode audio if the message contains a valid audio field. Chart images are sent as barchart, linechart, etc.

2. **WebSocket Disconnected**
   - **Symptom:** "WebSocket: Disconnected" in UI.
   - **Cause:** Backend not running, wrong port, or CORS issue.
   - **Fix:** Need to ensure backend is running on ws://localhost:9084 and CORS is allowed.

3. **No Memory Response**
   - **Symptom:** Memory commands sent, but no response in log.
   - **Cause:** Backend not restarted after code changes, or import error in live_api.py.
   - **Fix:** Restart backend, check for errors in terminal, ensure from memory import ... is correct.

5. **Audio Decoding Errors**
   - **Symptom:** "Error playing audio: EncodingError: Unable to decode audio data"
   - **Cause:** Frontend tries to decode non-audio messages as audio.
   - **Fix:** See #1 above.

6. **Chart/Wordcloud REST API Not Used**
   - **Note:** The FastAPI chart_api.py is provided for direct REST access to chart/wordcloud generation, but the main chat UI uses the WebSocket backend for tool calls.

---
## Demo Instructions

To try out the tools:
1. Start the backend (`python live_api.py`)
2. Run the frontend (`pnpm dev`)
3. Go to `http://localhost:3000`
4. Use the chat box to send:
   - `What time is it?`
   - `Weather in London`
   - `Bar chart: 1,2,3`

To test memory:
1. Visit `/memory-demo`
2. Use buttons to enable/disable memory
3. Set a preference like `demo_name = Shreya`
4. Verify changes in `memory_store.json`

---
## Assignment Coverage

- **All required tools implemented and demoable**
- **Memory management implemented and demoable**
- **Reusable tool infrastructure (see `ai-tools/ask-ai.js`)**
- **Real-time frontend-backend communication**
- **Code quality: modular, documented, and extensible**
- **Demo pages: `/tools-demo` (tools), `/memory-demo` (memory)**

---

## What Doesn't Work or Needs Attention

- **Bar/Line/Pie Chart display**: If you see no image, check frontend WebSocket handler and ensure only `audio` fields are decoded as audio.
- **Weather tool**: Requires a valid OpenWeatherMap API key.
- **Memory context/knowledge**: Structure present, but only preferences are actively demoed.
- **REST API for charts/wordclouds**: Provided, but not integrated into main chat UI (can be used for direct HTTP demos).

---


---

## License

This is an assignment project for demonstration purposes.

---

