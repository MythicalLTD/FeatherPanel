#!/usr/bin/env node
/**
 * Local stand-in for https://api.devsense.com/license/
 *
 * The extension dev bypass (eRe in extension.js) points activation here via:
 *   http://127.0.0.1:3847/license/
 * Override with env: DEVSENSE_LICENSE_API=http://127.0.0.1:PORT/license/
 *
 * Run: node dev/license-mock-server.mjs
 */

import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3847);
/** Use HOST=0.0.0.0 so colleagues on the LAN can use your machine's IP in team.env */
const HOST = process.env.HOST || "127.0.0.1";

function devLicense(machineId, key) {
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 10);
  return {
    name: machineId || "dev-local",
    license: "premium-dev",
    expiration: exp.toISOString(),
    signature: "dev-mock-signature",
    key: key ? "(received)" : undefined,
  };
}

function handleLicenseRequest(url) {
  const method = url.searchParams.get("method");
  const key = url.searchParams.get("key");
  const mail = url.searchParams.get("mail");
  const machineId = url.searchParams.get("machine_id");

  console.log(
    `[license-mock] ${method || "unknown"} machine_id=${machineId || "-"} api=${url.searchParams.get("api") || "-"}`,
  );

  if (method === "activate_vscode") {
    return {
      status: 200,
      body: devLicense(machineId, key),
    };
  }

  if (method === "trial_vscode") {
    return {
      status: 200,
      body: {
        message: `Trial mock OK for ${mail || "unknown"}. Use phptools.activate with any key.`,
      },
    };
  }

  return {
    status: 404,
    body: { message: `Unknown method: ${method}` },
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || HOST}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    });
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "GET only" }));
    return;
  }

  if (!url.pathname.startsWith("/license")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not found" }));
    return;
  }

  const { status, body } = handleLicenseRequest(url);
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(json);
});

server.listen(PORT, HOST, () => {
  console.log(`License mock listening on http://${HOST}:${PORT}/license/`);
  console.log("Extension dev mode uses this URL automatically (eRe=true).");
  console.log("Test: curl -s 'http://127.0.0.1:3847/license/?method=activate_vscode&machine_id=test&api=3.0&key=foo'");
});
