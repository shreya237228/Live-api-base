from fastapi.testclient import TestClient
from chart_api import app

client = TestClient(app)

def test_barchart():
    resp = client.post("/barchart", json={"numbers": [1, 2, 3]})
    assert resp.status_code == 200
    assert "image" in resp.json()
    assert resp.json()["image"].startswith("iVBOR")

def test_linechart():
    resp = client.post("/linechart", json={"numbers": [1, 2, 3]})
    assert resp.status_code == 200
    assert "image" in resp.json()
    assert resp.json()["image"].startswith("iVBOR")

def test_wordcloud():
    resp = client.post("/wordcloud", json={"text": "hello world hello"})
    assert resp.status_code == 200
    assert "image" in resp.json()
    assert resp.json()["image"].startswith("iVBOR") 