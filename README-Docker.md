# FeatherPanel Docker Setup

This guide will help you run FeatherPanel using Docker and Docker Compose.

## Prerequisites

- Docker
- Docker Compose
- Git

## Quick Start

1. **Clone the repository** (if not already done):

   ```bash
   git clone https://github.com/mythicalltd/featherpanel.git
   cd featherpanel
   ```

2. **Copy environment file**:

   ```bash
   cp env.example .env
   ```

3. **Update environment variables** in `.env`:

   ```bash
   # Edit the .env file with your preferred values
   nano .env
   ```

4. **Create the backend environment file**:

   ```bash
   cp backend/storage/env.example backend/storage/.env
   ```

5. **Build and start the services**:

   ```bash
   docker compose up -d
   ```

6. **Database migrations run automatically** when the backend starts up and MySQL is ready!

## Services

The Docker setup includes the following services:

- **Frontend** (Vue.js): Available at http://localhost:4831
- **Backend** (PHP 8.4 + nginx + PHP-FPM): Internal only (accessed via frontend)
- **MySQL**: Internal only (accessed by backend)
- **Redis**: Internal only (accessed by backend)

## Environment Variables

### Main Environment File (`.env`)

```env
# Database Configuration
MYSQL_ROOT_PASSWORD=featherpanel_root
MYSQL_DATABASE=featherpanel
MYSQL_USER=featherpanel
MYSQL_PASSWORD=featherpanel_password

# Redis Configuration
REDIS_PASSWORD=featherpanel_redis

# Application Configuration
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost
```

### Backend Environment File (`backend/storage/.env`)

```env
# Database Configuration
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_DATABASE=featherpanel
DATABASE_USER=featherpanel
DATABASE_PASSWORD=featherpanel_password
DATABASE_ENCRYPTION=plaintext

# Redis Configuration
REDIS_HOST=redis
REDIS_PASSWORD=featherpanel_redis
```

## Development vs Production

### Development Mode

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Useful Commands

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
docker compose logs -f redis
```

### Execute commands in containers

```bash
# Backend CLI commands
docker compose exec backend php cli help
```

### Rebuild services

```bash
# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build backend
docker compose build frontend
```

### Clean up

```bash
# Stop and remove containers
docker compose down

# Remove volumes (WARNING: This will delete all data)
docker compose down -v

# Remove images
docker compose down --rmi all
```

## Support

For issues and support, please refer to the main FeatherPanel documentation or create an issue in the repository.
