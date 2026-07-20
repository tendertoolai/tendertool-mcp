#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TenderToolClient } from "./client.js";

// Produktions-URL als Default — TENDERTOOL_API_URL muss nur für
// Dev-/Staging-Umgebungen gesetzt werden.
const DEFAULT_API_URL = "https://api.tendertool.de";

const apiUrl = (process.env.TENDERTOOL_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
const apiToken = process.env.TENDERTOOL_API_TOKEN;

if (!apiToken) {
  console.error(
    "Fehlende Konfiguration: TENDERTOOL_API_TOKEN muss als Umgebungsvariable gesetzt sein. " +
      "Den API-Key erstellen Sie in TenderTool unter Profil → KI-Anbindung.",
  );
  process.exit(1);
}

// Nur für lokale DDEV-Instanzen mit selbstsigniertem Zertifikat gedacht —
// deaktiviert die Zertifikatsprüfung prozessweit. Niemals gegen Produktion!
if (process.env.TENDERTOOL_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.error(
    "WARNUNG: TENDERTOOL_INSECURE_TLS=1 — TLS-Zertifikatsprüfung ist deaktiviert. " +
      "Nur für lokale Entwicklungsumgebungen (DDEV) verwenden.",
  );
}

const client = new TenderToolClient(apiUrl, apiToken);

const server = new McpServer({
  name: "tendertool",
  version: "0.1.0",
});

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  return {
    content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  };
}

// ── Referenzen ──────────────────────────────────────────────────────────────

const referenceType = z
  .enum(["project", "person", "asset", "rate"])
  .describe("Referenztyp: project (Projektreferenz), person, asset oder rate");

server.registerTool(
  "reference_list",
  {
    title: "Referenzen auflisten",
    description:
      "Listet alle KB-Referenzen der Organisation. Optional nach Typ gefiltert. " +
      "Projektreferenzen enthalten in data u.a. title, client_name, period_from/period_to (JJJJ-MM), " +
      "contract_value, short_description, long_description, contact_person.",
    inputSchema: { type: referenceType.optional() },
  },
  async ({ type }) => {
    try {
      const query = type ? `?type=${type}` : "";
      return jsonResult(await client.requestJson("GET", `/api/kb/references${query}`));
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "reference_create",
  {
    title: "Referenz anlegen",
    description:
      "Legt eine neue KB-Referenz an. Für reference_type=project sollte data enthalten: " +
      "title, client_name, period_from/period_to (JJJJ-MM), contract_value (Zahl, EUR netto), " +
      "short_description, long_description, contact_person. " +
      "industry_tags = Branche des Auftraggebers, service_tags = Leistungsarten.",
    inputSchema: {
      reference_type: referenceType,
      data: z.record(z.unknown()).describe("Typabhängige Felder der Referenz"),
      industry_tags: z.array(z.string()).optional(),
      service_tags: z.array(z.string()).optional(),
    },
  },
  async ({ reference_type, data, industry_tags, service_tags }) => {
    try {
      return jsonResult(
        await client.requestJson("POST", "/api/kb/references", {
          reference_type,
          data,
          industry_tags: industry_tags ?? [],
          service_tags: service_tags ?? [],
        }),
      );
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "reference_update",
  {
    title: "Referenz aktualisieren",
    description:
      "Aktualisiert eine KB-Referenz. Nur übergebene Felder werden geändert. " +
      "Achtung: data ersetzt das komplette data-Objekt — vorher mit reference_list den Ist-Stand laden " +
      "und das vollständige Objekt mit den Änderungen zurückschicken.",
    inputSchema: {
      id: z.number().int().positive(),
      data: z.record(z.unknown()).optional(),
      industry_tags: z.array(z.string()).optional(),
      service_tags: z.array(z.string()).optional(),
      status: z.enum(["active", "archived"]).optional(),
    },
  },
  async ({ id, ...payload }) => {
    try {
      return jsonResult(await client.requestJson("PATCH", `/api/kb/references/${id}`, payload));
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "reference_delete",
  {
    title: "Referenz löschen",
    description: "Löscht eine KB-Referenz unwiderruflich. Zum Ausblenden ohne Löschen stattdessen reference_update mit status=archived nutzen.",
    inputSchema: { id: z.number().int().positive() },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.requestJson("DELETE", `/api/kb/references/${id}`));
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── Vault-Dokumente ─────────────────────────────────────────────────────────

server.registerTool(
  "vault_document_list",
  {
    title: "Vault-Dokumente auflisten",
    description:
      "Listet alle Dokumente im Unterlagen-Vault der Organisation (Handelsregisterauszug, " +
      "Versicherungsnachweise, Zertifikate, …) inkl. Ablaufdaten, bald ablaufender Dokumente " +
      "(expiring_soon) und der bekannten doc_types mit Labels.",
    inputSchema: {},
  },
  async () => {
    try {
      return jsonResult(await client.requestJson("GET", "/api/kb/documents"));
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "vault_document_upload",
  {
    title: "Vault-Dokument hochladen",
    description:
      "Lädt eine lokale Datei als Vault-Dokument hoch. file_path muss ein absoluter Pfad auf diesem Rechner sein. " +
      "Gültige doc_type-Werte liefert vault_document_list (Feld doc_types); Fallback ist 'other'.",
    inputSchema: {
      file_path: z.string().describe("Absoluter Pfad zur Datei auf diesem Rechner"),
      doc_type: z.string().optional().describe("Dokumenttyp, z.B. commercial_register_extract"),
      issued_at: z.string().optional().describe("Ausstellungsdatum, Format JJJJ-MM-TT"),
      expires_at: z.string().optional().describe("Ablaufdatum, Format JJJJ-MM-TT"),
      notes: z.string().optional(),
    },
  },
  async ({ file_path, doc_type, issued_at, expires_at, notes }) => {
    try {
      const fields: Record<string, string> = {};
      if (doc_type) fields.doc_type = doc_type;
      if (issued_at) fields.issued_at = issued_at;
      if (expires_at) fields.expires_at = expires_at;
      if (notes) fields.notes = notes;
      return jsonResult(await client.uploadFile("/api/kb/documents", file_path, fields));
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "vault_document_update",
  {
    title: "Vault-Dokument-Metadaten ändern",
    description:
      "Ändert Metadaten eines Vault-Dokuments (Typ, Ausstellungs-/Ablaufdatum, Notizen). Die Datei selbst bleibt unverändert.",
    inputSchema: {
      id: z.number().int().positive(),
      doc_type: z.string().optional(),
      issued_at: z.string().optional().describe("Format JJJJ-MM-TT"),
      expires_at: z.string().optional().describe("Format JJJJ-MM-TT"),
      notes: z.string().optional(),
    },
  },
  async ({ id, ...payload }) => {
    try {
      return jsonResult(await client.requestJson("PATCH", `/api/kb/documents/${id}`, payload));
    } catch (e) {
      return errorResult(e);
    }
  },
);

server.registerTool(
  "vault_document_delete",
  {
    title: "Vault-Dokument löschen",
    description: "Löscht ein Vault-Dokument inklusive der gespeicherten Datei unwiderruflich.",
    inputSchema: { id: z.number().int().positive() },
  },
  async ({ id }) => {
    try {
      return jsonResult(await client.requestJson("DELETE", `/api/kb/documents/${id}`));
    } catch (e) {
      return errorResult(e);
    }
  },
);

// ── Start ───────────────────────────────────────────────────────────────────

await server.connect(new StdioServerTransport());
console.error(`tendertool-mcp verbunden — API: ${apiUrl}`);
