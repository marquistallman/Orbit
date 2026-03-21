package com.authorizedact.auth_service.infrastructure.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        // Permitir que Spring Security maneje sus propias excepciones (AccessDenied, AuthException)
        if (ex instanceof org.springframework.security.access.AccessDeniedException || 
            ex instanceof org.springframework.security.core.AuthenticationException) {
            throw ex;
        }
        // Imprimimos el error en consola para depurar
        ex.printStackTrace();
        // Usamos 500 para errores de servidor o lógica inesperada, para no confundir con fallos de autenticación
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", ex.getMessage()));
    }
}