# Etapa 1: Construcción
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copiamos archivos de dependencias
COPY go.mod ./
# Si tuvieras go.sum, lo copiarías aquí también
COPY go.sum ./

# Descargamos dependencias (pgx y otras)
RUN go mod download

COPY . .

# Compilamos el binario llamado 'server'
RUN go build -o server main.go

# Etapa 2: Ejecución (Imagen ligera)
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/server .

CMD ["./server"]