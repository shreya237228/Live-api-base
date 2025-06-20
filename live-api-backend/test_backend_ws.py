import asyncio
import json
import pytest
import websockets

WS_URL = "ws://localhost:9084"

@pytest.mark.asyncio
async def test_time_tool():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"text": "What is the time?"}))
        resp = await ws.recv()
        data = json.loads(resp)
        assert "time" in data["text"].lower() or "current" in data["text"].lower()

@pytest.mark.asyncio
async def test_barchart_tool():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"text": "bar chart: 1,2,3"}))
        resp = await ws.recv()
        data = json.loads(resp)
        assert "barchart" in data
        assert isinstance(data["barchart"], str)
        assert data["barchart"].startswith("iVBOR")  # PNG base64

@pytest.mark.asyncio
async def test_memory_enable_status():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"memory": "enable"}))
        resp = await ws.recv()
        data = json.loads(resp)
        assert data["memory_status"] == "enabled"
        await ws.send(json.dumps({"memory": "status"}))
        resp = await ws.recv()
        data = json.loads(resp)
        assert data["memory_status"]["enabled"] is True

@pytest.mark.asyncio
async def test_calculator_tool():
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"text": "calculate 2+2"}))
        resp = await ws.recv()
        data = json.loads(resp)
        assert "4" in data["text"] 