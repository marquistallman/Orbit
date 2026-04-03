# Orbit

Plataforma multi-servicio para el asistente virtual Orbit.

## Servicios principales

- `frontend` (React + Vite): UI web en `http://localhost:5173`
- `auth-service` (Spring Boot): autenticacion y OAuth2 en `http://localhost:8081`
- `ia-service` (FastAPI): agente IA y herramientas en `http://localhost:5000`
- `prometheus` y `grafana`: observabilidad en `http://localhost:9090` y `http://localhost:3000`

## Arranque rapido

```bash
docker-compose up --build
```

## Cambios recientes (Seguridad Fase 2/3)

- Rate limiting distribuido con Redis en `ia-service`.
- Endurecimiento adaptativo temporal por patron de abuso (disminuye limite efectivo y aplica cooldowns progresivos).
- Headers de rate limit para clientes (`X-RateLimit-*` y `Retry-After` en 429).
- Observabilidad Prometheus en `ia-service` con metricas de throttling, razones de bloqueo, limite efectivo y eventos adaptativos.
- Reglas de alerta Prometheus agregadas en `prometheus-alerts.yml`.
- `auth-service` ajustado para permitir scrape de Actuator (`/actuator/prometheus` y `/actuator/health`) sin romper autenticacion de APIs.

## Impacto en frontend

No hay impacto funcional obligatorio en el frontend por estos cambios.

- No se cambiaron contratos de negocio usados por la UI.
- Solo se agrego infraestructura de seguridad/observabilidad en backend.
- Opcionalmente, frontend puede leer headers de rate limit para UX preventiva.

## Documentacion por servicio

- `IA-service/README.md`
- `auth-service/README.md`
- `frontend/README.md`
