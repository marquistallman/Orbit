import json
import os
import re
from datetime import datetime, timezone
from threading import Lock
from urllib.parse import quote_plus
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Mini Maps Interactive Service")

OUTPUT_DIR = os.getenv("OUTPUT_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "output"))
DEFAULT_CENTER_LAT = float(os.getenv("DEFAULT_CENTER_LAT", "4.6373"))
DEFAULT_CENTER_LNG = float(os.getenv("DEFAULT_CENTER_LNG", "-74.0840"))
DEFAULT_ZOOM = int(os.getenv("DEFAULT_ZOOM", "16"))
DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "anonymous")
CLEANUP_LEGACY_HTML = os.getenv("CLEANUP_LEGACY_HTML", "true").strip().lower() in {"1", "true", "yes", "on"}

os.makedirs(OUTPUT_DIR, exist_ok=True)

POINTS_LOCK = Lock()


class MapPoint(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    color: str = Field(pattern=r"^#([0-9a-fA-F]{6})$")
    radius: int = Field(default=12, ge=4, le=40)
    created_at: str = Field(...)


class CreatePointRequest(BaseModel):
    name: str = Field(default="", max_length=80)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    color: str = Field(default="#ff4d4f", pattern=r"^#([0-9a-fA-F]{6})$")
    radius: int = Field(default=12, ge=4, le=40)


class UpdatePointRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    color: str = Field(..., pattern=r"^#([0-9a-fA-F]{6})$")
    radius: int = Field(..., ge=4, le=40)


class UpdateColorRequest(BaseModel):
    color: str = Field(..., pattern=r"^#([0-9a-fA-F]{6})$")


class LegacyMapPoint(BaseModel):
    name: str = Field(..., min_length=1)
    x: int = Field(..., ge=0, le=8)
    y: int = Field(..., ge=0, le=8)


class LegacyMiniMapRequest(BaseModel):
    title: str = Field(default="Mini Map")
    user_id: str | None = Field(default=None)
    points: list[LegacyMapPoint] = Field(default_factory=list)


def _safe_user_id(user_id: str | None) -> str:
    raw = (user_id or "").strip() or DEFAULT_USER_ID
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "_", raw)
    return cleaned[:80] or DEFAULT_USER_ID


def _points_file(user_id: str) -> str:
    return os.path.join(OUTPUT_DIR, f"points_{_safe_user_id(user_id)}.json")


def _read_points(user_id: str) -> list[MapPoint]:
    file_path = _points_file(user_id)
    if not os.path.exists(file_path):
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        raw_points = json.load(f)

    return [MapPoint(**item) for item in raw_points]


def _write_points(user_id: str, points: list[MapPoint]) -> None:
    with open(_points_file(user_id), "w", encoding="utf-8") as f:
        json.dump([point.model_dump() for point in points], f, ensure_ascii=True, indent=2)


def _build_grid(points: list[LegacyMapPoint]) -> list[str]:
    grid = [["." for _ in range(9)] for _ in range(9)]
    for idx, point in enumerate(points):
        marker = chr(ord("A") + (idx % 26))
        grid[point.y][point.x] = marker
    return [" ".join(row) for row in grid]


def _cleanup_legacy_html_files() -> int:
    if not os.path.isdir(OUTPUT_DIR):
        return 0

    removed = 0
    for name in os.listdir(OUTPUT_DIR):
        lower_name = name.lower()
        if lower_name == "ruta_demo.html" or (lower_name.startswith("ruta_") and lower_name.endswith(".html")):
            file_path = os.path.join(OUTPUT_DIR, name)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                    removed += 1
                except OSError:
                    # Ignore cleanup failures to avoid blocking service startup.
                    pass
    return removed


@app.on_event("startup")
def _startup_cleanup() -> None:
    if CLEANUP_LEGACY_HTML:
        _cleanup_legacy_html_files()


