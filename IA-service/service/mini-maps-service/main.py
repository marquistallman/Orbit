import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI()
OUTPUT_DIR = os.getenv("OUTPUT_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "output"))
os.makedirs(OUTPUT_DIR, exist_ok=True)


class MapPoint(BaseModel):
    name: str = Field(..., min_length=1)
    x: int = Field(..., ge=0, le=8)
    y: int = Field(..., ge=0, le=8)


class MiniMapRequest(BaseModel):
    title: str = Field(default="Mini Map")
    points: list[MapPoint] = Field(default_factory=list)


@app.get("/")
def health():
    return {"status": "mini maps service running", "grid": "9x9", "output_dir": OUTPUT_DIR}


@app.get("/files/{file_name}")
def download_file(file_name: str):
    file_path = os.path.join(OUTPUT_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, filename=file_name)


def _build_grid(points: list[MapPoint]) -> list[str]:
    grid = [["." for _ in range(9)] for _ in range(9)]

    for idx, point in enumerate(points):
        marker = chr(ord("A") + (idx % 26))
        grid[point.y][point.x] = marker

    return [" ".join(row) for row in grid]


@app.post("/map")
def create_mini_map(data: MiniMapRequest):
    folium = __import__("folium")

    legends = []
    for idx, point in enumerate(data.points):
        marker = chr(ord("A") + (idx % 26))
        legends.append({
            "marker": marker,
            "name": point.name,
            "x": point.x,
            "y": point.y,
        })

    center_lat = 0.0
    center_lng = 0.0
    if data.points:
        center_lat = sum((p.y for p in data.points)) / len(data.points)
        center_lng = sum((p.x for p in data.points)) / len(data.points)

    map_obj = folium.Map(location=[center_lat, center_lng], zoom_start=3)
    for idx, p in enumerate(data.points):
        marker = chr(ord("A") + (idx % 26))
        folium.Marker(
            location=[p.y, p.x],
            popup=f"{marker} - {p.name}",
            tooltip=p.name,
        ).add_to(map_obj)

    safe_title = "".join(ch for ch in data.title if ch.isalnum() or ch in (" ", "-", "_")).strip().replace(" ", "_") or "mini_map"
    html_name = f"{safe_title}.html"
    html_path = os.path.join(OUTPUT_DIR, html_name)
    map_obj.save(html_path)

    return {
        "title": data.title,
        "grid_size": "9x9",
        "point_count": len(data.points),
        "map_lines": _build_grid(data.points),
        "legend": legends,
        "interactive_map_file": html_name,
        "interactive_map_path": html_path,
    }
