# 🔗 API Reference

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

- All protected endpoints require a JWT token:

```
Authorization: Bearer <token>
```

---

## Endpoints Overview

| Resource      | Method | Endpoint                        | Description                |
|---------------|--------|---------------------------------|----------------------------|
| Auth          | POST   | /auth/login                     | User login                 |
| Auth          | POST   | /auth/register                  | User registration          |
| Drivers       | GET    | /drivers                        | List all drivers           |
| Drivers       | GET    | /drivers/:id                    | Get driver by ID           |
| Drivers       | POST   | /drivers                        | Create driver (admin)      |
| Trucks        | GET    | /trucks                         | List all trucks            |
| Trucks        | GET    | /trucks/:id                     | Get truck by ID            |
| Trucks        | POST   | /trucks                         | Create truck (admin)       |
| Tracking      | GET    | /tracking                       | Get tracking history       |
| Tracking      | POST   | /tracking                       | Submit GPS coordinates     |
| Alerts        | GET    | /alerts                         | List all alerts            |
| Alerts        | POST   | /alerts                         | Create alert (admin)       |
| Shops         | GET    | /shops                          | List all shops             |
| Shops         | POST   | /shops                          | Create shop (admin)        |
| Health        | GET    | /health                         | Health check               |
| Metrics       | GET    | /metrics                        | Prometheus metrics         |

---

## Example: Authentication

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "<jwt-token>",
  "data": { "user": { "id": 1, "username": "admin", "role": "admin" } }
}
```

---

## Example: Get All Trucks

```http
GET /api/v1/trucks
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "success",
  "results": 2,
  "data": [
    { "id": 1, "plate_number": "ABC-123", ... },
    { "id": 2, "plate_number": "XYZ-789", ... }
  ]
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

**For full details, see the [root README](../README.md) and [docs/](./)**