def _build_html() -> str:
    return f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mapa Interactivo Orbit</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        :root {{
            --panel-bg: rgba(24, 24, 24, 0.94);
            --panel-border: rgba(198, 161, 91, 0.34);
            --accent: #c6a15b;
            --accent-secondary: #8c6a3e;
            --text: #ede6d6;
            --text-muted: #b89b6c;
            --bg-soft: rgba(46, 64, 87, 0.22);
        }}

        * {{ box-sizing: border-box; }}

        body {{
            margin: 0;
            min-height: 100vh;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text);
            background: radial-gradient(circle at 12% 18%, #2b2318 0%, #1a1a1a 42%, #141414 100%);
        }}

        #map {{
            height: 100vh;
            width: 100%;
        }}

        .panel {{
            position: absolute;
            z-index: 1000;
            top: 18px;
            left: 18px;
            width: min(360px, calc(100vw - 36px));
            background: var(--panel-bg);
            border: 1px solid var(--panel-border);
            border-radius: 14px;
            padding: 14px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.38);
            backdrop-filter: blur(3px);
        }}

        .title {{
            margin: 0 0 10px;
            font-size: 18px;
            line-height: 1.2;
            color: var(--accent);
            letter-spacing: 0.4px;
        }}

        .subtitle {{
            margin: 0 0 12px;
            color: var(--text-muted);
            font-size: 13px;
        }}

        .controls {{
            display: grid;
            gap: 10px;
            grid-template-columns: 1fr 1fr;
            align-items: end;
        }}

        .control {{
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
        }}

        .control label {{
            font-weight: 600;
            color: var(--text-muted);
        }}

        .control input[type="text"],
        .control input[type="range"] {{
            width: 100%;
            border: 1px solid rgba(198, 161, 91, 0.26);
            border-radius: 8px;
            padding: 8px;
            background: rgba(16, 16, 16, 0.78);
            color: var(--text);
        }}

        .color-input {{
            width: 100%;
            border: 1px solid rgba(198, 161, 91, 0.26);
            border-radius: 8px;
            padding: 8px;
            background: rgba(16, 16, 16, 0.82);
            color: var(--text);
            font-size: 12px;
        }}

        .color-swatches {{
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 6px;
            margin-top: 6px;
        }}

        .swatch {{
            border: 1px solid rgba(198, 161, 91, 0.28);
            border-radius: 7px;
            height: 24px;
            background: var(--sw, #c6a15b);
            cursor: pointer;
            transition: transform 0.1s ease, box-shadow 0.12s ease;
        }}

        .swatch:hover {{
            transform: translateY(-1px);
        }}

        .swatch.active {{
            box-shadow: 0 0 0 2px rgba(198, 161, 91, 0.5);
        }}

        .control input[type="range"],
        .popup-form input[type="range"] {{
            -webkit-appearance: none;
            appearance: none;
            height: 9px;
            padding: 0;
            border-radius: 999px;
            border: 1px solid rgba(198, 161, 91, 0.26);
            background: rgba(8, 8, 8, 0.95);
        }}

        .control input[type="range"]::-webkit-slider-runnable-track,
        .popup-form input[type="range"]::-webkit-slider-runnable-track {{
            height: 9px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(140, 106, 62, 0.9), rgba(198, 161, 91, 0.95));
        }}

        .control input[type="range"]::-webkit-slider-thumb,
        .popup-form input[type="range"]::-webkit-slider-thumb {{
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            margin-top: -5px;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.55);
            background: #c6a15b;
            box-shadow: 0 0 0 1px rgba(198, 161, 91, 0.5);
            cursor: ew-resize;
        }}

        .control input[type="range"]::-moz-range-track,
        .popup-form input[type="range"]::-moz-range-track {{
            height: 9px;
            border-radius: 999px;
            border: 1px solid rgba(198, 161, 91, 0.26);
            background: linear-gradient(90deg, rgba(140, 106, 62, 0.9), rgba(198, 161, 91, 0.95));
        }}

        .control input[type="range"]::-moz-range-thumb,
        .popup-form input[type="range"]::-moz-range-thumb {{
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.55);
            background: #c6a15b;
            box-shadow: 0 0 0 1px rgba(198, 161, 91, 0.5);
            cursor: ew-resize;
        }}

        .hint {{
            margin: 10px 0 0;
            font-size: 12px;
            color: var(--text-muted);
            background: var(--bg-soft);
            border: 1px dashed rgba(198, 161, 91, 0.35);
            border-radius: 8px;
            padding: 8px;
        }}

        .stats {{
            margin-top: 10px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
        }}

        .popup-form {{
            display: grid;
            gap: 8px;
            min-width: 210px;
        }}

        .popup-form label {{
            display: grid;
            gap: 4px;
            font-size: 12px;
            color: var(--text-muted);
        }}

        .popup-form small {{
            color: var(--text-muted);
            opacity: 0.9;
        }}

        .popup-form input[type="text"],
        .popup-form input[type="range"] {{
            width: 100%;
            border: 1px solid rgba(198, 161, 91, 0.26);
            border-radius: 8px;
            padding: 8px;
            background: rgba(16, 16, 16, 0.82);
            color: var(--text);
        }}

        .popup-actions {{
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }}

        button {{
            border: 0;
            border-radius: 8px;
            padding: 7px 10px;
            font-weight: 600;
            cursor: pointer;
            color: #1d160c;
            background: var(--accent);
        }}

        button:hover {{
            background: #d7b46f;
        }}

        button.danger {{
            background: #a24444;
            color: #f5e9e9;
        }}

        button.danger:hover {{
            background: #b55252;
        }}

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {{
            background: rgba(24, 24, 24, 0.96);
            color: var(--text);
            border: 1px solid rgba(198, 161, 91, 0.28);
        }}

        .leaflet-container a {{
            color: var(--accent);
        }}

        .leaflet-bar a,
        .leaflet-bar a:hover {{
            background: rgba(24, 24, 24, 0.96);
            color: var(--accent);
            border-bottom-color: rgba(198, 161, 91, 0.24);
        }}

        .leaflet-bar {{
            border: 1px solid rgba(198, 161, 91, 0.28);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
        }}

        .leaflet-control-attribution {{
            background: rgba(24, 24, 24, 0.88) !important;
            color: var(--text-muted);
            border-top: 1px solid rgba(198, 161, 91, 0.2);
            border-left: 1px solid rgba(198, 161, 91, 0.2);
        }}

        @media (max-width: 700px) {{
            .controls {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <aside class="panel">
        <h1 class="title">Mapa Interactivo de Puntos</h1>
        <p class="subtitle">Haz clic en el mapa para crear un marcador circular con tu color preferido.</p>

        <div class="controls">
            <div class="control" style="grid-column: 1 / -1;">
                <label for="pointName">Nombre del punto</label>
                <input id="pointName" type="text" placeholder="Ejemplo: Zona de prueba" maxlength="80" />
            </div>

            <div class="control">
                <label for="pointColorHex">Color</label>
                <input id="pointColorHex" class="color-input" type="text" value="#ff4d4f" maxlength="7" />
                <div id="pointColorSwatches" class="color-swatches">
                    <button type="button" class="swatch" data-color="#ff4d4f" style="--sw:#ff4d4f"></button>
                    <button type="button" class="swatch" data-color="#f59e0b" style="--sw:#f59e0b"></button>
                    <button type="button" class="swatch" data-color="#c6a15b" style="--sw:#c6a15b"></button>
                    <button type="button" class="swatch" data-color="#22c55e" style="--sw:#22c55e"></button>
                    <button type="button" class="swatch" data-color="#06b6d4" style="--sw:#06b6d4"></button>
                    <button type="button" class="swatch" data-color="#3b82f6" style="--sw:#3b82f6"></button>
                    <button type="button" class="swatch" data-color="#8b5cf6" style="--sw:#8b5cf6"></button>
                    <button type="button" class="swatch" data-color="#f43f5e" style="--sw:#f43f5e"></button>
                    <button type="button" class="swatch" data-color="#eab308" style="--sw:#eab308"></button>
                    <button type="button" class="swatch" data-color="#14b8a6" style="--sw:#14b8a6"></button>
                    <button type="button" class="swatch" data-color="#a3e635" style="--sw:#a3e635"></button>
                    <button type="button" class="swatch" data-color="#fb7185" style="--sw:#fb7185"></button>
                </div>
            </div>

            <div class="control">
                <label for="pointRadius">Radio</label>
                <input id="pointRadius" type="range" min="4" max="40" value="12" />
            </div>
        </div>

        <p class="hint">
            Cada marcador se puede editar: abre su ventana para cambiar color o eliminarlo.
        </p>
        <div id="stats" class="stats">Marcadores: 0</div>
    </aside>

    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const map = L.map('map').setView([{DEFAULT_CENTER_LAT}, {DEFAULT_CENTER_LNG}], {DEFAULT_ZOOM});
        const queryParams = new URLSearchParams(window.location.search);
        const userId = queryParams.get('user_id') || '{DEFAULT_USER_ID}';
        const pointNameInput = document.getElementById('pointName');
        const HEX_COLOR_RE = /^#([0-9a-fA-F]{{6}})$/;
        const pointColorInput = document.getElementById('pointColorHex');
        const pointColorSwatches = document.getElementById('pointColorSwatches');
        const pointRadiusInput = document.getElementById('pointRadius');
        const stats = document.getElementById('stats');

        const markerLayers = new Map();

        L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
            attribution: '&copy; OpenStreetMap contributors'
        }}).addTo(map);

        function normalizeColor(value, fallback = '#c6a15b') {{
            const normalized = (value || '').trim().toLowerCase();
            if (HEX_COLOR_RE.test(normalized)) return normalized;
            return fallback;
        }}

        function setActiveSwatch(container, color) {{
            if (!container) return;
            container.querySelectorAll('.swatch').forEach((button) => {{
                button.classList.toggle('active', button.dataset.color === color);
            }});
        }}

        function bindSwatches(container, input, onColorChange) {{
            if (!container || !input) return;

            container.querySelectorAll('.swatch').forEach((button) => {{
                button.addEventListener('click', () => {{
                    const nextColor = normalizeColor(button.dataset.color, '#c6a15b');
                    input.value = nextColor;
                    setActiveSwatch(container, nextColor);
                    if (onColorChange) onColorChange(nextColor);
                }});
            }});

            input.addEventListener('blur', () => {{
                input.value = normalizeColor(input.value, '#c6a15b');
                setActiveSwatch(container, input.value);
                if (onColorChange) onColorChange(input.value);
            }});
        }}

        pointColorInput.value = normalizeColor(pointColorInput.value, '#ff4d4f');
        setActiveSwatch(pointColorSwatches, pointColorInput.value);
        bindSwatches(pointColorSwatches, pointColorInput);

        function setStats() {{
            stats.textContent = `Marcadores: ${{markerLayers.size}}`;
        }}

        function buildApiUrl(path) {{
            const url = new URL(path, window.location.origin);
            url.searchParams.set('user_id', userId);
            return url.toString();
        }}

        async function api(url, options = {{}}) {{
            const response = await fetch(url, {{
                headers: {{ 'Content-Type': 'application/json' }},
                ...options,
            }});

            if (!response.ok) {{
                const message = await response.text();
                throw new Error(message || 'Error de red');
            }}

            if (response.status === 204) {{
                return null;
            }}
            return await response.json();
        }}

        function popupTemplate(point) {{
            return `
                <div class="popup-form">
                    <label>
                        Nombre
                        <input type="text" class="popup-name" value="${{point.name}}" maxlength="80" />
                    </label>
                    <small>Lat: ${{point.lat.toFixed(6)}} | Lng: ${{point.lng.toFixed(6)}}</small>
                    <label>
                        Color
                        <input type="text" class="popup-color-hex color-input" value="${{point.color}}" maxlength="7" />
                        <div class="color-swatches popup-swatches">
                            <button type="button" class="swatch" data-color="#ff4d4f" style="--sw:#ff4d4f"></button>
                            <button type="button" class="swatch" data-color="#f59e0b" style="--sw:#f59e0b"></button>
                            <button type="button" class="swatch" data-color="#c6a15b" style="--sw:#c6a15b"></button>
                            <button type="button" class="swatch" data-color="#22c55e" style="--sw:#22c55e"></button>
                            <button type="button" class="swatch" data-color="#06b6d4" style="--sw:#06b6d4"></button>
                            <button type="button" class="swatch" data-color="#3b82f6" style="--sw:#3b82f6"></button>
                            <button type="button" class="swatch" data-color="#8b5cf6" style="--sw:#8b5cf6"></button>
                            <button type="button" class="swatch" data-color="#f43f5e" style="--sw:#f43f5e"></button>
                            <button type="button" class="swatch" data-color="#eab308" style="--sw:#eab308"></button>
                            <button type="button" class="swatch" data-color="#14b8a6" style="--sw:#14b8a6"></button>
                            <button type="button" class="swatch" data-color="#a3e635" style="--sw:#a3e635"></button>
                            <button type="button" class="swatch" data-color="#fb7185" style="--sw:#fb7185"></button>
                        </div>
                    </label>
                    <label>
                        Radio
                        <input type="range" class="popup-radius" min="4" max="40" value="${{point.radius}}" />
                    </label>
                    <div class="popup-actions">
                        <button type="button" class="save-point">Guardar cambios</button>
                        <button type="button" class="danger remove-point">Eliminar</button>
                    </div>
                </div>
            `;
        }}

        function drawPoint(point) {{
            const marker = L.circleMarker([point.lat, point.lng], {{
                radius: point.radius,
                fillColor: point.color,
                color: '#8c6a3e',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.82,
            }}).addTo(map);

            marker.bindTooltip(point.name, {{ direction: 'top' }});
            marker.bindPopup(popupTemplate(point));
            markerLayers.set(point.id, marker);
            setStats();

            marker.on('popupopen', () => {{
                const popupElement = marker.getPopup().getElement();
                if (!popupElement) return;

                const nameInput = popupElement.querySelector('.popup-name');
                const colorInput = popupElement.querySelector('.popup-color-hex');
                const popupSwatches = popupElement.querySelector('.popup-swatches');
                const radiusInput = popupElement.querySelector('.popup-radius');
                const saveButton = popupElement.querySelector('.save-point');
                const removeButton = popupElement.querySelector('.remove-point');

                colorInput.value = normalizeColor(colorInput.value, point.color);
                setActiveSwatch(popupSwatches, colorInput.value);
                bindSwatches(popupSwatches, colorInput, (nextColor) => marker.setStyle({{ fillColor: nextColor }}));

                saveButton?.addEventListener('click', async () => {{
                    try {{
                        const updated = await api(buildApiUrl(`/api/points/${{point.id}}`), {{
                            method: 'PUT',
                            body: JSON.stringify({{
                                name: (nameInput.value || '').trim() || point.name,
                                color: normalizeColor(colorInput.value, point.color),
                                radius: Number(radiusInput.value),
                            }}),
                        }});

                        point.name = updated.name;
                        point.color = updated.color;
                        point.radius = updated.radius;
                        marker.setStyle({{ fillColor: updated.color, radius: updated.radius }});
                        marker.setTooltipContent(updated.name);
                        marker.setPopupContent(popupTemplate(updated));
                        marker.closePopup();
                    }} catch (error) {{
                        alert(`No se pudo actualizar el punto: ${{error.message}}`);
                    }}
                }});

                removeButton?.addEventListener('click', async () => {{
                    try {{
                        await api(buildApiUrl(`/api/points/${{point.id}}`), {{ method: 'DELETE' }});
                        marker.remove();
                        markerLayers.delete(point.id);
                        setStats();
                    }} catch (error) {{
                        alert(`No se pudo eliminar el punto: ${{error.message}}`);
                    }}
                }});
            }});
        }}

        async function loadPoints() {{
            const points = await api(buildApiUrl('/api/points'));
            points.forEach(drawPoint);
        }}

        map.on('click', async (event) => {{
            const payload = {{
                name: (pointNameInput.value || '').trim(),
                lat: event.latlng.lat,
                lng: event.latlng.lng,
                color: normalizeColor(pointColorInput.value, '#ff4d4f'),
                radius: Number(pointRadiusInput.value),
            }};

            try {{
                const point = await api(buildApiUrl('/api/points'), {{
                    method: 'POST',
                    body: JSON.stringify(payload),
                }});

                drawPoint(point);
            }} catch (error) {{
                alert(`No se pudo crear el marcador: ${{error.message}}`);
            }}
        }});

        loadPoints().catch((error) => {{
            alert(`No se pudieron cargar los puntos: ${{error.message}}`);
        }});
    </script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def home() -> str:
    return _build_html()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "interactive mini maps service running"}


