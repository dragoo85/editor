/**
 * Protocol-level integration tests: the real Drive client is exercised against a
 * fake Drive that implements Google's wire format (resumable upload offsets,
 * 308 semantics, pagination, error envelopes).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FakeDrive } from "./fake-drive";

const MB = 1024 * 1024;

let drive: FakeDrive;

beforeAll(async () => {
  drive = new FakeDrive();
  await drive.listen();
  process.env.GOLIATH_DRIVE_API_BASE = drive.driveApiBase;
  process.env.GOLIATH_DRIVE_UPLOAD_BASE = drive.uploadApiBase;
});

beforeEach(() => {
  drive.files.clear();
});

afterEach(() => {
  drive.failChunks(0);
});

describe("drive client — resumable upload", () => {
  it("uploads a multi-chunk file through the resumable protocol", async () => {
    const { createResumableSession, uploadChunk, queryUploadStatus } = await import(
      "../src/lib/google/drive"
    );

    const total = 12 * MB;
    const chunkSize = 5 * MB;
    const root = drive.seedFolder("GOLIATH");

    const session = await createResumableSession({
      accessToken: "token",
      name: "archive.bin",
      mimeType: "application/octet-stream",
      size: total,
      parentId: root.id,
    });
    expect(session.sessionUri).toContain("/upload/session/");

    const offsets: number[] = [];
    let offset = 0;
    while (offset < total) {
      const size = Math.min(chunkSize, total - offset);
      offsets.push(offset);
      const result = await uploadChunk({
        sessionUri: session.sessionUri,
        accessToken: "token",
        data: new Uint8Array(Buffer.alloc(size, 0x41)),
        offset,
        total,
        finalize: offset + size >= total,
      });
      if (result.status === "completed") break;
      offset = result.bytesReceived;
    }

    expect(offsets).toEqual([0, 5 * MB, 10 * MB]);

    const stored = [...drive.files.values()].find((file) => file.name === "archive.bin");
    expect(stored).toBeDefined();
    expect(stored?.size).toBe(total);
    expect(stored?.parents).toEqual([root.id]);

    const complete = await queryUploadStatus({ sessionUri: session.sessionUri, accessToken: "token" });
    expect(complete).toBeGreaterThanOrEqual(0);
  });

  it("resumes correctly after transient chunk failures", async () => {
    const { createResumableSession, uploadChunk, queryUploadStatus } = await import(
      "../src/lib/google/drive"
    );

    const total = 6 * MB;
    const chunkSize = 5 * MB;
    const root = drive.seedFolder("GOLIATH");
    drive.failChunks(1, 503);

    const session = await createResumableSession({
      accessToken: "token",
      name: "flaky.bin",
      mimeType: "application/octet-stream",
      size: total,
      parentId: root.id,
    });

    // The first attempt hits the injected 503 and must throw without committing bytes.
    await expect(
      uploadChunk({
        sessionUri: session.sessionUri,
        accessToken: "token",
        data: new Uint8Array(Buffer.alloc(5 * MB, 0x41)),
        offset: 0,
        total,
        finalize: false,
      }),
    ).rejects.toThrow(/Backend error/i);

    // Nothing was committed, so the retry starts at offset 0 and succeeds.
    const first = await uploadChunk({
      sessionUri: session.sessionUri,
      accessToken: "token",
      data: new Uint8Array(Buffer.alloc(5 * MB, 0x41)),
      offset: 0,
      total,
      finalize: false,
    });
    expect(first.status).toBe("progress");
    expect(first.bytesReceived).toBe(5 * MB);

    const received = await queryUploadStatus({
      sessionUri: session.sessionUri,
      accessToken: "token",
    });
    expect(received).toBe(5 * MB);

    const final = await uploadChunk({
      sessionUri: session.sessionUri,
      accessToken: "token",
      data: new Uint8Array(Buffer.alloc(1 * MB, 0x42)),
      offset: 5 * MB,
      total,
      finalize: true,
    });
    expect(final.status).toBe("completed");
    expect(final.fileId).toBeTruthy();

    const stored = [...drive.files.values()].find((file) => file.name === "flaky.bin");
    expect(stored?.size).toBe(total);
  });

  it("rejects a chunk with a mismatched offset", async () => {
    const { createResumableSession, uploadChunk } = await import("../src/lib/google/drive");
    const root = drive.seedFolder("GOLIATH");

    const session = await createResumableSession({
      accessToken: "token",
      name: "bad-offset.bin",
      mimeType: "application/octet-stream",
      size: 2 * MB,
      parentId: root.id,
    });

    await expect(
      uploadChunk({
        sessionUri: session.sessionUri,
        accessToken: "token",
        data: new Uint8Array(Buffer.alloc(1024)),
        offset: 1024 * 1024,
        total: 2 * MB,
        finalize: false,
      }),
    ).rejects.toThrow(/Invalid offset/i);
  });
});

describe("drive client — folders, metadata and listing", () => {
  it("creates the marked GOLIATH root only when it does not exist", async () => {
    const { ensureGoliathRoot, findGoliathRoot } = await import("../src/lib/google/drive");

    expect(await findGoliathRoot("token")).toBeNull();

    const rootId = await ensureGoliathRoot("token");
    expect(rootId).toBeTruthy();

    const again = await ensureGoliathRoot("token");
    expect(again).toBe(rootId);
    expect(drive.files.size).toBe(1);
  });

  it("lists folders first and paginates", async () => {
    const { listChildren } = await import("../src/lib/google/drive");
    const root = drive.seedFolder("GOLIATH");

    const sub = drive.seedFolder("Projects", root.id);
    drive.seedFile("notes.txt", "text/plain", Buffer.from("hello"), root.id);
    drive.seedFile("report.pdf", "application/pdf", Buffer.from("%PDF-1.4"), root.id);
    drive.seedFile("archive.zip", "application/zip", Buffer.from("zip"), root.id);
    expect(sub.id).toBeTruthy();

    const first = await listChildren({
      accessToken: "token",
      folderId: root.id,
      pageSize: 2,
    });

    expect(first.items).toHaveLength(2);
    expect(first.items[0].kind).toBe("folder");
    expect(first.nextPageToken).toBeTruthy();

    const second = await listChildren({
      accessToken: "token",
      folderId: root.id,
      pageSize: 2,
      pageToken: first.nextPageToken,
    });

    expect(second.items).toHaveLength(2);
    expect(second.nextPageToken).toBeNull();
  });

  it("renames, moves, copies, stars and trashes a file", async () => {
    const {
      renameFile,
      moveFile,
      copyFile,
      setStarred,
      trashFile,
      getMetadata,
      listChildren,
    } = await import("../src/lib/google/drive");

    const root = drive.seedFolder("GOLIATH");
    const other = drive.seedFolder("Archive", root.id);
    const file = drive.seedFile("draft.txt", "text/plain", Buffer.from("draft"), root.id);

    const renamed = await renameFile({ accessToken: "token", fileId: file.id, name: "final.txt" });
    expect(renamed.name).toBe("final.txt");

    const moved = await moveFile({
      accessToken: "token",
      fileId: file.id,
      addParents: other.id,
      removeParents: root.id,
    });
    expect(moved.parentId).toBe(other.id);

    const copied = await copyFile({
      accessToken: "token",
      fileId: file.id,
      name: "final copy.txt",
      parentId: root.id,
    });
    expect(copied.parentId).toBe(root.id);

    await setStarred({ accessToken: "token", fileId: file.id, starred: true });
    expect((await getMetadata("token", file.id)).starred).toBe(true);

    await trashFile("token", file.id);
    const rootListing = await listChildren({ accessToken: "token", folderId: root.id, pageSize: 50 });
    const names = rootListing.items.map((item) => item.name);
    expect(names).toContain("final copy.txt");
    expect(names).not.toContain("final.txt");
  });

  it("searches names and content", async () => {
    const { searchDrive } = await import("../src/lib/google/drive");
    const root = drive.seedFolder("GOLIATH");
    drive.seedFile("quarterly.txt", "text/plain", Buffer.from("revenue grew"), root.id);
    drive.seedFile("notes.md", "text/markdown", Buffer.from("nothing relevant"), root.id);

    const byName = await searchDrive({ accessToken: "token", query: "quarterly" });
    expect(byName.items.map((item) => item.name)).toEqual(["quarterly.txt"]);

    const byContent = await searchDrive({ accessToken: "token", query: "revenue" });
    expect(byContent.items.map((item) => item.name)).toEqual(["quarterly.txt"]);
  });

  it("reports storage usage", async () => {
    const { getStorageUsage } = await import("../src/lib/google/drive");
    const usage = await getStorageUsage("token");
    expect(usage.limitBytes).toBe(5 * 1024 ** 4);
    expect(usage.usedBytes).toBeGreaterThan(0);
  });
});

describe("drive client — download", () => {
  it("downloads full content and honours Range", async () => {
    const { openDownload, readTextFile } = await import("../src/lib/google/drive");
    const root = drive.seedFolder("GOLIATH");
    const body = Buffer.from("0123456789");
    const file = drive.seedFile("data.txt", "text/plain", body, root.id);

    const full = await openDownload({ accessToken: "token", fileId: file.id });
    expect(await full.response.text()).toBe("0123456789");
    expect(full.contentType).toContain("text/plain");

    const partial = await openDownload({
      accessToken: "token",
      fileId: file.id,
      range: "bytes=2-5",
    });
    expect(partial.response.status).toBe(206);
    expect(await partial.response.text()).toBe("2345");

    const text = await readTextFile({ accessToken: "token", fileId: file.id });
    expect(text).toBe("0123456789");
  });
});

describe("drive client — errors", () => {
  it("maps a missing file to a DriveError with status 404", async () => {
    const { getMetadata, DriveError } = await import("../src/lib/google/drive");
    await expect(getMetadata("token", "does-not-exist")).rejects.toBeInstanceOf(DriveError);
    await expect(getMetadata("token", "does-not-exist")).rejects.toMatchObject({ status: 404 });
  });

  it("refuses to call Drive without an access token", async () => {
    const { getStorageUsage, DriveError } = await import("../src/lib/google/drive");
    await expect(getStorageUsage("")).rejects.toBeInstanceOf(DriveError);
  });
});