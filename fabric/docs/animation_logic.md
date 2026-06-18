# Animation Logic

## Bus Movement

Bus movement uses route-synced GTFS geometry and playback frames.

The workflow is:

```text
playback_raw_5min.csv
        ↓
trip_id to shape_id
        ↓
raw GPS point to nearest GTFS shape point
        ↓
path_points generation
        ↓
Leaflet marker animation
