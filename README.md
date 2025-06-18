# Assignment Live API Demo

A simplified version of the ask-ai interface with WebSocket chat functionality, built with Next.js and React.

## Features

- 🎤 **Voice Chat**: Real-time voice conversation with AI using WebSocket connection and audio streaming
- 💬 **Text Chat**: Send text messages and receive responses through the chat interface
- 🛠️ **Tool Integration**: Dynamic tool registration system for extending AI's capabilities
- 🔄 **Real-time Updates**: Live transcription and audio playback with connection status indicators

## Getting Started

### Prerequisites

- Node.js (14.x or later)
- pnpm (or npm/yarn)

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Run the development server:

```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. Click "Open Chat with AI" to start the chat interface
2. Allow microphone access when prompted for voice conversation
3. Click "Start Conversation" to begin voice chat or type messages directly
4. Try asking AI to use tools like "echo hello world" or "greet me as John"
5. Watch the audio level indicators for mic and speaker activity

## Project Structure

```
assignment-live-api/
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── AskAIScreenShare.js    # Main chat interface wrapper
│   ├── ScreenShare.js         # Chat component with audio/text
│   └── WebSocketProvider.js   # WebSocket connection handler
├── ai-tools/
│   └── ask-ai.js              # Tool registry and example tools
├── live-api-backend/          # Python WebSocket backend
│   ├── live_api.py           # Main WebSocket server
│   ├── requirements-live.txt # Python dependencies
│   ├── Dockerfile            # Docker configuration
│   └── docker-compose.yml    # Docker Compose setup
├── pages/
│   ├── _app.js               # Next.js app wrapper
│   └── index.js              # Main page
├── public/
│   └── worklets/
│       └── audio-processor.js # Audio processing worklet
├── styles/
│   └── globals.css           # Global styles
└── lib/
    └── utils.js              # Utility functions
```

## Technologies Used

### Frontend

- **Next.js** - React framework
- **React** - UI library
- **Tailwind CSS** - Styling and animations
- **Radix UI** - UI components (ScrollArea, Slot)
- **Lucide React** - Icon library
- **Material UI Icons** - Additional icons
- **js-base64** - Base64 encoding/decoding
- **WebSocket API** - Real-time communication
- **Web Audio API** - Audio processing

### Backend

- **Python** - Backend language
- **WebSockets** - Real-time bidirectional communication
- **Google Gemini Live API** - AI conversation engine
- **PyDub** - Audio processing
- **Python-dotenv** - Environment variable management

## Live API Backend

The `live-api-backend` directory contains a Python WebSocket server that provides real-time voice and text conversation capabilities using Google's Gemini Live API.

### Backend Features

- 🎙️ **Real-time Audio Processing**: Handles PCM audio streams from the frontend
- 🔄 **WebSocket Server**: Manages bidirectional communication with the React frontend
- 🤖 **Gemini Live Integration**: Uses Google's Gemini 2.0 Flash Live model for AI responses
- 📝 **Live Transcription**: Provides real-time transcription of conversations
- 🔊 **Audio Streaming**: Streams AI-generated audio responses back to the frontend

### Backend Setup

#### Prerequisites

- Python 3.8 or later
- Google API Key with Gemini API access

#### Installation

1. **Navigate to the backend directory:**

   ```bash
   cd live-api-backend
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements-live.txt
   ```

3. **Set up environment variables:**
   Create a `.env` file in the `live-api-backend` directory:

   ```bash
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. **Run the backend server:**

   ```bash
   python live_api.py
   ```

   The server will start on `ws://0.0.0.0:9084`

#### Using Docker

Alternatively, you can run the backend using Docker:

1. **Build and run with Docker Compose:**

   ```bash
   cd live-api-backend
   docker-compose up --build
   ```

2. **Or build and run manually:**
   ```bash
   cd live-api-backend
   docker build -t live-api-backend .
   docker run -p 9084:9084 --env-file .env live-api-backend
   ```

### Quick Start (Both Frontend + Backend)

1. **Terminal 1 - Start the backend:**

   ```bash
   cd live-api-backend
   pip install -r requirements-live.txt
   # Create .env file with GOOGLE_API_KEY
   python live_api.py
   ```

2. **Terminal 2 - Start the frontend:**

   ```bash
   pnpm install
   pnpm dev
   ```

3. **Or use the npm script:**

   ```bash
   # Start backend (after setting up .env)
   pnpm backend

   # In another terminal, start frontend
   pnpm dev
   ```

### Backend API

The WebSocket server accepts the following message types:

- **Setup Message**: Initial configuration with AI personality and tools
- **Text Message**: Plain text messages for chat
- **Media Chunk**: PCM audio data for voice conversation
- **End Conversation**: Signal to stop the current conversation

### WebSocket Configuration

The frontend is configured to connect to:

- **Development**: `ws://0.0.0.0:9084` (local backend)
- **Production**: Update the WebSocket URL in `components/AskAIScreenShare.js` as needed

## Custom Tools

You can register custom tools in the `ai-tools/ask-ai.js` file or in your React components. Example:

```javascript
const unregisterTool = registerTool(
  "myTool",
  {
    name: "myTool",
    description: "Description of what the tool does",
    parameters: {
      type: "object",
      properties: {
        param1: {
          type: "string",
          description: "Parameter description",
        },
      },
      required: ["param1"],
    },
  },
  async ({ param1 }) => {
    // Tool implementation
    return `Result: ${param1}`;
  }
);
```

## Development

For local development, you may need to:

1. Update the WebSocket URL in `components/AskAIScreenShare.js`
2. Ensure your local WebSocket server supports the expected message format
3. Handle CORS if connecting to a different domain

## License

This is an assignment project for demonstration purposes.
