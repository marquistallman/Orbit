# Orbit IA - Perfiles de Costos y Planes

Este documento define una propuesta de planes para controlar costos de LLM/memoria y escalar Orbit de forma sostenible.

## Objetivo

- Permitir una version gratuita para adquisicion.
- Controlar consumo por usuario sin degradar la experiencia.
- Tener reglas simples para evolucionar a planes pagos.

## Supuestos de costos

El costo dominante viene del uso del modelo (tokens), no de SQLite.

Formula mensual por usuario:

Costo LLM ~= (tokens_entrada / 1000) * P_in + (tokens_salida / 1000) * P_out

Donde:
- `P_in`: precio por 1K tokens de entrada del modelo elegido.
- `P_out`: precio por 1K tokens de salida del modelo elegido.

## Planes propuestos

## 1) Free

Objetivo:
- Captacion y prueba sin friccion.

Limites por usuario/mes:
- Prompts: 80
- Input tokens: 120,000
- Output tokens: 60,000
- Contexto de memoria por prompt: maximo 6 hechos

Memoria:
- Maximo 30 hechos por usuario
- Retencion: 30 dias
- Sin pinning manual

Tools:
- Permitido: `agent/run`, `agent/select-tool`, lectura basica
- Limitado: `code_run` (maximo 10 ejecuciones/mes)
- Restringido: operaciones pesadas en lote

Rate limit:
- 8 req/min por usuario
- Burst: 3

SLA:
- Best effort (sin prioridad de cola)

Precio:
- 0 USD

## 2) Lite

Objetivo:
- Uso individual frecuente.

Limites por usuario/mes:
- Prompts: 300
- Tokens promedio/prompt: 1,700 (1200 entrada + 500 salida)
- Presupuesto tokens/mes: 510,000

Memoria:
- Maximo 80 hechos
- Contexto inyectado: hasta 10 hechos
- Retencion: 60 dias

## 3) Standard

Objetivo:
- Profesionales y equipos pequenos.

Limites por usuario/mes:
- Prompts: 1,500
- Tokens promedio/prompt: 2,500 (1800 entrada + 700 salida)
- Presupuesto tokens/mes: 3,750,000

Memoria:
- Maximo 250 hechos
- Contexto inyectado: hasta 20 hechos
- Retencion: 180 dias
- Compactacion semanal

## 4) Pro

Objetivo:
- Power users y operaciones intensivas.

Limites por usuario/mes:
- Prompts: 6,000
- Tokens promedio/prompt: 3,200 (2200 entrada + 1000 salida)
- Presupuesto tokens/mes: 19,200,000

Memoria:
- Maximo 800 hechos
- Contexto inyectado: hasta 35 hechos
- Retencion: 365 dias
- Compactacion + pinning de hechos criticos

## Controles de costo recomendados

1. Hard cap mensual por usuario y por workspace.
2. Alertas de consumo al 80%, 90% y 100%.
3. Degradacion automatica cerca del limite:
- reducir `max_tokens`
- usar modelo mas economico
- limitar herramientas de mayor costo
4. Tope de salida por respuesta segun plan.
5. Limite de hechos de memoria inyectados por prompt.
6. Deduplicacion y expiracion de memoria poco usada.

## Anti-abuso para Free

1. Verificacion de email.
2. Limite de cuentas gratuitas por identidad.
3. Caps estrictos de prompts/tokens.
4. Cooldown por exceso reiterado de rate limit.
5. Restricciones para patrones de automatizacion masiva.

## UX recomendada al llegar a limites

1. Mensaje claro:
- "Alcanzaste el limite del plan Free."
2. Mostrar consumo:
- prompts usados/restantes
- tokens de entrada/salida usados
3. Mostrar fecha de reinicio de ciclo.
4. CTA de upgrade a Lite/Standard.

## Recomendacion de lanzamiento

1. Lanzar con Free + Lite + Standard.
2. Habilitar Pro gradualmente con usuarios de alto uso.
3. Medir 30 dias:
- conversion Free -> Lite
- costo promedio por usuario activo
- tasa de saturacion por limites

## Telemetria minima sugerida

Guardar por usuario y mes:
- prompts
- input_tokens
- output_tokens
- costo_estimado
- plan_actual
- bloqueos_por_limite

Con esto se puede ajustar pricing y limites sin adivinar.
