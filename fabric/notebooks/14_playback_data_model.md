# 14 Playback Data Model

## Purpose

Documents the playback model used by the animated transit radar.

## Inputs

- rt_bus_vehicle_positions
- GTFS route geometry
- 5-minute vehicle position frames

## Outputs

- playback_raw_5min.csv
- route-synced bus playback data
- animation-ready JSON

## Key Logic

- Select latest 10 five-minute frames
- Keep vehicles with complete frame coverage
- Validate coordinates
- Export playback-ready data
