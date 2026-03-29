# IA-service / service

Indice de microservicios implementados.

## Microservicios

- [doc-service](doc-service/README.md): Word/PDF (crear, editar, descargar)
- [excel-service](excel-service/README.md): Excel (crear, analizar, exportar a Word)
- [code-service](code-service/README.md): ejecución liviana de código (python/sql) con límites
- [mini-maps-service](mini-maps-service/README.md): mapas por coordenadas con salida interactiva

## Notas de operación

- Todos los servicios están orquestados desde `docker-compose.yml` en la raíz del repositorio.
- Los puertos esperados actualmente son:
  - `9002` doc-service
  - `9003` code-service
  - `9004` excel-service
  - `9005` mini-maps-service
- Las rutas y payloads exactos están documentados dentro de cada README individual.
