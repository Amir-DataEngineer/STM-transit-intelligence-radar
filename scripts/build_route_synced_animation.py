"""
Build route-synced bus animation data.

Public GitHub version:
- This script documents the route-synced animation logic.
- The full project version uses STM bus playback export + GTFS trips/shapes.
- Secrets and raw data are excluded from the public repository.
"""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "frontend" / "data"

OUTPUT_FILE = DATA_DIR / "sample_playback_buses.json"


def build_sample_route_synced_bus_data():
    sample_rows = [
        {
            "timestamp": "2026-06-16T20:00:00Z",
            "vehicle_id": "BUS-1001",
            "route_id": "35",
            "trip_id": "301025318",
            "shape_id": "bus_shape_35",
            "lat": 45.5017,
            "lon": -73.5673,
            "bearing": 120,
            "speed": 18,
            "occupancy_status": "FEW_SEATS_AVAILABLE",
            "snap_distance_m": 12.5,
            "path_points": [
                [45.5017, -73.5673],
                [45.5025, -73.5681],
                [45.5031, -73.5690]
            ]
        }
    ]

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(sample_rows, file, indent=2, ensure_ascii=False)

    print(f"Created sample route-synced bus data: {OUTPUT_FILE}")


if __name__ == "__main__":
    build_sample_route_synced_bus_data()
