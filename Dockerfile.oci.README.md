# FeatherPanel All-in-One Container (OCI)

This Dockerfile combines all FeatherPanel services into a single OCI (Open Container Initiative) compliant container for easy deployment on Proxmox, LXC, or any OCI-compliant runtime that prefers single-container deployments.

## What's Inside

| Service      | Description        | Internal Port   |
| ------------ | ------------------ | --------------- |
| MariaDB      | Database           | 3306 (internal) |
| Redis        | Cache/Queue        | 6379 (internal) |
| FrankenPHP   | PHP Backend API    | 8080 (internal) |
| Next.js      | Frontend UI        | 3000 (internal) |
| Caddy        | Reverse Proxy      | 80 (external)   |
| Async Runner | Rust job processor | -               |
| Cron         | Scheduled tasks    | -               |

## Build

```bash
docker build -f Dockerfile.oci -t featherpanel-oci:latest .
```

## Run

### Basic (with persistent volume)

```bash
docker run -d \
  -p 80:80 \
  -v featherpanel_data:/data \
  --name featherpanel \
  featherpanel-oci:latest
```

### With custom environment variables

```bash
docker run -d \
  -p 80:80 \
  -p 443:443 \
  -v featherpanel_data:/data \
  -e DATABASE_DATABASE=featherpanel \
  -e DATABASE_USER=featherpanel \
  -e DATABASE_PASSWORD=your_secure_password \
  -e REDIS_PASSWORD=your_redis_password \
  -e MARIADB_ROOT_PASSWORD=your_root_password \
  --name featherpanel \
  featherpanel-oci:latest
```

### For Proxmox CT

```bash
# Create LXC container with nesting enabled for Docker
pct create 100 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname featherpanel \
  --storage local-lvm \
  --rootfs 20 \
  --memory 4096 \
  --cores 4 \
  --features nesting=1 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp

# Or use the OCI image directly with systemd-nspawn/LXC
# Copy the built image to Proxmox and run it
```

## Environment Variables

| Variable                | Default                 | Description           |
| ----------------------- | ----------------------- | --------------------- |
| `DATABASE_DATABASE`     | `featherpanel`          | Database name         |
| `DATABASE_USER`         | `featherpanel`          | Database user         |
| `DATABASE_PASSWORD`     | `featherpanel_password` | Database password     |
| `REDIS_PASSWORD`        | `featherpanel_redis`    | Redis password        |
| `MARIADB_ROOT_PASSWORD` | `featherpanel_root`     | MariaDB root password |

## Data Persistence

All data is stored in `/data`:

- `/data/mysql` - Database files
- `/data/redis` - Redis data
- `/data/config` - Panel configuration
- `/data/logs` - Application logs
- `/data/backups` - Snapshots/backups
- `/data/attachments` - File uploads
- `/data/translations` - Custom translations
- `/data/addons` - Installed addons

## Logs

```bash
# All service logs
docker logs featherpanel

# Follow logs
docker logs -f featherpanel
```

## Troubleshooting

**Container won't start:**

```bash
docker logs featherpanel
```

**Access container shell:**

```bash
docker exec -it featherpanel bash
```

**Check service status:**

```bash
docker exec -it featherpanel supervisorctl status
```

**Restart a service:**

```bash
docker exec -it featherpanel supervisorctl restart frankenphp
```

## Health Checks

The container includes health checks for all services:

- MariaDB: `mysqladmin ping`
- Redis: `redis-cli ping`
- Backend: `php cli help`
- Frontend: HTTP check on port 80

## Notes for OCI Deployment

This container is OCI-compliant and designed for:

- Proxmox LXC with nesting enabled
- Kubernetes (as a single pod)
- Docker/Podman standalone deployments
- Any OCI-compliant container runtime

Features:

- Single process tree managed by supervisor
- All services in one container
- Persistent data in single `/data` volume
- Minimal external dependencies
- No special capabilities required

## Differences from Docker Compose Setup

1. **Single container** - All services run together
2. **Internal networking** - Services talk via localhost (127.0.0.1)
3. **Shared volume** - Single `/data` mount instead of multiple named volumes
4. **Simplified deployment** - One image to deploy

## Build for Multiple Architectures

```bash
docker buildx create --use
docker buildx build \
  -f Dockerfile.oci \
  --platform linux/amd64,linux/arm64 \
  -t your-registry/featherpanel-oci:latest \
  --push .
```
