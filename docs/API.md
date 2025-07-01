# 🔗 API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require JWT token:
```
Authorization: Bearer <token>
```

## Endpoints

### 🔐 Authentication

#### POST /auth/login
**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 👥 Drivers

#### GET /drivers
Get all drivers (requires auth).

### 🚛 Trucks

#### GET /trucks
Get all trucks (requires auth).

### 📍 GPS Tracking

#### POST /tracking
Submit GPS coordinates (requires driver/admin auth).

#### GET /tracking
Get tracking history (requires auth).

#### GET /tracking/latest/:truck_code
Get latest position for truck (requires auth).

### 🚨 Alerts

#### GET /alerts
Get all alerts (requires auth).

#### POST /alerts
Create alert (requires admin auth).

### 🏪 Shops

#### GET /shops
Get all shops (requires auth).

## Status Codes
- `200` - Success
- `201` - Created  
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error