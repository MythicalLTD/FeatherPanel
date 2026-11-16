#!/usr/bin/env python3
"""Extract admin routes from backend/app/routes/admin into mcp/src/tools/admin-routes.generated.ts."""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
ROUTES_DIR = ROOT / "backend" / "app" / "routes" / "admin"
OUT = ROOT / "mcp" / "src" / "tools" / "admin-routes.generated.ts"


def extract_from_file(path: pathlib.Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="replace")
    routes: list[dict] = []
    seen: set[tuple[str, str]] = set()

    # Standard / rate-limit registerAdminRoute( ... ) calls
    for m in re.finditer(
        r"registerAdminRoute(?:WithRateLimit)?\s*\((.*?)\)\s*;", text, re.S
    ):
        block = m.group(1)
        strings = [a or b for a, b in re.findall(r"'([^']+)'|\"([^\"]+)\"", block)]
        if len(strings) < 2:
            continue
        name = strings[0]
        api_path = next((s for s in strings if s.startswith("/api/admin")), None)
        if not api_path:
            continue
        methods = ["GET"]
        mm = re.search(r"\[\s*((?:'[A-Z]+'\s*,?\s*)+)\]", block)
        if mm:
            methods = re.findall(r"'([A-Z]+)'", mm.group(1))
        perm = None
        pm = re.search(r"Permissions::([A-Z0-9_]+)", block)
        if pm:
            perm = pm.group(1)
        else:
            for s in strings:
                if s.startswith("admin."):
                    perm = s
                    break
        key = (name, api_path)
        if key in seen:
            continue
        seen.add(key)
        routes.append(
            {
                "name": name,
                "path": api_path,
                "methods": methods,
                "permission": perm,
                "file": str(path.relative_to(ROUTES_DIR)),
            }
        )

    # Compact one-liners: registerAdminRoute($routes, 'name', '/api/admin/...', ..., Permissions::X, ['POST'])
    for m in re.finditer(
        r"registerAdminRoute\s*\(\s*\$routes\s*,\s*'([^']+)'\s*,\s*'(/api/admin[^']*)'\s*,.*?Permissions::([A-Z0-9_]+)(?:\s*,\s*\[([^\]]*)\])?",
        text,
        re.S,
    ):
        name, api_path, perm, methods_raw = m.group(1), m.group(2), m.group(3), m.group(4)
        methods = re.findall(r"'([A-Z]+)'", methods_raw or "") or ["GET"]
        key = (name, api_path)
        if key in seen:
            continue
        seen.add(key)
        routes.append(
            {
                "name": name,
                "path": api_path,
                "methods": methods,
                "permission": perm,
                "file": str(path.relative_to(ROUTES_DIR)),
            }
        )

    # Array-driven defs: ['admin-audit-log', '/api/admin/audit-log', 'index'],
    for m in re.finditer(
        r"\[\s*'((?:admin-)[^']+)'\s*,\s*'(/api/admin[^']*)'\s*,\s*'[^']+'\s*\]",
        text,
    ):
        name, api_path = m.group(1), m.group(2)
        key = (name, api_path)
        if key in seen:
            continue
        # Infer permission from nearby Permissions:: in file (first match in surrounding 800 chars before)
        start = max(0, m.start() - 800)
        window = text[start : m.end() + 400]
        pm = re.search(r"Permissions::([A-Z0-9_]+)", window)
        methods = ["GET"]
        mm = re.search(r"\[\s*'GET'\s*\]", window[m.start() - start :])
        if mm:
            methods = ["GET"]
        # also look after the foreach for methods array
        after = text[m.end() : m.end() + 500]
        mm2 = re.search(r"\[\s*((?:'[A-Z]+'\s*,?\s*)+)\]", after)
        if mm2:
            methods = re.findall(r"'([A-Z]+)'", mm2.group(1)) or methods
        seen.add(key)
        routes.append(
            {
                "name": name,
                "path": api_path,
                "methods": methods,
                "permission": pm.group(1) if pm else None,
                "file": str(path.relative_to(ROUTES_DIR)),
            }
        )

    return routes


def main() -> int:
    if not ROUTES_DIR.is_dir():
        print(f"missing {ROUTES_DIR}", file=sys.stderr)
        return 1

    routes: list[dict] = []
    for path in sorted(ROUTES_DIR.rglob("*.php")):
        routes.extend(extract_from_file(path))

    # Stable unique by name
    by_name: dict[str, dict] = {}
    for r in routes:
        by_name[r["name"]] = r
    routes = list(by_name.values())
    routes.sort(key=lambda r: (r["path"], r["name"]))

    OUT.write_text(
        "// Auto-generated from backend/app/routes/admin/*.php — do not edit by hand.\n"
        "// Regenerate: python3 mcp/scripts/generate-admin-routes.py\n"
        "export type AdminRoute = {\n"
        "  name: string;\n"
        "  path: string;\n"
        "  methods: string[];\n"
        "  permission: string | null;\n"
        "  file: string;\n"
        "};\n\n"
        "export const ADMIN_ROUTES: AdminRoute[] = "
        + json.dumps(routes, indent=2)
        + " as const;\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} ({len(routes)} routes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
