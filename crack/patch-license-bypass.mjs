#!/usr/bin/env node
/**
 * Patch ANY installed devsense.phptools-vscode extension for local license dev.
 * Works with pretty-printed and minified extension.js bundles.
 *
 *   node dev/patch-license-bypass.mjs
 *   node dev/patch-license-bypass.mjs --list
 *   node dev/patch-license-bypass.mjs --unpatch
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const MARKER = "DEV_LICENSE_BYPASS v1";
const BACKUP_SUFFIX = ".bak.devlicense";

const defaultApi =
  process.env.DEVSENSE_LICENSE_API || "http://127.0.0.1:3847/license/";

function isPatched(src) {
  return src.includes(MARKER);
}

/** Repair UTF-8 corruption: /ẞ/g sometimes becomes invalid /?/g */
function repairKnownCorruption(src) {
  const bad = 't.replace(/?/g, "\\xDF")';
  const good = 't.replace(/\\u1E9E/g, "\\xDF")';
  return src.includes(bad) ? src.replace(bad, good) : src;
}

function verifyBundleIntegrity(src) {
  if (src.includes('t.replace(/?/g, "\\xDF")')) {
    throw new Error(
      "bundle has invalid /?/g regex (UTF-8 corruption); run: node crack/fix-extension-regex.mjs",
    );
  }
}

/** @param {string} src */
function applyPatches(src) {
  if (isPatched(src)) {
    return { src, changed: false, reason: "already patched" };
  }
  if (!src.includes("DEVSENSE_PHP_LS_LICENSE")) {
    return {
      src,
      changed: false,
      reason: "unknown bundle (missing DEVSENSE_PHP_LS_LICENSE)",
    };
  }

  const minified = !src.includes("function zC(t, e, n)");
  let s = minified ? applyMinified(src) : applyPretty(src);

  if (!s.includes(MARKER)) {
    return { src, changed: false, reason: "patch incomplete" };
  }
  return { src, changed: true, mode: minified ? "minified" : "pretty" };
}

/** @param {string} s */
function applyPretty(s) {
  const rep = (from, to, label) => {
    if (s.includes(to)) return;
    if (!s.includes(from)) throw new Error(`pretty patch failed: ${label}`);
    s = s.replace(from, to);
  };

  rep(
    'UC = "DEVSENSE_PHP_LS_LICENSE";',
    `UC = "DEVSENSE_PHP_LS_LICENSE";\n  /* ${MARKER} */ eRe = !0,\n  xRe = process.env.DEVSENSE_LICENSE_API || "${defaultApi}";`,
    "UC",
  );
  rep(
    'UC = "DEVSENSE_PHP_LS_LICENSE",',
    `UC = "DEVSENSE_PHP_LS_LICENSE",\n  /* ${MARKER} */ eRe = !0,\n  xRe = process.env.DEVSENSE_LICENSE_API || "${defaultApi}",`,
    "UC-comma",
  );
  rep(
    "function QL(t) {\n  if (t && t.signature)",
    "function QL(t) {\n  if (eRe) return !0;\n  if (t && t.signature)",
    "QL",
  );
  rep(
    "function zC(t, e, n) {\n  return F(this, null, function* () {\n    var o;",
    "function zC(t, e, n) {\n  return F(this, null, function* () {\n    if (eRe) return 1134;\n    var o;",
    "zC",
  );
  rep(
    "return (e && !e.name && (e.name = WL()(Hs())), e);",
    `return (
        e && !e.name && (e.name = WL()(Hs())),
        e ||
          (eRe
            ? {
                name: "dev-bypass",
                license: "premium",
                expiration: "2099-12-31T23:59:59.000Z",
                signature: "dev-bypass",
              }
            : void 0)
      );`,
    "Fu-return",
  );
  rep(
    `    } catch (e) {
      return;
    }
  });
}
var gle = () =>`,
    `    } catch (e) {
      return eRe
        ? {
            name: "dev-bypass",
            license: "premium",
            expiration: "2099-12-31T23:59:59.000Z",
            signature: "dev-bypass",
          }
        : void 0;
    }
  });
}
var gle = () =>`,
    "Fu-catch",
  );
  rep(
    `function vOe() {
  return F(this, null, function* () {
    var e;
    let t = yield HC(Yr);`,
    `function vOe() {
  return F(this, null, function* () {
    if (eRe) {
      yield K1();
      return;
    }
    var e;
    let t = yield HC(Yr);`,
    "vOe",
  );
  rep(
    `_isBlacklisted(n) {
      return F(this, null, function* () {
        return n && typeof n == "string"`,
    `_isBlacklisted(n) {
      return F(this, null, function* () {
        if (eRe) return !1;
        return n && typeof n == "string"`,
    "_isBlacklisted",
  );
  rep(
    `  authentication() {
    return F(this, null, function* () {
      return yield Mn.state();`,
    `  authentication() {
    return F(this, null, function* () {
      if (eRe) return 1134;
      return yield Mn.state();`,
    "authentication",
  );
  rep("a = hr(_Oe) + s,", `a = (eRe ? xRe : hr(_Oe)) + s,`, "rne-url");
  rep(
    "options: { env: { MALLOC_TRIM_THRESHOLD_: 1e5 } },",
    `options: {
            env: eRe
              ? {
                  MALLOC_TRIM_THRESHOLD_: 1e5,
                  [UC]: JSON.stringify({
                    name: "dev-bypass",
                    license: "premium",
                    expiration: "2099-12-31T23:59:59.000Z",
                    signature: "dev-bypass",
                  }),
                }
              : { MALLOC_TRIM_THRESHOLD_: 1e5 },
          },`,
    "dOe-env",
  );
  return s;
}

