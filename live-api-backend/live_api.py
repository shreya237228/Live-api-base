import asyncio
import json
import os
import uuid
from google import genai
import base64
from google.genai import types
from google.genai.types import Content, Part, Tool, FunctionDeclaration, FunctionResponse
import requests

from websockets.server import WebSocketServerProtocol
import websockets
import io
from pydub import AudioSegment
import datetime
from dotenv import load_dotenv
import re
import ast
from wordcloud import WordCloud
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

load_dotenv()

# Load API key from environment

gemini_api_key = os.environ['GOOGLE_API_KEY']
MODEL = "gemini-2.0-flash-live-001"  # For multimodal
client = genai.Client(
    http_options={
        'api_version': 'v1alpha',
    }
)

# Load previous session handle from a file
# You must delete the session_handle.json file to start a new session when last session was
# finished for a while.


def load_previous_session_handle():
    try:
        with open('session_handle.json', 'r') as f:
            data = json.load(f)
            print(
                f"Loaded previous session handle: {data.get('previous_session_handle', None)}")
            return data.get('previous_session_handle', None)
    except FileNotFoundError:
        return None

# Save previous session handle to a file


def save_previous_session_handle(handle):
    with open('session_handle.json', 'w') as f:
        json.dump({'previous_session_handle': handle}, f)

def clear_stale_session_handle():
    """Remove any stored session handle so that a fresh session can be started on the next connection."""
    try:
        os.remove('session_handle.json')
    except FileNotFoundError:
        pass
    global previous_session_handle
    previous_session_handle = None

previous_session_handle = load_previous_session_handle()

# --- Tool: Current Time ---
def current_time_tool():
    now = datetime.datetime.now()
    return now.strftime('%Y-%m-%d %I:%M:%S %p')

# Define Gemini tool for current time
time_tool = Tool(
    function_declarations=[
        FunctionDeclaration(
            name="current_time",
            description="Returns the current date and time.",
            parameters={}  # Use empty dict if SchemaType is not available
        )
    ]
)

# --- Tool: Weather Information ---
OPENWEATHER_API_KEY = "e26b55f010b0d7ed5529668276e57d20"
DEFAULT_WEATHER_CITY = "London"

def weather_info_tool(city=DEFAULT_WEATHER_CITY):
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        if response.status_code != 200 or "weather" not in data:
            return f"Could not fetch weather data for {city}."
        desc = data["weather"][0]["description"].capitalize()
        temp = data["main"]["temp"]
        feels_like = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        return f"Weather in {city}: {desc}, Temp: {temp}°C (feels like {feels_like}°C), Humidity: {humidity}%"
    except Exception as e:
        return f"Error fetching weather: {e}"

# --- Tool: Calculator ---
def calculator_tool(expr):
    try:
        # Parse the expression safely
        node = ast.parse(expr, mode='eval')
        allowed_nodes = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Constant, ast.Load, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod, ast.USub, ast.UAdd)
        for n in ast.walk(node):
            if not isinstance(n, allowed_nodes):
                return "Invalid or unsafe expression."
        result = eval(compile(node, '<string>', 'eval'))
        return f"Result: {result}"
    except Exception as e:
        return f"Error evaluating expression: {e}"

# --- Tool: Word Cloud Generator ---
def wordcloud_tool(text):
    try:
        wc = WordCloud(width=400, height=200, background_color="white").generate(text)
        buf = io.BytesIO()
        plt.figure(figsize=(4,2))
        plt.imshow(wc, interpolation="bilinear")
        plt.axis("off")
        plt.tight_layout(pad=0)
        plt.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
        plt.close()
        buf.seek(0)
        img_bytes = buf.read()
        base64_img = base64.b64encode(img_bytes).decode("utf-8")
        return base64_img
    except Exception as e:
        return None

def _chart_encode(fig):
    buf = io.BytesIO()
    plt.tight_layout()
    fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _parse_numbers(num_list):
    try:
        return [float(x) for x in num_list if x.strip() != ""]
    except ValueError:
        return []


def barchart_tool(numbers):
    import matplotlib.pyplot as plt
    nums = _parse_numbers(numbers)
    if not nums:
        return None
    fig, ax = plt.subplots(figsize=(4, 2))
    ax.bar(range(1, len(nums) + 1), nums, color="#4f46e5")
    ax.set_title("Bar Chart")
    return _chart_encode(fig)

