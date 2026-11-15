/**
 * Spec-accurate fake Google Drive + OAuth server.
 *
 * It implements the exact wire protocol GOLIATH depends on (resumable upload
 * offsets, 308 semantics, pagination, error envelopes) so the real client can be
 * verified without a Google account. It is a test double for the *protocol*, not
 * for product behaviour: nothing here is used unless GOLIATH_DRIVE_API_BASE
 * points at it.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export interface FakeFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  parents: string[];
  starred: boolean;
  trashed: boolean;
  modifiedTime: string;
  createdTime: string;
  md5Checksum?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  hasThumbnail?: boolean;
  shared?: boolean;
  properties?: Record<string, string>;
  content: Buffer;
}

interface UploadSession {
  name: string;
  mimeType: string;
  total: number;
  received: Buffer;
  parentId: string | null;
  properties?: Record<string, string>;
}

export interface FakeDriveOptions {
  /** Fail the next N upload chunk requests with this status (default 503). */
  failNextChunks?: number;
  failStatus?: number;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=UTF-8" });
  res.end(body);
}

function googleError(res: ServerResponse, status: number, message: string, reason: string): void {
  sendJson(res, status, { error: { code: status, message, errors: [{ reason }] } });
}

export class FakeDrive {
  readonly server: Server;
  readonly files = new Map<string, FakeFile>();
  private readonly sessions = new Map<string, UploadSession>();
  private counter = 0;
  private failNextChunks: number;
  private failStatus: number;

  constructor(options: FakeDriveOptions = {}) {
    this.failNextChunks = options.failNextChunks ?? 0;
    this.failStatus = options.failStatus ?? 503;

    this.server = createServer((req, res) => {
      void this.handle(req, res);
    });
  }

  get baseUrl(): string {
    const address = this.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return `http://127.0.0.1:${port}`;
  }

  get driveApiBase(): string {
    return `${this.baseUrl}/drive/v3`;
  }

  get uploadApiBase(): string {
    return `${this.baseUrl}/upload/drive/v3`;
  }

