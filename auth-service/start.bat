@echo off
for /f "tokens=1,* delims==" %%a in (.env) do set %%a=%%b
.\mvnw spring-boot:run