@app.get("/api/points", response_model=list[MapPoint])
def list_points(user_id: str = Query(default=DEFAULT_USER_ID)) -> list[MapPoint]:
    with POINTS_LOCK:
        return _read_points(user_id)


@app.post("/api/points", response_model=MapPoint)
def create_point(request: CreatePointRequest, user_id: str = Query(default=DEFAULT_USER_ID)) -> MapPoint:
    with POINTS_LOCK:
        points = _read_points(user_id)

        point_name = request.name.strip() or f"Punto {len(points) + 1}"
        point = MapPoint(
            id=str(uuid4()),
            name=point_name,
            lat=request.lat,
            lng=request.lng,
            color=request.color,
            radius=request.radius,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        points.append(point)
        _write_points(user_id, points)
        return point


@app.put("/api/points/{point_id}", response_model=MapPoint)
def update_point(point_id: str, request: UpdatePointRequest, user_id: str = Query(default=DEFAULT_USER_ID)) -> MapPoint:
    cleaned_name = request.name.strip()
    if not cleaned_name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    with POINTS_LOCK:
        points = _read_points(user_id)
        for idx, point in enumerate(points):
            if point.id == point_id:
                updated = point.model_copy(
                    update={
                        "name": cleaned_name,
                        "color": request.color,
                        "radius": request.radius,
                    }
                )
                points[idx] = updated
                _write_points(user_id, points)
                return updated

    raise HTTPException(status_code=404, detail="Point not found")


@app.put("/api/points/{point_id}/color", response_model=MapPoint)
def update_point_color(point_id: str, request: UpdateColorRequest, user_id: str = Query(default=DEFAULT_USER_ID)) -> MapPoint:
    with POINTS_LOCK:
        points = _read_points(user_id)
        for idx, point in enumerate(points):
            if point.id == point_id:
                updated_point = point.model_copy(update={"color": request.color})
                points[idx] = updated_point
                _write_points(user_id, points)
                return updated_point

    raise HTTPException(status_code=404, detail="Point not found")


@app.delete("/api/points/{point_id}", status_code=204)
def delete_point(point_id: str, user_id: str = Query(default=DEFAULT_USER_ID)) -> None:
    with POINTS_LOCK:
        points = _read_points(user_id)
        filtered = [point for point in points if point.id != point_id]

        if len(filtered) == len(points):
            raise HTTPException(status_code=404, detail="Point not found")

        _write_points(user_id, filtered)


@app.post("/map")
def create_mini_map_legacy(data: LegacyMiniMapRequest) -> dict[str, object]:
    user_id = _safe_user_id(data.user_id)
    palette = ["#ff4d4f", "#3b82f6", "#14b8a6", "#eab308", "#8b5cf6", "#f97316"]
    legends: list[dict[str, object]] = []

    with POINTS_LOCK:
        points: list[MapPoint] = []
        for idx, legacy_point in enumerate(data.points):
            marker = chr(ord("A") + (idx % 26))
            legends.append({
                "marker": marker,
                "name": legacy_point.name,
                "x": legacy_point.x,
                "y": legacy_point.y,
            })
            points.append(
                MapPoint(
                    id=str(uuid4()),
                    name=legacy_point.name,
                    lat=float(legacy_point.y),
                    lng=float(legacy_point.x),
                    color=palette[idx % len(palette)],
                    radius=12,
                    created_at=datetime.now(timezone.utc).isoformat(),
                )
            )

        _write_points(user_id, points)

    return {
        "title": data.title,
        "grid_size": "9x9",
        "point_count": len(data.points),
        "map_lines": _build_grid(data.points),
        "legend": legends,
        "interactive_map_url": f"/?user_id={quote_plus(user_id)}",
        "user_id": user_id,
    }
