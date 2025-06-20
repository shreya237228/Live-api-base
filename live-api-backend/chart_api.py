from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import matplotlib.pyplot as plt
import io
import base64
from wordcloud import WordCloud

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChartRequest(BaseModel):
    numbers: List[float]

class WordCloudRequest(BaseModel):
    text: str


def fig_to_base64(fig):
    buf = io.BytesIO()
    plt.tight_layout()
    fig.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")

@app.post("/barchart")
def barchart(req: ChartRequest):
    fig, ax = plt.subplots(figsize=(4, 2))
    ax.bar(range(1, len(req.numbers) + 1), req.numbers, color="#4f46e5")
    ax.set_title("Bar Chart")
    img = fig_to_base64(fig)
    return {"image": img}

@app.post("/linechart")
def linechart(req: ChartRequest):
    fig, ax = plt.subplots(figsize=(4, 2))
    ax.plot(range(1, len(req.numbers) + 1), req.numbers, marker="o", color="#059669")
    ax.set_title("Line Chart")
    img = fig_to_base64(fig)
    return {"image": img}

@app.post("/wordcloud")
def wordcloud_api(req: WordCloudRequest):
    wc = WordCloud(width=400, height=200, background_color="white").generate(req.text)
    buf = io.BytesIO()
    plt.figure(figsize=(4,2))
    plt.imshow(wc, interpolation="bilinear")
    plt.axis("off")
    plt.tight_layout(pad=0)
    plt.savefig(buf, format="png", bbox_inches="tight", pad_inches=0)
    plt.close()
    buf.seek(0)
    img = base64.b64encode(buf.read()).decode("utf-8")
    return {"image": img}

@app.get("/")
def root():
    return {"message": "Chart/WordCloud API is running."} 