# tendertool-mcp

Offizieller MCP-Server für [TenderTool](https://app.tendertool.de): Referenzen und Vault-Dokumente direkt aus KI-Assistenten wie Claude (Code/Desktop) verwalten.

## Voraussetzungen

- Node.js ≥ 18 (inkl. `npx`)
- Ein TenderTool-API-Key — erstellen Sie ihn in TenderTool unter **Profil → KI-Anbindung** (der Key beginnt mit `ttp_` und wird nur einmalig angezeigt)

## Konfiguration

| Umgebungsvariable | Zweck |
|---|---|
| `TENDERTOOL_API_TOKEN` | **Erforderlich.** Ihr TenderTool-API-Key (`ttp_…`) |
| `TENDERTOOL_API_URL` | Optional. Basis-URL des Backends — Standard: `https://api.tendertool.de`. Nur für Dev-/Staging-Umgebungen nötig. |
| `TENDERTOOL_INSECURE_TLS` | **Nur lokale Entwicklung:** `1` akzeptiert selbstsignierte Zertifikate — deaktiviert die TLS-Prüfung prozessweit. Niemals gegen Produktion setzen. |

## Installation

### Claude Code

```bash
claude mcp add tendertool \
  --env TENDERTOOL_API_TOKEN=ttp_... \
  -- npx -y github:tendertoolai/tendertool-mcp
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "tendertool": {
      "command": "npx",
      "args": ["-y", "github:tendertoolai/tendertool-mcp"],
      "env": {
        "TENDERTOOL_API_TOKEN": "ttp_..."
      }
    }
  }
}
```

`npx` lädt und baut den Server beim ersten Start automatisch; danach wird der Cache verwendet.

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

Die Mandanten-Trennung erzwingt das TenderTool-Backend serverseitig — der API-Key bestimmt Benutzer und Organisation.

## Entwicklung

```bash
git clone https://github.com/tendertoolai/tendertool-mcp.git
cd tendertool-mcp
pnpm install
pnpm run build
node dist/index.js   # erwartet TENDERTOOL_API_URL + TENDERTOOL_API_TOKEN als Env
```

## Lizenz

[MIT](LICENSE) — © 2026 Die Lobby GmbH
