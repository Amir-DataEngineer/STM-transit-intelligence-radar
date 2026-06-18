# 03 Process Bus Bronze Silver

## Purpose

Documents the Microsoft Fabric notebook used to transform raw bus data into cleaned bronze and silver layers.

## Inputs

- Raw STM bus position records
- Eventhouse / Lakehouse source data
- Ingestion timestamps

## Outputs

- Cleaned bus position records
- Standardized timestamps
- Valid latitude and longitude
- Vehicle, route, and trip identifiers

## Key Transformations

- Parse raw API payloads
- Standardize schema
- Validate coordinates
- Remove unusable records
- Prepare data for downstream analytics

## Public Repository Note

Workspace-specific connections, credentials, and private endpoints are excluded.
