# STM Transit Intelligence Radar

An end-to-end Microsoft Fabric transit intelligence project for STM Montréal.

This project combines Microsoft Fabric, Eventhouse, KQL, Lakehouse processing, GTFS, Python, FastAPI, and Leaflet to create an animated transit radar for bus movement and live metro movement.

## Project Overview

The goal of this project is to transform transit operational data into a visual, analytics-ready, and portfolio-ready solution.

The project includes:

- Microsoft Fabric Eventhouse for real-time transit data storage
- KQL Database for operational analytics and playback queries
- Lakehouse processing for structured transit data layers
- Fabric notebooks for ingestion, transformation, enrichment, and monitoring
- Data quality and freshness monitoring
- GTFS static data integration
- Route-synced animated bus playback
- Estimated metro movement for Green and Orange lines
- FastAPI backend
- Leaflet-based Live map frontend
- Power BI / Semantic Model documentation

## Business Problem

Transit data is available through APIs and GTFS files, but it is often difficult to explore as a visual operational product.

This project demonstrates how transit data can be collected, modeled, monitored, and visualized as an interactive intelligence solution.

## Solution Architecture

```text
STM APIs + GTFS Static
        ↓
Microsoft Fabric Eventhouse / KQL Database
        ↓
Lakehouse Processing
        ↓
Bronze / Silver / Gold Notebooks
        ↓
Data Quality + Freshness Monitoring
        ↓
Operational KPIs + Semantic Model
        ↓
FastAPI Backend
        ↓
Leaflet Live Transit Radar