/** @param {string} s */
function applyMinified(s) {
  const rep = (from, to, label) => {
    if (s.includes(to)) return;
    if (!s.includes(from)) throw new Error(`minified patch failed: ${label}`);
    s = s.replace(from, to);
  };

  rep(
    'UC="DEVSENSE_PHP_LS_LICENSE";',
    `UC="DEVSENSE_PHP_LS_LICENSE";/*${MARKER}*/var eRe=!0,xRe=process.env.DEVSENSE_LICENSE_API||"${defaultApi}";`,
    "UC",
  );
  rep(
    "function $L(t){if(t&&t.signature)",
    "function $L(t){if(eRe)return!0;if(t&&t.signature)",
    "QL",
  );
  rep(
    "function HC(t,e,n=void 0){return F(this,null,function*(){var o;n==null",
    "function HC(t,e,n=void 0){return F(this,null,function*(){if(eRe)return 1134;var o;n==null",
    "zC",
  );
  rep(
    "return e&&!e.name&&(e.name=GL()(Hs())),e}catch(e){return}})}var hle",
    `return e&&!e.name&&(e.name=GL()(Hs())),e||(eRe?{name:"dev-bypass",license:"premium",expiration:"2099-12-31T23:59:59.000Z",signature:"dev-bypass"}:void 0)}catch(e){return eRe?{name:"dev-bypass",license:"premium",expiration:"2099-12-31T23:59:59.000Z",signature:"dev-bypass"}:void 0}})}var hle`,
    "Fu",
  );
  rep(
    "function uOe(){return F(this,null,function*(){var e;let t=yield BC(zr);switch(yield Gn.state())",
    "function uOe(){return F(this,null,function*(){if(eRe){yield Jte();return}var e;let t=yield BC(zr);switch(yield Gn.state())",
    "vOe",
  );
  rep(
    "_isBlacklisted(n){return F(this,null,function*(){return n&&typeof n==\"string\"",
    "_isBlacklisted(n){return F(this,null,function*(){if(eRe)return!1;return n&&typeof n==\"string\"",
    "_isBlacklisted",
  );
  rep(
    "authentication(){return F(this,null,function*(){return yield Gn.state()})}",
    "authentication(){return F(this,null,function*(){if(eRe)return 1134;return yield Gn.state()})}",
    "authentication",
  );
  rep(
    'a=hr(sOe)+s,o=new Wte.XMLHttpRequest',
    `a=(eRe?xRe:hr(sOe))+s,o=new Wte.XMLHttpRequest`,
    "rne-url",
  );
  rep(
    "options:{env:{MALLOC_TRIM_THRESHOLD_:1e5}}}",
    `options:{env:eRe?{MALLOC_TRIM_THRESHOLD_:1e5,[UC]:JSON.stringify({name:"dev-bypass",license:"premium",expiration:"2099-12-31T23:59:59.000Z",signature:"dev-bypass"})}:{MALLOC_TRIM_THRESHOLD_:1e5}}}`,
    "dOe-env",
  );
  return s;
}

