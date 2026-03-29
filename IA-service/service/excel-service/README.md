# excel-service

Microservicio para crear, analizar y transformar archivos Excel orientados a análisis de datos.

## Puerto

- Contenedor: `9004`

## Variables de entorno

- `OUTPUT_DIR` (opcional): ruta de salida para archivos generados.
  - Default: `./output`.

## Endpoints

### `GET /`
Health check.

### `POST /edit`
Crea un workbook `.xlsx`.

Request:

```json
{
  "title": "KPI_Q1",
  "sheets": [
    {
      "name": "Resumen",
      "rows": [
        ["KPI", "Valor"],
        ["Ventas", 120000],
        ["Costos", 45000]
      ]
    }
  ]
}
```

Response ejemplo:

```json
{
  "message": "Workbook created",
  "file_path": "/data/KPI_Q1.xlsx",
  "file_name": "KPI_Q1.xlsx",
  "sheet_count": 1,
  "sheets": ["Resumen"]
}
```

### `POST /analyze`
Analiza un archivo Excel existente y devuelve métricas por hoja.

Request:

```json
{
  "file_name": "KPI_Q1.xlsx"
}
```

Response ejemplo:

```json
{
  "file_name": "KPI_Q1.xlsx",
  "sheet_count": 1,
  "summary": [
    {
      "sheet": "Resumen",
      "rows": 3,
      "columns": 2,
      "numeric_cells": 2,
      "numeric_sum": 165000.0
    }
  ]
}
```

### `POST /to-word`
Convierte contenido de Excel a un reporte Word (`.docx`).

Request:

```json
{
  "file_name": "KPI_Q1.xlsx",
  "title": "Reporte Excel Q1"
}
```

Response ejemplo:

```json
{
  "message": "Word report generated from Excel",
  "source_file": "KPI_Q1.xlsx",
  "file_name": "KPI_Q1_report.docx",
  "file_path": "/data/KPI_Q1_report.docx"
}
```

### `GET /files/{file_name}`
Descarga un archivo generado (xlsx o docx).

## Ejecución local

```bash
uvicorn main:app --host 0.0.0.0 --port 9004
```

## Dependencias

- FastAPI
- openpyxl
- python-docx