  listen(): Promise<void> {
    return new Promise((resolve) => this.server.listen(0, "127.0.0.1", () => resolve()));
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  seedFolder(name: string, parentId: string | null = null, properties?: Record<string, string>): FakeFile {
    const id = this.nextId();
    const file: FakeFile = {
      id,
      name,
      mimeType: "application/vnd.google-apps.folder",
      size: 0,
      parents: parentId ? [parentId] : [],
      starred: false,
      trashed: false,
      modifiedTime: new Date().toISOString(),
      createdTime: new Date().toISOString(),
      properties,
      content: Buffer.alloc(0),
    };
    this.files.set(id, file);
    return file;
  }

  seedFile(
    name: string,
    mimeType: string,
    content: Buffer,
    parentId: string | null = null,
  ): FakeFile {
    const id = this.nextId();
    const file: FakeFile = {
      id,
      name,
      mimeType,
      size: content.byteLength,
      parents: parentId ? [parentId] : [],
      starred: false,
      trashed: false,
      modifiedTime: new Date().toISOString(),
      createdTime: new Date().toISOString(),
      content,
    };
    this.files.set(id, file);
    return file;
  }

  failChunks(count: number, status = 503): void {
    this.failNextChunks = count;
    this.failStatus = status;
  }

  private nextId(): string {
    this.counter += 1;
    return `drive-id-${this.counter}`;
  }

  private async readBody(req: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", this.baseUrl);
    const method = req.method ?? "GET";
    const path = url.pathname;

    // ---------------------------------------------------------- oauth token --
    if (path === "/oauth/token" && method === "POST") {
      sendJson(res, 200, {
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        expires_in: 3600,
        scope: "openid email profile https://www.googleapis.com/auth/drive",
        token_type: "Bearer",
      });
      return;
    }

    if (path.startsWith("/upload/")) {
      await this.handleUpload(req, res, url);
      return;
    }

    if (!path.startsWith("/drive/v3/")) {
      googleError(res, 404, "Unknown endpoint", "notFound");
      return;
    }

    // -------------------------------------------------------------- about --
    if (path === "/drive/v3/about" && method === "GET") {
      sendJson(res, 200, {
        storageQuota: { limit: String(5 * 1024 ** 4), usage: "1024", usageInTrash: "0" },
      });
      return;
    }

    // -------------------------------------------------------------- files --
    if (path === "/drive/v3/files" && method === "GET") {
      const query = url.searchParams.get("q") ?? "";
      const pageSize = Number(url.searchParams.get("pageSize") ?? 48);
      const pageToken = Number(url.searchParams.get("pageToken") ?? 0);

      const folderMatch = /'([^']+)' in parents/.exec(query);
      const textMatch = /fullText contains '([^']+)'/.exec(query);
      const wantsTrashed = query.includes("trashed=true");
      const propertyMatch = /properties has \{ key='([^']+)' and value='([^']+)' \}/.exec(query);

      let items = [...this.files.values()].filter((file) =>
        wantsTrashed ? file.trashed : !file.trashed,
      );

      if (folderMatch) {
        items = items.filter((file) => file.parents.includes(folderMatch[1]));
      }
      if (textMatch) {
        const needle = textMatch[1].toLowerCase();
        items = items.filter(
          (file) =>
            file.name.toLowerCase().includes(needle) ||
            file.content.toString("utf8").toLowerCase().includes(needle),
        );
      }
      if (propertyMatch) {
        const [, key, value] = propertyMatch;
        items = items.filter((file) => file.properties?.[key] === value);
      }

      const start = pageToken * pageSize;
      const page = items.slice(start, start + pageSize);
      const nextPageToken = start + pageSize < items.length ? String(pageToken + 1) : undefined;

      sendJson(res, 200, {
        ...(nextPageToken ? { nextPageToken } : {}),
        files: page.map((file) => this.serialize(file)),
      });
      return;
    }

    if (path === "/drive/v3/files" && method === "POST") {
      const body = JSON.parse((await this.readBody(req)).toString("utf8") || "{}") as {
        name?: string;
        mimeType?: string;
        parents?: string[];
        properties?: Record<string, string>;
      };
      if (!body.name) {
        googleError(res, 400, "name is required", "badRequest");
        return;
      }
      const folder = this.seedFolder(body.name, body.parents?.[0] ?? null, body.properties);
      sendJson(res, 200, this.serialize(folder));
      return;
    }

    const fileMatch = /^\/drive\/v3\/files\/([^/]+)(\/copy)?$/.exec(path);
    if (fileMatch) {
      const fileId = decodeURIComponent(fileMatch[1]);
      const isCopy = Boolean(fileMatch[2]);
      const file = this.files.get(fileId);

      if (method === "GET" && !isCopy) {
        if (!file) {
          googleError(res, 404, "File not found", "notFound");
          return;
        }
        if (url.searchParams.get("alt") === "media") {
          const range = req.headers.range;
          if (range) {
            const match = /bytes=(\d+)-(\d+)/.exec(range);
            if (match) {
              const start = Number(match[1]);
              const end = Math.min(Number(match[2]), file.content.byteLength - 1);
              const slice = file.content.subarray(start, end + 1);
              res.writeHead(206, {
                "Content-Type": file.mimeType,
                "Content-Length": String(slice.byteLength),
                "Content-Range": `bytes ${start}-${end}/${file.content.byteLength}`,
              });
              res.end(slice);
              return;
            }
          }
          res.writeHead(200, {
            "Content-Type": file.mimeType,
            "Content-Length": String(file.content.byteLength),
          });
          res.end(file.content);
          return;
        }
        sendJson(res, 200, this.serialize(file));
        return;
      }

      if (method === "PATCH" && file) {
        const body = JSON.parse((await this.readBody(req)).toString("utf8") || "{}") as {
          name?: string;
          trashed?: boolean;
          starred?: boolean;
        };
        if (body.name !== undefined) file.name = body.name;
        if (body.trashed !== undefined) file.trashed = body.trashed;
        if (body.starred !== undefined) file.starred = body.starred;

        const addParents = url.searchParams.get("addParents");
        const removeParents = url.searchParams.get("removeParents");
        if (removeParents) file.parents = file.parents.filter((parent) => parent !== removeParents);
        if (addParents && !file.parents.includes(addParents)) file.parents.push(addParents);

        file.modifiedTime = new Date().toISOString();
        sendJson(res, 200, this.serialize(file));
        return;
      }

      if (method === "POST" && isCopy && file) {
        const body = JSON.parse((await this.readBody(req)).toString("utf8") || "{}") as {
          name?: string;
          parents?: string[];
        };
        const copy = this.seedFile(
          body.name ?? `Copy of ${file.name}`,
          file.mimeType,
          Buffer.from(file.content),
          body.parents?.[0] ?? file.parents[0] ?? null,
        );
        sendJson(res, 200, this.serialize(copy));
        return;
      }

      googleError(res, 405, "Method not allowed", "methodNotAllowed");
      return;
    }

    googleError(res, 404, "Not found", "notFound");
  }

  private async handleUpload(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
    const method = req.method ?? "GET";
    const uploadType = url.searchParams.get("uploadType");

    if (method === "POST" && uploadType === "resumable") {
      const body = JSON.parse((await this.readBody(req)).toString("utf8") || "{}") as {
        name?: string;
        parents?: string[];
      };
      if (!body.name) {
        googleError(res, 400, "name is required", "badRequest");
        return;
      }

      const total = Number(req.headers["x-goog-upload-header-content-length"] ?? 0);
      const mimeType =
        (req.headers["x-goog-upload-header-content-type"] as string) ?? "application/octet-stream";

      const id = `session-${this.sessions.size + 1}`;
      this.sessions.set(id, {
        name: body.name,
        mimeType,
        total,
        received: Buffer.alloc(0),
        parentId: body.parents?.[0] ?? null,
      });

      res.writeHead(200, {
        Location: `${this.baseUrl}/upload/session/${id}`,
        "X-Goog-Upload-URL": `${this.baseUrl}/upload/session/${id}`,
      });
      res.end();
      return;
    }

    const sessionMatch = /^\/upload\/session\/(.+)$/.exec(url.pathname);
    if (!sessionMatch) {
      googleError(res, 404, "Unknown upload endpoint", "notFound");
      return;
    }

    const session = this.sessions.get(sessionMatch[1]);
    if (!session) {
      googleError(res, 404, "Unknown upload session", "notFound");
      return;
    }

    const command = (req.headers["x-goog-upload-command"] as string) ?? "";

    if (command === "query") {
      if (session.received.byteLength >= session.total && session.total > 0) {
        sendJson(res, 200, { size: session.total });
        return;
      }
      res.writeHead(308, {
        Range: `bytes=0-${Math.max(0, session.received.byteLength - 1)}`,
      });
      res.end();
      return;
    }

    if (this.failNextChunks > 0) {
      // Drain the body but do not commit it: the client must retry this chunk.
      this.failNextChunks -= 1;
      await this.readBody(req);
      googleError(res, this.failStatus, "Backend error", "backendError");
      return;
    }

    const body = await this.readBody(req);
    const offset = Number(req.headers["x-goog-upload-offset"] ?? 0);

    if (offset !== session.received.byteLength) {
      googleError(res, 400, `Invalid offset ${offset}`, "badRequest");
      return;
    }

    session.received = Buffer.concat([session.received, body]);
    const finalize = command.includes("finalize");

    if (!finalize) {
      const lastByte = session.received.byteLength - 1;
      res.writeHead(308, { Range: `bytes=0-${Math.max(0, lastByte)}` });
      res.end();
      return;
    }

    const stored = this.seedFile(
      session.name,
      session.mimeType,
      session.received,
      session.parentId,
    );
    session.received = session.received;
    sendJson(res, 200, this.serialize(stored));
  }

  private serialize(file: FakeFile): Record<string, unknown> {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      ...(isFolder ? {} : { size: String(file.size) }),
      parents: file.parents,
      starred: file.starred,
      trashed: file.trashed,
      modifiedTime: file.modifiedTime,
      createdTime: file.createdTime,
      ...(file.md5Checksum ? { md5Checksum: file.md5Checksum } : {}),
      webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
      thumbnailLink: isFolder ? undefined : `https://drive.google.com/thumb?id=${file.id}`,
      hasThumbnail: !isFolder,
      shared: false,
      ...(file.properties ? { properties: file.properties } : {}),
    };
  }
}