function discoverExtensionRoots(extraPaths = []) {
  const home = os.homedir();
  const bases = [
    path.join(home, ".vscode", "extensions"),
    path.join(home, ".vscode-server", "extensions"),
    path.join(home, ".cursor", "extensions"),
    path.join(home, ".cursor-server", "extensions"),
    process.env.VSCODE_EXTENSIONS_DIR,
    process.env.CURSOR_EXTENSIONS_DIR,
  ].filter(Boolean);

  const roots = new Set();
  for (const base of bases) {
    let entries;
    try {
      entries = fs.readdirSync(base, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (
        ent.isDirectory() &&
        ent.name.toLowerCase().startsWith("devsense.phptools-vscode")
      ) {
        roots.add(path.join(base, ent.name));
      }
    }
  }

  for (const p of extraPaths) {
    const resolved = path.resolve(p);
    if (fs.existsSync(path.join(resolved, "out", "src", "extension.js"))) {
      roots.add(resolved);
    }
  }

  return [...roots].sort();
}

function patchOne(root, { unpatch, repairOnly }) {
  const extJs = path.join(root, "out", "src", "extension.js");
  if (!fs.existsSync(extJs)) {
    return { root, ok: false, message: "no out/src/extension.js" };
  }

  const backup = extJs + BACKUP_SUFFIX;

  if (unpatch) {
    if (!fs.existsSync(backup)) {
      return { root, ok: false, message: "no backup to restore" };
    }
    fs.copyFileSync(backup, extJs);
    return { root, ok: true, message: "restored from backup" };
  }

  let original = fs.readFileSync(extJs, "utf8");
  const repaired = repairKnownCorruption(original);
  if (repaired !== original) {
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(extJs, backup);
    }
    fs.writeFileSync(extJs, repaired);
    verifyBundleIntegrity(repaired);
    return { root, ok: true, message: "repaired invalid /?/g regex (UTF-8 corruption)" };
  }

  if (repairOnly) {
    return { root, ok: true, message: "no corruption found" };
  }

  if (isPatched(original)) {
    try {
      verifyBundleIntegrity(original);
    } catch (e) {
      return { root, ok: false, message: e.message };
    }
    return { root, ok: true, message: "already patched" };
  }

  try {
    const result = applyPatches(original);
    if (!result.changed) {
      return { root, ok: false, message: result.reason || "no changes" };
    }
    result.src = repairKnownCorruption(result.src);
    verifyBundleIntegrity(result.src);
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(extJs, backup);
    }
    fs.writeFileSync(extJs, result.src);
    const ver = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ).version;
    return {
      root,
      ok: true,
      message: `patched v${ver} (${result.mode}), backup: ${path.basename(backup)}`,
    };
  } catch (e) {
    return { root, ok: false, message: e.message };
  }
}

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const unpatch = args.includes("--unpatch");
const repairOnly = args.includes("--repair");
const extra = args.filter((a) => !a.startsWith("-"));

const roots = discoverExtensionRoots(extra);

if (listOnly) {
  if (roots.length === 0) {
    console.log("No devsense.phptools-vscode installs found.");
    process.exit(1);
  }
  for (const r of roots) {
    const pkg = path.join(r, "package.json");
    const ver = fs.existsSync(pkg)
      ? JSON.parse(fs.readFileSync(pkg, "utf8")).version
      : "?";
    const extJs = path.join(r, "out", "src", "extension.js");
    let st = "missing extension.js";
    if (fs.existsSync(extJs)) {
      const body = fs.readFileSync(extJs, "utf8");
      const corrupt = body.includes('t.replace(/?/g, "\\xDF")');
      st = isPatched(body) ? "patched" : "stock";
      if (corrupt) st += ", CORRUPT regex";
    }
    console.log(`${r}  (${ver})  [${st}]`);
  }
  process.exit(0);
}

if (roots.length === 0) {
  console.error(
    "No PHP Tools extension found. Install it once, then re-run.\n  node dev/patch-license-bypass.mjs /path/to/devsense.phptools-vscode-…",
  );
  process.exit(1);
}

console.log(
  unpatch
    ? "Restoring license bypass backups…"
    : repairOnly
      ? "Repairing known extension.js corruption…"
      : "Applying license dev bypass…",
);
console.log(`API default: ${defaultApi}\n`);

let ok = 0;
for (const r of roots) {
  const res = patchOne(r, { unpatch, repairOnly });
  console.log(`${res.ok ? "✓" : "✗"} ${res.root}`);
  console.log(`  ${res.message}`);
  if (res.ok) ok++;
}

console.log(
  `\n${ok}/${roots.length} install(s) ${unpatch ? "restored" : "ready"}. Reload VS Code/Cursor window.`,
);
process.exit(ok === roots.length ? 0 : 1);
