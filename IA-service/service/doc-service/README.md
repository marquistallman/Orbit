# doc-service

Microservicio para crear, editar y descargar documentos Word/PDF.

## Puerto

- Contenedor: `9002`

## Variables de entorno

- `OUTPUT_DIR` (opcional): ruta de salida para archivos generados.
  - Default: `./output` dentro del contenedor/proyecto.

## Endpoints

### `GET /`
Health check.

Response ejemplo:

```json
{
  "status": "doc service running",
  "output_dir": "/data"
}
```

### `POST /edit`
Crea documentos nuevos en formato Word/PDF.

Request:

```json
{
  "title": "Reporte Q1",
  "content": "Resumen ejecutivo...",
  "format": "both"
}
```

`format` soportado: `docx`, `word`, `pdf`, `both`.

Response ejemplo:

```json
{
  "message": "Document created",
  "files": ["/data/Reporte_Q1.docx", "/data/Reporte_Q1.pdf"],
  "file_names": ["Reporte_Q1.docx", "Reporte_Q1.pdf"],
  "format": "both"
}
```

### `POST /apply-changes`
Aplica cambios a un documento existente.

Request:

```json
{
  "file_name": "Reporte_Q1.docx",
  "replacements": {
    "Q1": "Q2"
  },
  "append_text": "Nota final generada por IA"
}
```

Comportamiento:

- Para `.docx`: reemplaza texto en párrafos y agrega `append_text` al final.
- Para `.pdf`: genera una revisión PDF nueva basada en `append_text` y `replacements`.

Response ejemplo:

```json
{
  "message": "Document edited",
  "source_file": "Reporte_Q1.docx",
  "file_name": "Reporte_Q1_edited.docx",
  "file_path": "/data/Reporte_Q1_edited.docx"
}
```

### `GET /files/{file_name}`
Descarga un archivo generado.

- `404` si no existe.

## Ejecución local

```bash
uvicorn main:app --host 0.0.0.0 --port 9002
```

## Dependencias

- FastAPI
- python-docx
- reportlab
