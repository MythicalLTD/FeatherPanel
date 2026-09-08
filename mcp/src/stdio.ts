#!/usr/bin/env node
/**
 * FeatherPanel MCP — stdio entry for local Claude Desktop / Cursor.
 *
 * Env:
 *   FEATHERPANEL_URL      Panel base URL (e.g. https://panel.example.com)
 *   FEATHERPANEL_API_KEY  User API key (Bearer)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { setDefaultApiKey } from './auth.js';
import { createFeatherPanelMcpServer } from './server.js';

const apiKey = process.env.FEATHERPANEL_API_KEY?.trim();
if (!apiKey) {
    console.error('FEATHERPANEL_API_KEY is required for stdio mode.');
    process.exit(1);
}

if (!process.env.FEATHERPANEL_URL?.trim()) {
    console.error('FEATHERPANEL_URL is required for stdio mode.');
    process.exit(1);
}

setDefaultApiKey(apiKey);

const server = createFeatherPanelMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
