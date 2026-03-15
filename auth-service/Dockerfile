# Etapa 1: Construcción (Build)
# Usamos una imagen de Maven con JDK 17 para compilar el proyecto
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copiamos primero el archivo de dependencias para aprovechar la caché de Docker
COPY pom.xml .
# Descargamos las dependencias (esto se guarda en caché si no cambia el pom.xml)
RUN mvn dependency:go-offline

# Copiamos el código fuente y compilamos
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Ejecución (Runtime)
# Usamos una imagen ligera de JRE (solo lo necesario para correr Java)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copiamos solo el JAR construido desde la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Comando para iniciar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]