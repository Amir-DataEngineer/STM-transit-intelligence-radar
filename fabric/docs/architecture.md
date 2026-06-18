# Architecture

This project is an end-to-end Microsoft Fabric transit intelligence solution.

## High-Level Flow

```text
STM APIs and GTFS Static
        ↓
Microsoft Fabric Eventhouse and Lakehouse
        ↓
KQL and Notebook transformations
        ↓
Operational KPIs and monitoring
        ↓
FastAPI backend
        ↓
Leaflet animated transit radar
