# IA Service

Este es el servicio de IA para el proyecto Orbit, construido con FastAPI. Proporciona una API para interactuar con un agente de IA que puede ejecutar tareas y usar herramientas.

## Requisitos

- Docker y Docker Compose

## Ejecución con Docker

1. Asegúrate de tener Docker instalado y corriendo.

2. Crea un archivo `.env` en la raíz del proyecto con tu clave de API:
   ```
   OPENROUTER_API_KEY=tu_clave_aqui
   ```

3. Ejecuta el servicio:
   ```
   docker-compose up --build
   ```

El servidor estará disponible en http://localhost:8000

Para desarrollo con recarga automática:
```
docker-compose up --build
```

## Ejecución sin Docker (Entorno Virtual)

Si prefieres ejecutar sin Docker:

### Requisitos

- Python 3.11.9
- Virtual environment

### Instalación

1. Clona el repositorio y navega a la carpeta IA-service:
   ```
   cd Orbit/IA-service
   ```

2. Crea un entorno virtual con Python 3.11.9:
   ```
   py -3.11 -m venv venv
   ```

3. Activa el entorno virtual:
   - En Windows: `.\venv\Scripts\Activate.ps1`
   - En Linux/Mac: `source venv/bin/activate`

4. Instala las dependencias:
   ```
   pip install -r requirments.txt
   ```

### Ejecución

Para ejecutar el servidor de desarrollo:

```
uvicorn main:app --reload --port 8000
```

El servidor estará disponible en http://localhost:8000

## Documentación de la API

La documentación interactiva de la API está disponible en http://localhost:8000/docs

### Endpoints principales

- `GET /`: Verificación de salud del servicio
- `POST /agent/run`: Ejecuta una tarea con el agente de IA
- `GET /agent/tools`: Lista las herramientas disponibles

## Estructura del proyecto

- `main.py`: Punto de entrada de la aplicación FastAPI
- `routes/agent_routes.py`: Rutas de la API para el agente
- `agents/agent.py`: Lógica del agente de IA
- `ai/model_client.py`: Cliente para interactuar con el modelo de IA
- `tools/`: Módulos para herramientas que el agente puede usar
- `auth/`: Módulos de autenticación