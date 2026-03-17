# Ice Truck MCP Server

Model Context Protocol server for querying the Ice Truck Tracking backend over stdio.

## Features

- `health_check`: fetch backend health state
- `list_trucks`: retrieve trucks with optional status and search filters
- `get_truck`: fetch a single truck by id
- `list_alerts`: retrieve alerts with optional severity and status filters

## Configuration

Set `ICE_TRUCK_API_URL` to point at the backend base URL.

Example:

```bash
ICE_TRUCK_API_URL=http://localhost:5000/api/v1
pnpm --filter @ice-truck/mcp-server start
```

## Build

```bash
pnpm --filter @ice-truck/mcp-server build
```
