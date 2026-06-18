let metroMarkers = new Map();
let metroPlaybackTimer = null;

const METRO_PLAYBACK_FRAME_MS = 2500;
const METRO_PLAYBACK_ANIMATION_DURATION_MS = 2300;

const ENABLED_METRO_LINES = ["green", "orange"];

async function fetchMetroPlayback() {
    const response = await fetch("/api/metro-playback");
    const rows = await response.json();

    return rows.filter(row =>
        ENABLED_METRO_LINES.includes(row.line_key)
    );
}

async function fetchLiveMetro() {
    const response = await fetch("/api/live-metro");
    const rows = await response.json();

    return rows.filter(row =>
        ENABLED_METRO_LINES.includes(row.line_key)
    );
}

function getMetroIcon(metro) {
    const lineColor = metro.line_color || "#111827";

    return L.divIcon({
        className: "metro-marker-wrapper",
        html: `
            <div class="metro-marker" style="background: ${lineColor};">
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

function isValidMetroPosition(metro) {
    return (
        metro &&
        metro.vehicle_id &&
        metro.lat !== undefined &&
        metro.lon !== undefined &&
        !Number.isNaN(Number(metro.lat)) &&
        !Number.isNaN(Number(metro.lon))
    );
}

function normalizeMetroPathPoints(metro) {
    if (!metro.path_points || !Array.isArray(metro.path_points)) {
        return [];
    }

    return metro.path_points
        .filter(point =>
            Array.isArray(point) &&
            point.length >= 2 &&
            !Number.isNaN(Number(point[0])) &&
            !Number.isNaN(Number(point[1]))
        )
        .map(point => [Number(point[0]), Number(point[1])]);
}

function upsertMetroMarker(metro) {
    const vehicleId = metro.vehicle_id;
    const targetLatLng = [Number(metro.lat), Number(metro.lon)];
    const pathPoints = normalizeMetroPathPoints(metro);

    if (!metroMarkers.has(vehicleId)) {
        const initialLatLng = pathPoints.length > 0 ? pathPoints[0] : targetLatLng;

        const marker = L.marker(initialLatLng, {
            icon: getMetroIcon(metro),
            zIndexOffset: 5000
        }).addTo(map);

        marker.bindPopup(buildMetroPopupHtml(metro));

        metroMarkers.set(vehicleId, {
            marker: marker,
            currentLatLng: initialLatLng,
            metro: metro
        });

        return;
    }

    const markerState = metroMarkers.get(vehicleId);

    markerState.marker.setIcon(getMetroIcon(metro));
    markerState.marker.bindPopup(buildMetroPopupHtml(metro));
    markerState.metro = metro;

    if (pathPoints.length >= 2) {
        animateMetroAlongPath(
            markerState,
            pathPoints,
            METRO_PLAYBACK_ANIMATION_DURATION_MS,
            () => {
                const finalPoint = pathPoints[pathPoints.length - 1];
                markerState.currentLatLng = finalPoint;
            }
        );

        return;
    }

    markerState.marker.setLatLng(targetLatLng);
    markerState.currentLatLng = targetLatLng;
}

function animateMetroAlongPath(markerState, pathPoints, durationMs, onComplete) {
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

function groupMetroRowsByTimestamp(rows) {
    const groups = new Map();

    rows.forEach(row => {
        const timestamp = row.timestamp || "unknown";

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

function renderMetroFrame(frame) {
    frame.rows.forEach(metro => {
        if (isValidMetroPosition(metro)) {
            upsertMetroMarker(metro);
        }
    });
}

async function startMetroPlayback() {
    clearMetroLayer();

    const rows = await fetchMetroPlayback();

    if (!rows.length) {
        updateMetroStatus("Metro playback | No green/orange records found.");
        return;
    }

    const groupedFrames = groupMetroRowsByTimestamp(rows);
    let frameIndex = 0;

    renderMetroFrame(groupedFrames[frameIndex]);
    updateMetroStatus(`Metro playback | Frame ${frameIndex + 1} of ${groupedFrames.length}`);
    frameIndex += 1;

    metroPlaybackTimer = setInterval(() => {
        if (frameIndex >= groupedFrames.length) {
            clearInterval(metroPlaybackTimer);
            metroPlaybackTimer = null;
            updateMetroStatus("Metro playback finished.");
            return;
        }

        const frame = groupedFrames[frameIndex];

        renderMetroFrame(frame);
        updateMetroStatus(`Metro playback | Frame ${frameIndex + 1} of ${groupedFrames.length}`);

        frameIndex += 1;
    }, METRO_PLAYBACK_FRAME_MS);
}

async function startMetroLive() {
    clearMetroLayer();

    const rows = await fetchLiveMetro();

    rows.forEach(metro => {
        if (isValidMetroPosition(metro)) {
            upsertMetroMarker(metro);
        }
    });

    updateMetroStatus(`Metro live estimated | Green/Orange trains displayed: ${rows.length}`);
}

function clearMetroLayer() {
    if (metroPlaybackTimer) {
        clearInterval(metroPlaybackTimer);
        metroPlaybackTimer = null;
    }

    for (const [, markerState] of metroMarkers.entries()) {
        map.removeLayer(markerState.marker);
    }

    metroMarkers.clear();
}

function buildMetroPopupHtml(metro) {
    return `
        <b>Mode:</b> Metro estimated movement<br>
        <b>Line:</b> ${safeValue(metro.line_name)}<br>
        <b>Vehicle:</b> ${safeValue(metro.vehicle_id)}<br>
        <b>Route:</b> ${safeValue(metro.route_id)}<br>
        <b>Direction:</b> ${safeValue(metro.direction_id)}<br>
        <b>Train:</b> ${safeValue(metro.train_number)}<br>
        <b>Shape:</b> ${safeValue(metro.shape_id)}<br>
        <b>Timestamp:</b> ${safeValue(metro.timestamp)}<br>
        <b>Source:</b> ${safeValue(metro.source)}
    `;
}

function updateMetroStatus(message) {
    const statusBox = document.getElementById("statusBox");

    if (statusBox) {
        statusBox.innerText = message;
    }

    console.log(message);
}

function initializeMetroLayer() {
    const playbackBtn = document.getElementById("playbackBtn");
    const liveBtn = document.getElementById("liveBtn");
    const clearBtn = document.getElementById("clearBtn");

    if (playbackBtn) {
        playbackBtn.addEventListener("click", startMetroPlayback);
    }

    if (liveBtn) {
        liveBtn.addEventListener("click", startMetroLive);
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", clearMetroLayer);
    }
}

window.startMetroPlayback = startMetroPlayback;
window.startMetroLive = startMetroLive;
window.clearMetroLayer = clearMetroLayer;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeMetroLayer);
} else {
    initializeMetroLayer();
}
