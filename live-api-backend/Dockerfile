FROM python:3.10-slim-buster

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y && apt-get upgrade -y
RUN apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-live.txt ./requirements-live.txt
RUN pip install --no-cache-dir -r requirements-live.txt

COPY .env .
COPY live_api.py .

ENV PYTHONUNBUFFERED=1

EXPOSE 9084

CMD ["python3", "live_api.py"]
