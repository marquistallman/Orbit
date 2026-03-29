# Auth Service

This service is responsible for user authentication and management.

## Running the service

To run the service, you can use the following Maven command:

```bash
mvn spring-boot:run
```

The service will be available at `http://localhost:8080` when started with `mvn spring-boot:run`.

If started via the root `docker-compose.yml`, it is exposed on `http://localhost:8081` (host `8081` -> container `8080`).

## API Documentation

### Register a new user

Creates a new user in the system.

-   **URL:** `/api/auth/register`
-   **Method:** `POST`
-   **Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
    "email": "user@example.com",
    "username": "myusername",
    "password": "mypassword"
}
```

**Success Response (200 OK):**

Returns the created user object.

```json
{
    "id": "c6a7e0e4-3b2a-4d1e-9d8f-9a8b7c6d5e4f",
    "email": "user@example.com",
    "username": "myusername",
    "password": "[PROTECTED]",
    "isActive": true,
    "createdAt": "2026-03-12T20:30:00.000000",
    "updatedAt": "2026-03-12T20:30:00.000000"
}
```

**Error Response (500 Internal Server Error):**

If the email already exists.

```json
{
    "timestamp": "2026-03-12T20:31:00.000+00:00",
    "status": 500,
    "error": "Internal Server Error",
    "message": "Email already exists",
    "path": "/api/auth/register"
}
```

---

### Login

Authenticates a user and returns a token.

-   **URL:** `/api/auth/login`
-   **Method:** `POST`
-   **Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
    "email": "user@example.com",
    "password": "mypassword"
}
```

**Success Response (200 OK):**

Returns a success message. (Note: This will be replaced with a JWT token in the future).

```
Login successful
```

**Error Response (500 Internal Server Error):**

If the user is not found or the password is invalid.

```json
{
    "timestamp": "2026-03-12T20:32:00.000+00:00",
    "status": 500,
    "error": "Internal Server Error",
    "message": "User not found",
    "path": "/api/auth/login"
}
```
