import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

/**
 * Schlanker HTTP-Client für die TenderTool-API.
 * Auth über Personal Access Token im Header "X-Api-Token".
 */
const REQUEST_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

export class TenderToolClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async requestJson(method: string, path: string, body?: unknown): Promise<unknown> {
    const response = await fetch(this.baseUrl + path, {
      method,
      headers: {
        "X-Api-Token": this.token,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return this.parseResponse(response, `${method} ${path}`);
  }

  async uploadFile(
    path: string,
    filePath: string,
    fields: Record<string, string>,
  ): Promise<unknown> {
    const buffer = await readFile(filePath);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([new Uint8Array(buffer)], { type: guessMimeType(filePath) }),
      basename(filePath),
    );
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }

    const response = await fetch(this.baseUrl + path, {
      method: "POST",
      headers: { "X-Api-Token": this.token },
      body: formData,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });

    return this.parseResponse(response, `POST ${path}`);
  }

  private async parseResponse(response: Response, context: string): Promise<unknown> {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`TenderTool-API-Fehler (${context}): HTTP ${response.status} — ${text.slice(0, 500)}`);
    }
    try {
      return text === "" ? {} : JSON.parse(text);
    } catch {
      throw new Error(`TenderTool-API lieferte kein JSON (${context}): ${text.slice(0, 200)}`);
    }
  }
}

function guessMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}
