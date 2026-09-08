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
export const MCP_SERVER_VERSION = "1.1.2";

const MCP_INSTRUCTIONS = `FeatherPanel MCP — how to handle tool errors

When a tool returns TOOL_ERROR:
- Read diagnosis + next_steps. Most failures are bad URLs, corrupt jars, egg install scripts, or offline containers — NOT a broken panel/node.
- Keep going: retry with different arguments or another tool. Only conclude infrastructure failure if the error explicitly says daemon unreachable / unauthorized / node not found.
- pull_file needs a DIRECT binary URL with Content-Length. HTML landing pages and dead hosts fail. download.getbukkit.org often does not resolve; prefer cdn.getbukkit.org pinned jars or Paper fill-data.papermc.io object URLs.
- Paper API api.papermc.io/v2 is sunset. Resolve jars via fill.papermc.io/v3/.../builds/latest → downloads["server:default"].url, then pull_file that URL.
- After pulling server.jar, verify size (tens of MB). A ~100-byte JSON error body will crash Minecraft on start.
- server_power_action start can succeed then crash; use get_server_logs / get_install_logs before blaming Wings.
- Java / Docker image / server name: use get_server_startup (see allowed_docker_images) then update_server. Never invent image tags outside that list unless the API allows custom images.
- File paths: ALWAYS use panel volume paths (/ = server root). NEVER /home/container — that is only the path inside Docker; using it creates literal home/ and container/ folders. Correct: root=/ fileName=server.jar. Wrong: root=/home/container.
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
