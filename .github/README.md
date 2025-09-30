# ⚠️ WARNING ⚠️

## **THIS IS A DEVELOP BRANCH – NEVER INSTALL FEATHERPANEL FROM HERE**

To test loally, please follow these improved and detailed steps:

1.  **Install Prerequisites**

    Ensure your server or development machine has the following installed:

    - [Docker](https://docs.docker.com/get-docker/)
    - [Docker Compose](https://docs.docker.com/compose/install/)
    - [Pelican Wings](https://pelican.dev/docs/wings/install) (if required for nodes)

2.  **Start the Application**

Create a new file `docker-compose.yml`
and paste in this:

```yml
services:
  mysql:
    image: mariadb:11.4
    container_name: featherpanel_mysql
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD:-featherpanel_root}
      MARIADB_DATABASE: ${MARIADB_DATABASE:-featherpanel}
      MARIADB_USER: ${MARIADB_USER:-featherpanel}
      MARIADB_PASSWORD: ${MARIADB_PASSWORD:-featherpanel_password}
      MARIADB_AUTO_UPGRADE: "1"
    volumes:
      - mariadb_data:/var/lib/mysql
      - ./mysql/init:/docker-entrypoint-initdb.d
    networks:
      - featherpanel_network
    healthcheck:
      test:
        [
          "CMD",
          "mariadb-admin",
          "ping",
          "-h",
          "localhost",
          "-u",
          "root",
          "-pfeatherpanel_root",
        ]
      timeout: 20s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: featherpanel_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-featherpanel_redis}
    volumes:
      - redis_data:/data
    networks:
      - featherpanel_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      timeout: 20s
      retries: 10

  backend:
    image: ghcr.io/mythicalltd/featherpanel-backend:latest
    container_name: featherpanel_backend
    restart: unless-stopped
    environment:
      - DATABASE_HOST=mysql
      - DATABASE_PORT=3306
      - DATABASE_DATABASE=${MARIADB_DATABASE:-featherpanel}
      - DATABASE_USER=${MARIADB_USER:-featherpanel}
      - DATABASE_PASSWORD=${MARIADB_PASSWORD:-featherpanel_password}
      - DATABASE_ENCRYPTION=xchacha20
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD:-featherpanel_redis}
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - featherpanel_attachments:/var/www/html/storage/attachments
      - featherpanel_addons:/var/www/html/storage/addons
      - featherpanel_logs:/var/www/html/storage/logs
      - featherpanel_config:/var/www/html/storage/config
    networks:
      - featherpanel_network

  frontend:
    image: ghcr.io/mythicalltd/featherpanel-frontend:main
    container_name: featherpanel_frontend
    restart: unless-stopped
    ports:
      - "4831:80"
    depends_on:
      - backend
    networks:
      - featherpanel_network

volumes:
  mariadb_data:
    driver: local
  redis_data:
    driver: local
  featherpanel_attachments:
    driver: local
  featherpanel_addons:
    driver: local
  featherpanel_logs:
    driver: local
  featherpanel_config:
    driver: local

networks:
  featherpanel_network:
    driver: bridge
```

Use Docker Compose to build and start all required services:

```bash
docker compose up -d
```

This will automatically pull dependencies, build containers, run migrations, and start the application stack.

4. **Wait for Initialization**

   - The first boot may take a few minutes as dependencies are installed and the database is initialized.
   - You can monitor logs with:
     ```bash
     docker compose logs -f
     ```

5. **Access the Panel**

   Once the application has finished booting, open your browser and navigate to:

   ```
   http://<your-server-ip>:4831
   ```

   Replace `<your-server-ip>` with your server's actual IP address.

6. **Default Credentials**

   - If prompted, register a new admin account.
   - If you encounter issues, check the documentation or open an issue on GitHub.

---

**Need help?**

- [API Documentation](https://www.postman.com/mythicalsystems/workspace/mythicalpanel)
- [Discord Support](https://discord.mythical.systems)

Enjoy testing FeatherPanel!
