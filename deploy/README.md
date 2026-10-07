# Deploy assets

Non-core deployment tooling kept out of the repository root.

| Path | Purpose |
|------|---------|
| `oci/` | All-in-one OCI image (`Dockerfile`, compose, `build.sh`, entrypoint bins) |
| `demo/` | Public demo stack compose + reset/update scripts |

Core app compose files remain at the repo root (`docker-compose.yml`, `docker-compose.v2.*.yml`).