def linechart_tool(numbers):
    import matplotlib.pyplot as plt
    nums = _parse_numbers(numbers)
    if not nums:
        return None
    fig, ax = plt.subplots(figsize=(4, 2))
    ax.plot(range(1, len(nums) + 1), nums, marker="o", color="#059669")
    ax.set_title("Line Chart")
    return _chart_encode(fig)

def piechart_tool(numbers):
    import matplotlib.pyplot as plt
    nums = _parse_numbers(numbers)
    if not nums:
        return None
    fig, ax = plt.subplots(figsize=(4, 2))
    ax.pie(nums, labels=[str(i + 1) for i in range(len(nums))], autopct="%1.1f%%")
    ax.set_title("Pie Chart")
    return _chart_encode(fig)

MEMORY_FILE = "memory_store.json"

def load_memory():
    try:
        with open(MEMORY_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {"enabled": False, "preferences": {}, "context": {}, "knowledge": {}}

def save_memory(mem):
    with open(MEMORY_FILE, "w") as f:
        json.dump(mem, f)

# Initialize memory
memory = load_memory()

async def gemini_session_handler(websocket: WebSocketServerProtocol):
    print(f"Starting Gemini session")
    try:
        config_message = await websocket.recv()
        # config_data = json.loads(config_message)
        # print(f"Config data: {config_data}")

        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    # Puck, Charon, Kore, Fenrir, Aoede, Leda, Orus, and Zephyr.
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Kore")
                ),
                language_code='en-US',
            ),
            system_instruction="You are a helpful assistant",
            session_resumption=types.SessionResumptionConfig(
                # The handle of the session to resume is passed here,
                # or else None to start a new session.
                handle=previous_session_handle
            ),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            tools=[time_tool],  # Register the tool here
        )

        async with client.aio.live.connect(model=MODEL, config=config) as session:
            # print(f"Connected to Gemini API with handle: {previous_session_handle}")

            async def send_to_gemini():
                try:
                    async for message in websocket:
                        try:
                            data = json.loads(message)

                            if "realtime_input" in data:
                                for chunk in data["realtime_input"]["media_chunks"]:
                                    if chunk["mime_type"] == "audio/pcm":
                                        await session.send(input={  # type: ignore
                                            "mime_type": "audio/pcm",
                                            "data": chunk["data"]
                                        })
                                    elif chunk["mime_type"].startswith("image/"):
                                        await session.send(input={  # type: ignore
                                            "mime_type": chunk["mime_type"],
                                            "data": chunk["data"]
                                        })

                            elif "text" in data:
                                text_content = data["text"].lower()
                                # Manual tool interception for 'time', 'weather', 'calculator', carousel, and button control
                                if "time" in text_content:
                                    print(f"Manual tool logic triggered for message: {text_content}")
                                    tool_result = current_time_tool()
                                    await websocket.send(json.dumps({
                                        "text": f"The current time is: {tool_result}"
                                    }))
                                    continue  # Prevent sending to Gemini
                                elif (match := re.search(r"weather(?: in ([a-zA-Z\s]+))?", text_content)):
                                    print(f"Manual tool logic triggered for weather: {text_content}")
                                    # Try to extract city from message, e.g., 'weather in Paris'
                                    city = DEFAULT_WEATHER_CITY
                                    if match.group(1):
                                        city = match.group(1).strip().title()
                                    tool_result = weather_info_tool(city)
                                    await websocket.send(json.dumps({
                                        "text": tool_result
                                    }))
                                    continue  # Prevent sending to Gemini
                                elif "calculate" in text_content or re.search(r"^\s*\d+[\d\s\+\-\*\/\(\)\.]*$", text_content):
                                    print(f"Manual tool logic triggered for calculator: {text_content}")
                                    # Extract the expression after 'calculate' or use the whole message if it looks like math
                                    expr = text_content
                                    if (calc_match := re.search(r"calculate (.+)", text_content)):
                                        expr = calc_match.group(1)
                                    tool_result = calculator_tool(expr)
                                    await websocket.send(json.dumps({
                                        "text": tool_result
                                    }))
                                    continue  # Prevent sending to Gemini
                                elif any(word in text_content for word in ["next", "go to next", "forward"]):
                                    print(f"Manual tool logic triggered for carousel NEXT: {text_content}")
                                    await websocket.send(json.dumps({"carousel": "next"}))
                                    continue  # Prevent sending to Gemini
                                elif any(word in text_content for word in ["previous", "prev", "go to previous", "back"]):
                                    print(f"Manual tool logic triggered for carousel PREV: {text_content}")
                                    await websocket.send(json.dumps({"carousel": "prev"}))
                                    continue  # Prevent sending to Gemini
                                # Button control logic
                                elif (match := re.search(r"turn (on|off) (light 1|light 2|fan)", text_content)):
                                    state = match.group(1)
                                    name = match.group(2).title()
                                    print(f"Manual tool logic triggered for button: {name} {state}")
                                    await websocket.send(json.dumps({"button": {"name": name, "state": state}}))
                                    continue  # Prevent sending to Gemini
                                # Word cloud tool logic
                                elif "word cloud" in text_content:
                                    print(f"Manual tool logic triggered for word cloud: {text_content}")
                                    # Extract text after 'word cloud' or 'generate word cloud'
                                    wc_text = text_content
                                    if (wc_match := re.search(r"(?:word cloud|generate word cloud)(?: for|:)?\s*(.*)", text_content)):
                                        if wc_match.group(1):
                                            wc_text = wc_match.group(1)
                                    
                                    base64_img = wordcloud_tool(wc_text)
                                    if base64_img:
                                        await websocket.send(json.dumps({"wordcloud": base64_img}))
                                    else:
                                        await websocket.send(json.dumps({"text": "Failed to generate word cloud."}))
                                    continue  # Prevent sending to Gemini
                                # Bar chart tool logic
                                elif "bar chart" in text_content:
                                    print(f"Manual tool logic triggered for bar chart: {text_content}")
                                    nums = []
                                    if (nums_match := re.search(r"bar chart[:\s]+([\d,\s\.]+)", text_content)):
                                        if nums_match.group(1):
                                            nums = nums_match.group(1).replace(' ', '').split(',')
                                    base64_img = barchart_tool(nums)
                                    if base64_img:
                                        await websocket.send(json.dumps({"barchart": base64_img}))
                                    else:
                                        await websocket.send(json.dumps({"text": "Failed to generate bar chart."}))
                                    continue  # Prevent sending to Gemini
                                # Line chart tool logic
                                elif "line chart" in text_content:
                                    print(f"Manual tool logic triggered for line chart: {text_content}")
                                    nums = []
                                    if (nums_match := re.search(r"line chart[:\s]+([\d,\s\.]+)", text_content)):
                                        if nums_match.group(1):
                                            nums = nums_match.group(1).replace(' ', '').split(',')
                                    base64_img = linechart_tool(nums)
                                    if base64_img:
                                        await websocket.send(json.dumps({"linechart": base64_img}))
                                    else:
                                        await websocket.send(json.dumps({"text": "Failed to generate line chart."}))
                                    continue  # Prevent sending to Gemini
                                # Pie chart tool logic
                                elif "pie chart" in text_content:
                                    print(f"Manual tool logic triggered for pie chart: {text_content}")
                                    nums = []
                                    if (nums_match := re.search(r"pie chart[:\s]+([\d,\s\.]+)", text_content)):
                                        if nums_match.group(1):
                                            nums = nums_match.group(1).replace(' ', '').split(',')
                                    base64_img = piechart_tool(nums)
                                    if base64_img:
                                        await websocket.send(json.dumps({"piechart": base64_img}))
                                    else:
                                        await websocket.send(json.dumps({"text": "Failed to generate pie chart."}))
                                    continue  # Prevent sending to Gemini
                                # Memory management logic
                                elif "memory" in data:
                                    mem_cmd = data["memory"]
                                    global memory
                                    if mem_cmd == "enable":
                                        memory["enabled"] = True
                                        save_memory(memory)
                                        await websocket.send(json.dumps({"memory_status": "enabled"}))
                                    elif mem_cmd == "disable":
                                        memory["enabled"] = False
                                        save_memory(memory)
                                        await websocket.send(json.dumps({"memory_status": "disabled"}))
                                    elif mem_cmd == "clear":
                                        memory = {"enabled": memory.get("enabled", False), "preferences": {}, "context": {}, "knowledge": {}}
                                        save_memory(memory)
                                        await websocket.send(json.dumps({"memory_status": "cleared"}))
                                    elif mem_cmd == "status":
                                        await websocket.send(json.dumps({"memory_status": memory}))
                                    elif mem_cmd == "set_preference":
                                        key = data.get("key")
                                        value = data.get("value")
                                        if key:
                                            memory["preferences"][key] = value
                                            save_memory(memory)
                                            await websocket.send(json.dumps({"memory_status": f"preference set: {key}={value}"}))
                                    elif mem_cmd == "get_preference":
                                        key = data.get("key")
                                        value = memory["preferences"].get(key)
                                        await websocket.send(json.dumps({"memory_value": value}))
                                    continue  # Prevent sending to Gemini
                                else:
                                    await session.send_client_content(
                                        turns=Content(role="user", parts=[Part(text=data["text"])])
                                    )
                        except Exception as e:
                            print(f"Error sending to Gemini: {e}")
                    print("Client connection closed (send)")
                except Exception as e:
                    print(f"Error sending to Gemini: {e}")
                finally:
                    print("send_to_gemini closed")

            async def receive_from_gemini():
                try:
                    while True:
                        try:
                            print("receiving from gemini")
                            async for response in session.receive():
                                # --- Tool call handling ---
                                tool_req = getattr(response, "tool_request", None)
                                if tool_req:
                                    if tool_req.name == "current_time":
                                        tool_result = current_time_tool()
                                        await session.send_tool_response(
                                            function_responses=[
                                                FunctionResponse(name="current_time", response={"result": tool_result})
                                            ]
                                        )
                                        continue
                                # --- End tool call handling ---

                                if response.server_content and hasattr(response.server_content, 'interrupted') and response.server_content.interrupted is not None:
                                    print(
                                        f"[{datetime.datetime.now()}] Generation interrupted")
                                    await websocket.send(json.dumps({"interrupted": "True"}))
                                    continue

                                if response.usage_metadata:
                                    usage = response.usage_metadata
                                    print(
                                        f'Used {usage.total_token_count} tokens in total.'
                                    )

                                if response.session_resumption_update:
                                    update = response.session_resumption_update
                                    if update.resumable and update.new_handle:
                                        # The handle should be retained and linked to the session.
                                        previous_session_handle = update.new_handle
                                        save_previous_session_handle(
                                            previous_session_handle)
                                        print(
                                            f"Resumed session update with handle: {previous_session_handle}")

                                if response.server_content and hasattr(response.server_content, 'output_transcription') and response.server_content.output_transcription is not None:
                                    await websocket.send(json.dumps({
                                        "transcription": {
                                            "text": response.server_content.output_transcription.text,
                                            "sender": "Gemini",
                                            "finished": response.server_content.output_transcription.finished
                                        }
                                    }))
                                if response.server_content and hasattr(response.server_content, 'input_transcription') and response.server_content.input_transcription is not None:
                                    await websocket.send(json.dumps({
                                        "transcription": {
                                            "text": response.server_content.input_transcription.text,
                                            "sender": "User",
                                            "finished": response.server_content.input_transcription.finished
                                        }
                                    }))

                                if response.server_content is None:
                                    continue

                                model_turn = response.server_content.model_turn
                                if model_turn and model_turn.parts:
                                    for part in model_turn.parts:
                                        if hasattr(part, 'text') and part.text is not None:
                                            await websocket.send(json.dumps({"text": part.text}))

                                        elif hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                                            try:
                                                audio_data = part.inline_data.data
                                                base64_audio = base64.b64encode(
                                                    audio_data).decode('utf-8')
                                                await websocket.send(json.dumps({
                                                    "audio": base64_audio,
                                                }))
                                                # print(f"Sent assistant audio to client: {base64_audio[:32]}...")
                                            except Exception as e:
                                                print(
                                                    f"Error processing assistant audio: {e}")

                                if response.server_content and response.server_content.turn_complete:
                                    print('\n<Turn complete>')
                                    await websocket.send(json.dumps({
                                        "transcription": {
                                            "text": "",
                                            "sender": "Gemini",
                                            "finished": True
                                        }
                                    }))

                        except websockets.exceptions.ConnectionClosedOK:
                            print("Client connection closed normally (receive)")
                            break
                        except Exception as e:
                            print(f"Error receiving from Gemini: {e}")
                            break

                except Exception as e:
                    print(f"Error receiving from Gemini: {e}")
                finally:
                    print("Gemini connection closed (receive)")

            # Start send and receive tasks
            send_task = asyncio.create_task(send_to_gemini())
            receive_task = asyncio.create_task(receive_from_gemini())
            await asyncio.gather(send_task, receive_task)

    except Exception as e:
        print(f"Error in Gemini session: {e}")
    finally:
        print("Gemini session closed.")


async def main() -> None:
    # Use explicit IPv4 address and handle deprecation
    server = await websockets.serve(
        gemini_session_handler,
        host="0.0.0.0",  # Explicitly use IPv4 localhost
        port=9084,
        compression=None  # Disable compression to avoid deprecation warning
    )

    print("Running websocket server on 0.0.0.0:9084...")
    # print("Long memory tutoring assistant ready to help")
    await asyncio.Future()  # Keep the server running indefinitely

if __name__ == "__main__":
    asyncio.run(main())
