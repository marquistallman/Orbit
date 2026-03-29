# mini-maps-service

Microservicio de mini mapas por coordenadas con salida rápida ASCII y mapa interactivo HTML.

## Puerto

- Contenedor: `9005`

## Variables de entorno

- `OUTPUT_DIR` (opcional): ruta de salida para mapas HTML generados.

## Endpoints

### `GET /`
Health check.

### `POST /map`
Genera un mini mapa a partir de puntos (x, y) y crea un archivo HTML interactivo.

Request:

```json
{
  "title": "Ruta Demo",
  "points": [
    {"name": "Casa", "x": 1, "y": 1},
    {"name": "Oficina", "x": 6, "y": 2},
    {"name": "Parque", "x": 4, "y": 6}
  ]
}
```

Rango válido de coordenadas para grid ASCII: `0..8` en `x` y `y`.

Response ejemplo:

```json
{
  "title": "Ruta Demo",
  "grid_size": "9x9",
  "point_count": 3,
  "map_lines": [". . . . . . . . .", "..."],
  "legend": [
    {"marker": "A", "name": "Casa", "x": 1, "y": 1}
  ],
  "interactive_map_file": "Ruta_Demo.html",
  "interactive_map_path": "/data/Ruta_Demo.html"
}
```

### `GET /files/{file_name}`
Descarga/abre el HTML del mapa interactivo.

## Ejecución local

```bash
uvicorn main:app --host 0.0.0.0 --port 9005
```

## Dependencias

- FastAPI
- folium
