# ⚠️ WARNING ⚠️

## **THIS IS A DEVELOP BRANCH – NEVER INSTALL FeatherPanel FROM HERE**

To test loally, please follow these improved and detailed steps:

1. **Install Prerequisites**

   Ensure your server or development machine has the following installed:
   - [Git](https://git-scm.com/downloads)
   - [Docker](https://docs.docker.com/get-docker/)
   - [Docker Compose](https://docs.docker.com/compose/install/)
   - [Pelican Wings](https://pelican.dev/docs/wings/install) (if required for nodes)

2. **Clone the Repository**

   Open a terminal and navigate to the directory where you want to install FeatherPanel (commonly `/var/www`):

   ```bash
   cd /var/www
   git clone https://github.com/mythicalltd/featherpanel.git
   cd featherpanel
   ```


3. **Start the Application**

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
