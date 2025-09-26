# API Overview

The API exposes several endpoints for system checks and documentation.

| Path | Method | Purpose |
| --- | --- | --- |
| /healthz | GET | Returns "OK" if the service is healthy |
| /readyz | GET | Indicates when the service is ready to receive traffic |
| /metrics | GET | Exposes Prometheus-formatted metrics |
| /api-docs | GET | Serves the Swagger/OpenAPI documentation |

