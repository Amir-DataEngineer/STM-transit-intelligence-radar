import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR = FRONTEND_DIR / "data"

app = FastAPI(
    title="STM Transit Intelligence Radar",
    description="Public-safe FastAPI backend for the STM live transit radar demo.",
    version="1.0.0"
)


def read_json_file(file_name: str, default):
    path = DATA_DIR / file_name

    if not path.exists():
        return default

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def clean_route_filter(route_id: Optional[str]):
    if route_id is None:
        return None

    route_id = str(route_id).strip()

    if route_id == "":
        return None

    return route_id


def apply_route_filter(rows, route_filter):
    if not route_filter:
        return rows

    return [
        row for row in rows
        if str(row.get("route_id", "")).strip() == route_filter
    ]


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "project": "STM Transit Intelligence Radar"
    }


@app.get("/api/live-buses")
def get_live_buses(route_id: Optional[str] = Query(default=None)):
    route_filter = clean_route_filter(route_id)
    rows = read_json_file("sample_latest_buses.json", [])
    return apply_route_filter(rows, route_filter)


@app.get("/api/playback")
def get_playback(
    route_id: Optional[str] = Query(default=None),
    minutes_back: int = Query(default=30)
):
    route_filter = clean_route_filter(route_id)
    rows = read_json_file("sample_playback_buses.json", [])
    return apply_route_filter(rows, route_filter)


@app.get("/api/live-metro")
def get_live_metro():
    rows = read_json_file("sample_metro_latest.json", [])
    return [
        row for row in rows
        if row.get("line_key") in ["green", "orange"]
    ]


@app.get("/api/metro-playback")
def get_metro_playback():
    rows = read_json_file("sample_metro_playback.json", [])
    return [
        row for row in rows
        if row.get("line_key") in ["green", "orange"]
    ]


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
