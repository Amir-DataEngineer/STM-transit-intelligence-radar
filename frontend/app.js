let map;
let busMarkers = new Map();
let liveTimer = null;
let playbackTimer = null;
let isPlaybackMode = false;

const MONTREAL_CENTER = [45.5017, -73.5673];

const LIVE_REFRESH_MS = 9000;
const LIVE_ANIMATION_DURATION_MS = 8500;

const PLAYBACK_FRAME_MS = 5000;
const PLAYBACK_ANIMATION_DURATION_MS = 4600;

const MAX_REASONABLE_JUMP_KM = 1.2;
const MIN_MOVE_DISTANCE_M = 5;

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function haversineDistanceKm(latLngA, latLngB) {
    const earthRadiusKm = 6371;

    const lat1 = Number(latLngA[0]);
    const lon1 = Number(latLngA[1]);
    const lat2 = Number(latLngB[0]);
    const lon2 = Number(latLngB[1]);

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
}

function easeInOut(progress) {
    return progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

function initMap() {
    map = L.map("map").setView(MONTREAL_CENTER, 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    document.getElementById("liveBtn").addEventListener("click", startLiveMode);
    document.getElementById("playbackBtn").addEventListener("click", startPlaybackMode);
    document.getElementById("clearBtn").addEventListener("click", clearAllMarkers);

    startLiveMode();
}

function getRouteFilter() {
    return document.getElementById("routeInput").value.trim();
}

function buildUrl(baseUrl) {
    const routeId = getRouteFilter();

    if (!routeId) {
        return baseUrl;
    }

    return `${baseUrl}?route_id=${encodeURIComponent(routeId)}`;
}

async function fetchLiveBuses() {
    const response = await fetch(buildUrl("/api/live-buses"));
    return await response.json();
}

async function fetchPlaybackBuses() {
    const routeId = getRouteFilter();
    const baseUrl = "/api/playback?minutes_back=30";

    if (!routeId) {
        const response = await fetch(baseUrl);
        return await response.json();
    }

    const response = await fetch(`${baseUrl}&route_id=${encodeURIComponent(routeId)}`);
    return await response.json();
}

function getBusIcon(bus) {
    const bearing = Number(bus.bearing || 0);
    const staleClass = bus.is_stale ? "stale" : "";

    return L.divIcon({
        className: "bus-marker-wrapper",
        html: `
            <div class="bus-marker ${staleClass}">
                <div class="bus-triangle" style="transform: rotate(${bearing}deg);">▲</div>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

async function startLiveMode() {
    isPlaybackMode = false;

    if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
    }

    if (liveTimer) {
        clearInterval(liveTimer);
        liveTimer = null;
    }

    await updateLiveBuses();

    liveTimer = setInterval(async () => {
        if (!isPlaybackMode) {
            await updateLiveBuses();
        }
    }, LIVE_REFRESH_MS);
}

async function updateLiveBuses() {
    const buses = await fetchLiveBuses();

    updateStatus(`Live mode | Buses displayed: ${buses.length}`);

    const seenVehicleIds = new Set();

    buses.forEach(bus => {
        if (!isValidBusPosition(bus)) {
            return;
        }

        seenVehicleIds.add(bus.vehicle_id);
        upsertBusMarker(bus, LIVE_ANIMATION_DURATION_MS);
    });

    removeMissingMarkers(seenVehicleIds);
}

function isValidBusPosition(bus) {
    return (
        bus &&
        bus.vehicle_id &&
        bus.lat !== undefined &&
        bus.lon !== undefined &&
        !Number.isNaN(Number(bus.lat)) &&
        !Number.isNaN(Number(bus.lon))
    );
}

function normalizePathPoints(bus) {
    if (!bus.path_points || !Array.isArray(bus.path_points)) {
        return [];
    }

    return bus.path_points
        .filter(point =>
            Array.isArray(point) &&
            point.length >= 2 &&
            !Number.isNaN(Number(point[0])) &&
            !Number.isNaN(Number(point[1]))
        )
        .map(point => [Number(point[0]), Number(point[1])]);
}

function upsertBusMarker(bus, animationDurationMs) {
    const vehicleId = bus.vehicle_id;
    const targetLatLng = [Number(bus.lat), Number(bus.lon)];
    const pathPoints = normalizePathPoints(bus);

    if (!busMarkers.has(vehicleId)) {
        const initialLatLng = pathPoints.length > 0 ? pathPoints[0] : targetLatLng;

        const marker = L.marker(initialLatLng, {
            icon: getBusIcon(bus)
        }).addTo(map);

        marker.on("click", () => {
            showBusDetails(bus);
        });

        marker.bindPopup(buildPopupHtml(bus));

        busMarkers.set(vehicleId, {
            marker: marker,
            currentLatLng: initialLatLng,
            bus: bus
        });

        return;
    }

    const markerState = busMarkers.get(vehicleId);

    markerState.marker.setIcon(getBusIcon(bus));
    markerState.marker.off("click");
    markerState.marker.on("click", () => {
        showBusDetails(bus);
    });
    markerState.marker.bindPopup(buildPopupHtml(bus));
    markerState.bus = bus;

    if (pathPoints.length >= 2) {
        animateMarkerAlongPath(markerState, pathPoints, animationDurationMs, () => {
            const finalPoint = pathPoints[pathPoints.length - 1];
            markerState.currentLatLng = finalPoint;
        });

        return;
    }

    const distanceKm = haversineDistanceKm(markerState.currentLatLng, targetLatLng);
    const distanceM = distanceKm * 1000;

    if (distanceM < MIN_MOVE_DISTANCE_M) {
        markerState.currentLatLng = targetLatLng;
        markerState.marker.setLatLng(targetLatLng);
        return;
    }

    if (distanceKm > MAX_REASONABLE_JUMP_KM) {
        markerState.currentLatLng = targetLatLng;
        markerState.marker.setLatLng(targetLatLng);
        return;
    }

    animateMarkerStraight(markerState, targetLatLng, animationDurationMs);
}

function animateMarkerStraight(markerState, targetLatLng, durationMs) {
    const startLatLng = markerState.currentLatLng;
    const startTime = performance.now();

    function step(now) {
        const rawProgress = Math.min((now - startTime) / durationMs, 1);
        const progress = easeInOut(rawProgress);

        const lat = startLatLng[0] + (targetLatLng[0] - startLatLng[0]) * progress;
        const lon = startLatLng[1] + (targetLatLng[1] - startLatLng[1]) * progress;

        markerState.marker.setLatLng([lat, lon]);

        if (rawProgress < 1) {
            requestAnimationFrame(step);
        } else {
            markerState.currentLatLng = targetLatLng;
        }
    }

    requestAnimationFrame(step);
}

function animateMarkerAlongPath(markerState, pathPoints, durationMs, onComplete) {
    const validPath = pathPoints.filter(point =>
        Array.isArray(point) &&
        point.length >= 2 &&
        !Number.isNaN(Number(point[0])) &&
        !Number.isNaN(Number(point[1]))
    );

    if (validPath.length <= 1) {
        markerState.marker.setLatLng(validPath[0] || markerState.currentLatLng);

        if (onComplete) {
            onComplete();
        }

        return;
    }

    const segmentLengths = [];
    let totalDistanceKm = 0;

    for (let i = 0; i < validPath.length - 1; i++) {
        const segmentDistanceKm = haversineDistanceKm(validPath[i], validPath[i + 1]);
        segmentLengths.push(segmentDistanceKm);
        totalDistanceKm += segmentDistanceKm;
    }

    if (totalDistanceKm === 0) {
        markerState.marker.setLatLng(validPath[validPath.length - 1]);

        if (onComplete) {
            onComplete();
        }

        return;
    }

    const startTime = performance.now();

    function step(now) {
        const rawProgress = Math.min((now - startTime) / durationMs, 1);
        const progress = easeInOut(rawProgress);
        const targetDistanceKm = totalDistanceKm * progress;

        let accumulatedDistanceKm = 0;
        let segmentIndex = 0;

        while (
            segmentIndex < segmentLengths.length - 1 &&
            accumulatedDistanceKm + segmentLengths[segmentIndex] < targetDistanceKm
        ) {
            accumulatedDistanceKm += segmentLengths[segmentIndex];
            segmentIndex += 1;
        }

        const segmentStart = validPath[segmentIndex];
        const segmentEnd = validPath[segmentIndex + 1] || validPath[validPath.length - 1];
        const segmentDistanceKm = segmentLengths[segmentIndex] || 0;

        let segmentProgress = 0;

        if (segmentDistanceKm > 0) {
            segmentProgress = (targetDistanceKm - accumulatedDistanceKm) / segmentDistanceKm;
        }

        segmentProgress = Math.max(0, Math.min(segmentProgress, 1));

        const lat = segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * segmentProgress;
        const lon = segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * segmentProgress;

        markerState.marker.setLatLng([lat, lon]);

        if (rawProgress < 1) {
            requestAnimationFrame(step);
        } else {
            const finalPoint = validPath[validPath.length - 1];
            markerState.marker.setLatLng(finalPoint);
            markerState.currentLatLng = finalPoint;

            if (onComplete) {
                onComplete();
            }
        }
    }

    requestAnimationFrame(step);
}

function removeMissingMarkers(seenVehicleIds) {
    for (const [vehicleId, markerState] of busMarkers.entries()) {
        if (!seenVehicleIds.has(vehicleId)) {
            map.removeLayer(markerState.marker);
            busMarkers.delete(vehicleId);
        }
    }
}

async function startPlaybackMode() {
    isPlaybackMode = true;

    if (liveTimer) {
        clearInterval(liveTimer);
        liveTimer = null;
    }

    if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
    }

    clearAllMarkers();

    const rows = await fetchPlaybackBuses();

    if (!rows.length) {
        updateStatus("Playback mode | No playback records found.");
        return;
    }

    const groupedFrames = groupRowsByTimestamp(rows);
    let frameIndex = 0;

    updateStatus(`Playback mode | Frames: ${groupedFrames.length} | Records: ${rows.length}`);

    renderBusFrame(groupedFrames[frameIndex], PLAYBACK_ANIMATION_DURATION_MS);
    updateStatus(`Playback mode | Frame ${frameIndex + 1} of ${groupedFrames.length} | ${groupedFrames[frameIndex].timestamp}`);
    frameIndex += 1;

    playbackTimer = setInterval(() => {
        if (!isPlaybackMode) {
            clearInterval(playbackTimer);
            playbackTimer = null;
            return;
        }

        if (frameIndex >= groupedFrames.length) {
            clearInterval(playbackTimer);
            playbackTimer = null;
            updateStatus("Playback finished.");
            return;
        }

        const frame = groupedFrames[frameIndex];

        renderBusFrame(frame, PLAYBACK_ANIMATION_DURATION_MS);
        updateStatus(`Playback mode | Frame ${frameIndex + 1} of ${groupedFrames.length} | ${frame.timestamp}`);

        frameIndex += 1;
    }, PLAYBACK_FRAME_MS);
}

function renderBusFrame(frame, animationDurationMs) {
    frame.rows.forEach(row => {
        const bus = {
            ...row,
            vehicle_timestamp: row.timestamp
        };

        if (isValidBusPosition(bus)) {
            upsertBusMarker(bus, animationDurationMs);
        }
    });
}

function groupRowsByTimestamp(rows) {
    const groups = new Map();

    rows.forEach(row => {
        const timestamp = row.timestamp || row.vehicle_timestamp || "unknown";

        if (!groups.has(timestamp)) {
            groups.set(timestamp, []);
        }

        groups.get(timestamp).push(row);
    });

    return Array.from(groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([timestamp, groupRows]) => ({
            timestamp: timestamp,
            rows: groupRows
        }));
}

function buildPopupHtml(bus) {
    return `
        <b>Mode:</b> Bus movement<br>
        <b>Vehicle:</b> ${safeValue(bus.vehicle_id)}<br>
        <b>Route:</b> ${safeValue(bus.route_id)}<br>
        <b>Trip:</b> ${safeValue(bus.trip_id)}<br>
        <b>Shape:</b> ${safeValue(bus.shape_id)}<br>
        <b>Snap distance:</b> ${safeValue(bus.snap_distance_m)} m<br>
        <b>Speed:</b> ${safeValue(bus.speed)}<br>
        <b>Bearing:</b> ${safeValue(bus.bearing)}<br>
        <b>Occupancy:</b> ${safeValue(bus.occupancy_status)}<br>
        <b>Timestamp:</b> ${safeValue(bus.vehicle_timestamp || bus.timestamp)}
    `;
}

function showBusDetails(bus) {
    document.getElementById("detailsBox").innerHTML = buildPopupHtml(bus);
}

function safeValue(value) {
    if (value === undefined || value === null || value === "") {
        return "-";
    }

    return value;
}

function clearAllMarkers() {
    for (const [, markerState] of busMarkers.entries()) {
        map.removeLayer(markerState.marker);
    }

    busMarkers.clear();

    updateStatus("Map cleared.");
}

function updateStatus(message) {
    document.getElementById("statusBox").innerText = message;
}

initMap();
