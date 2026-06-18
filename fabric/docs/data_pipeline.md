# Data Pipeline

## Purpose

Documents the ingestion, transformation, enrichment, quality monitoring, and animation export pipeline.

## Data Sources

- STM bus positions
- STM trip updates
- STM service alerts
- STM metro service status
- GTFS static files

## Processing Steps

1. Ingest raw transit data
2. Store operational records in Eventhouse
3. Process and enrich data in Lakehouse
4. Validate data quality
5. Build operational KPIs
6. Export animation-ready playback data
