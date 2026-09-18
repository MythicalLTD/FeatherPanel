import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerServerTools } from "./tools/servers.js";
import { registerFileTools } from "./tools/files.js";
import { registerConsoleTools } from "./tools/console.js";
import { registerBackupTools } from "./tools/backups.js";
import { registerDatabaseTools } from "./tools/databases.js";
import { registerScheduleTools } from "./tools/schedules.js";
import { registerAllocationTools } from "./tools/allocations.js";
import { registerStartupTools } from "./tools/startup.js";
import { registerSubuserTools } from "./tools/subusers.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerKnowledgebaseTools } from "./tools/knowledgebase.js";
import { registerVdsTools } from "./tools/vds.js";

export const MCP_SERVER_NAME = "featherpanel";
export const MCP_SERVER_VERSION = "1.2.1";

const MCP_INSTRUCTIONS = `FeatherPanel MCP — you control the user's game servers through these tools.

ALWAYS use tools. Never claim you lack access, never substitute a manual walkthrough, and never ask the user to run apt/java themselves when list_servers / get_server_startup / pull_file / update_server / server_power_action are available. If tools/list is empty, tell them to Disconnect → Connect this connector (MCP process likely restarted).

Discover servers: whoami → list_servers (match by name, e.g. "dasdas" → uuidShort). Then get_server_details / get_server_startup.

Install / change Minecraft Paper (including legacy 1.8.x):
1. get_server_startup — pick Java from allowed_docker_images (1.8.x needs Java 8, e.g. a java_8 / java_8_jre yolk if listed).
2. Resolve jar URL via fill.papermc.io (api.papermc.io/v2 is sunset). Example for Paper 1.8.8 (closest maintained legacy to 1.8.9):
   GET https://fill.papermc.io/v3/projects/paper/versions/1.8.8/builds
   Use the newest build's downloads["server:default"].url (fill-data.papermc.io object URL, ~20MB).
3. pull_file that URL with root=/ fileName=server.jar (NEVER root=/home/container).
4. get_files / — confirm server.jar is tens of MB, not a tiny error JSON.
5. write_file /eula.txt with eula=true. Keep online-mode=true in server.properties unless the user has a legitimate offline/LAN reason (do not enable cracked/piracy mode).
6. update_server image=… (Java 8 for 1.8.x) and startup if needed so it runs server.jar.
7. server_power_action restart/start; if it dies, get_server_logs — do not blame the panel first.

When a tool returns TOOL_ERROR:
- Read diagnosis + next_steps. Most failures are bad URLs, corrupt jars, egg scripts, or offline containers — NOT a broken node.
- Keep going with different args/tools. Only conclude infrastructure failure if the error explicitly says daemon unreachable / unauthorized / node not found.
- pull_file needs a DIRECT binary URL. Prefer Paper fill-data.papermc.io object URLs. Avoid download.getbukkit.org.
- File paths: panel volume paths only (/ = server root). Correct: root=/ fileName=server.jar.
`;

export function createFeatherPanelMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      websiteUrl: "https://docs.mythical.systems/docs",
    },
    { instructions: MCP_INSTRUCTIONS },
  );

  registerServerTools(server);
  registerFileTools(server);
  registerConsoleTools(server);
  registerBackupTools(server);
  registerDatabaseTools(server);
  registerScheduleTools(server);
  registerAllocationTools(server);
  registerStartupTools(server);
  registerSubuserTools(server);
  registerNetworkTools(server);
  registerKnowledgebaseTools(server);
  registerVdsTools(server);

  return server;
}
