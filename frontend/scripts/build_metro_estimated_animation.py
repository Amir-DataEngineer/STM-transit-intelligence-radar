"""
Build estimated metro animation data.

Public GitHub version:
- Generates sample estimated metro movement.
- Only Green and Orange lines are included.
- Yellow and Blue are intentionally excluded from the public demo.
"""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "frontend" / "data"

OUTPUT_PLAYBACK = DATA_DIR / "sample_metro_playback.json"
OUTPUT_LATEST = DATA_DIR / "sample_metro_latest.json"

ENABLED_LINES = {
    "green": {
        "line_name": "Green Line",
        "line_color": "#00843D",
        "route_id": "1"
    },
    "orange": {
        "line_name": "Orange Line",
        "line_color": "#FF671F",
        "route_id": "2"
    }
}


def build_sample_metro_rows():
    timestamps = [
        "2026-06-16T20:00:00Z",
        "2026-06-16T20:05:00Z"
    ]

    playback_rows = []

    green_points = [
        [[45.501, -73.570], [45.505, -73.568], [45.510, -73.565]],
        [[45.510, -73.565], [45.515, -73.562], [45.520, -73.560]]
    ]

    orange_points = [
        [[45.520, -73.590], [45.522, -73.585], [45.524, -73.580]],
        [[45.524, -73.580], [45.526, -73.575], [45.528, -73.570]]
    ]

    line_paths = {
        "green": green_points,
        "orange": orange_points
    }

    for line_key, config in ENABLED_LINES.items():
        for frame_index, timestamp in enumerate(timestamps):
            path_points = line_paths[line_key][frame_index]
            final_point = path_points[-1]

            playback_rows.append({
                "timestamp": timestamp,
                "vehicle_id": f"METRO-{line_key.upper()}-0-1",
                "mode": "metro",
                "line_key": line_key,
                "line_name": config["line_name"],
                "line_color": config["line_color"],
                "route_id": config["route_id"],
                "trip_id": f"sample-{line_key}-trip",
                "shape_id": f"sample-{line_key}-shape",
                "direction_id": "0",
                "train_number": 1,
                "lat": final_point[0],
                "lon": final_point[1],
                "path_points": path_points,
                "source": "GTFS estimated metro movement"
            })

    latest_rows = [
        row for row in playback_rows
        if row["timestamp"] == timestamps[-1]
    ]

    return playback_rows, latest_rows


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    playback_rows, latest_rows = build_sample_metro_rows()

    with open(OUTPUT_PLAYBACK, "w", encoding="utf-8") as file:
        json.dump(playback_rows, file, indent=2, ensure_ascii=False)

    with open(OUTPUT_LATEST, "w", encoding="utf-8") as file:
        json.dump(latest_rows, file, indent=2, ensure_ascii=False)

    print(f"Created {OUTPUT_PLAYBACK} | rows: {len(playback_rows)}")
    print(f"Created {OUTPUT_LATEST} | rows: {len(latest_rows)}")


if __name__ == "__main__":
    main()
