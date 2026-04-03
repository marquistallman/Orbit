# mini-maps-service

Microservicio de mapa interactivo con Leaflet para crear marcadores circulares de puntos de interes.

## Lo que hace

- Renderiza un mapa interactivo en navegador.
- Permite crear puntos haciendo clic sobre el mapa.
- Cada punto se crea con color personalizado y radio configurable.
- Cada marcador se puede editar (nombre, color, radio) o eliminar desde su popup.
- Los puntos se guardan por usuario (`points_<user_id>.json`) para persistencia basica.

## Puerto

- Contenedor: `9005`

## Variables de entorno

- `OUTPUT_DIR` (opcional): carpeta donde se guarda `points.json`.
- `DEFAULT_CENTER_LAT` (opcional): latitud inicial del mapa.
- `DEFAULT_CENTER_LNG` (opcional): longitud inicial del mapa.
- `DEFAULT_ZOOM` (opcional): zoom inicial del mapa.

## Endpoints

### `GET /`
Devuelve la interfaz web del mapa interactivo.

Parámetro opcional:

- `user_id`: aísla los puntos por usuario. Ejemplo: `/?user_id=usuario_123`.

### `GET /health`
Health check JSON.

### `GET /api/points`
Lista puntos guardados.

### `POST /api/points`
Crea un punto nuevo.

Request ejemplo:

```json
{
  "name": "Zona de prueba",
  "lat": 4.6373,
  "lng": -74.0840,
  "color": "#22aa88",
  "radius": 14
}
```

### `PUT /api/points/{point_id}/color`
Actualiza el color de un marcador.

Request ejemplo:

```json
{
  "color": "#ff6b35"
}
```

### `DELETE /api/points/{point_id}`
Elimina un marcador.

### `PUT /api/points/{point_id}`
Actualiza nombre, color y radio de un marcador.

Request ejemplo:

```json
{
  "name": "Punto actualizado",
  "color": "#2e90fa",
  "radius": 20
}
```

### `POST /map` (compatibilidad)
Endpoint legado para integraciones existentes (ej. tool `mini_maps`).

- Recibe puntos en formato `x,y` (0..8).
- Sobrescribe el conjunto de puntos del `user_id` indicado (o `anonymous`).
- Devuelve `map_lines`, `legend` e `interactive_map_url`.

## Ejecucion local

```bash
uvicorn main:app --host 0.0.0.0 --port 9005
```

## Dependencias

- FastAPI
- pydantic
- uvicorn
