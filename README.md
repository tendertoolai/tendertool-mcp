# tendertool-mcp

MCP-Server für TenderTool: Referenzen und Vault-Dokumente direkt aus Claude (Code/Desktop) verwalten.

## Voraussetzungen

- Node.js ≥ 18, pnpm
- Ein Personal Access Token aus TenderTool (`POST /api/user/api-tokens`, Klartext-Token wird nur einmal angezeigt)

## Setup

```bash
pnpm install
pnpm run build
```

## Konfiguration

| Umgebungsvariable | Zweck |
|---|---|
| `TENDERTOOL_API_URL` | Basis-URL des Backends, z.B. `https://api.tendertool.de` |
| `TENDERTOOL_API_TOKEN` | Personal Access Token (`ttp_…`) |
| `TENDERTOOL_INSECURE_TLS` | **Nur lokal (DDEV):** `1` akzeptiert selbstsignierte Zertifikate — deaktiviert die TLS-Prüfung prozessweit. Niemals gegen Produktion setzen, sonst ist der Token per MITM abgreifbar. |

### Claude Code

```bash
claude mcp add tendertool \
  --env TENDERTOOL_API_URL=https://api.tendertool.de \
  --env TENDERTOOL_API_TOKEN=ttp_... \
  -- node /pfad/zu/tendertool-mcp/dist/index.js
```

Für eine lokale DDEV-Instanz zusätzlich `--env TENDERTOOL_INSECURE_TLS=1` (Hinweis oben beachten).

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "tendertool": {
      "command": "node",
      "args": ["/pfad/zu/tendertool-mcp/dist/index.js"],
      "env": {
        "TENDERTOOL_API_URL": "https://api.tendertool.de",
        "TENDERTOOL_API_TOKEN": "ttp_..."
      }
    }
  }
}
```

## Tools

| Tool | Zweck |
|---|---|
| `reference_list` | Referenzen auflisten (optional `type=project\|person\|asset\|rate`) |
| `reference_create` | Referenz anlegen |
| `reference_update` | Referenz aktualisieren (`data` ersetzt das komplette Objekt!) |
| `reference_delete` | Referenz löschen |
| `vault_document_list` | Vault-Dokumente inkl. Ablaufdaten und `doc_types` auflisten |
| `vault_document_upload` | Lokale Datei in den Vault hochladen (absoluter Pfad) |
| `vault_document_update` | Metadaten (Typ, Daten, Notizen) ändern |
| `vault_document_delete` | Dokument inkl. Datei löschen |

Die Mandanten-Trennung erzwingt das Backend serverseitig — der Token bestimmt User und Organisation.
