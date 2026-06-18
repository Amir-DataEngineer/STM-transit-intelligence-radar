# 05 Ingest GTFS Static

## Purpose

Documents the GTFS static ingestion process used for STM route, trip, stop, stop time, and shape reference data.

## Inputs

- GTFS Static ZIP
- routes.txt
- trips.txt
- shapes.txt
- stops.txt
- stop_times.txt

## Outputs

- GTFS reference tables
- Route metadata
- Trip-to-shape mapping
- Shape geometry foundation
- Data used for route-synced animation

## Why It Matters

GTFS shapes allow the project to align movement with route geometry instead of drawing simple straight lines.
