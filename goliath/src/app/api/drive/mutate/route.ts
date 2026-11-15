import { NextResponse } from "next/server";
import { handleError, jsonError, readJson, requireSession } from "@/lib/api";
import { driveToken, rootFolderId } from "@/lib/drive-service";
import {
  copyFile,
  createFolder,
  moveFile,
  renameFile,
  setStarred,
  trashFile,
  DriveError,
} from "@/lib/google/drive";
import { requireDriveId, requireString, optionalDriveId, optionalBoolean } from "@/lib/validation";
import { setFavorite } from "@/lib/db/repositories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIONS = ["rename", "move", "copy", "trash", "star", "createFolder"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    const action = requireString(body, "action", { max: 32 }) as Action;

    if (!ACTIONS.includes(action)) {
      return jsonError(400, `Unsupported action "${action}"`);
    }

    const token = await driveToken(session.userId);
    const fileId = optionalDriveId(body, "fileId");

    switch (action) {
      case "rename": {
        const id = requireDriveId(body, "fileId");
        const name = requireString(body, "name", { min: 1, max: 255 });
        const updated = await renameFile({ accessToken: token, fileId: id, name });
        return NextResponse.json({ item: updated });
      }
      case "move": {
        const id = requireDriveId(body, "fileId");
        const targetId = requireDriveId(body, "targetFolderId");
        const currentParent = optionalDriveId(body, "currentFolderId") ?? null;
        const updated = await moveFile({
          accessToken: token,
          fileId: id,
          addParents: targetId,
          removeParents: currentParent,
        });
        return NextResponse.json({ item: updated });
      }
      case "copy": {
        const id = requireDriveId(body, "fileId");
        const name = requireString(body, "name", { min: 1, max: 255 });
        const parentId = optionalDriveId(body, "parentId") ?? (await rootFolderId(session.userId));
        const created = await copyFile({ accessToken: token, fileId: id, name, parentId });
        return NextResponse.json({ item: created });
      }
      case "trash": {
        const id = requireDriveId(body, "fileId");
        const confirmed = optionalBoolean(body, "confirmed") ?? false;
        if (!confirmed) return jsonError(400, "Deletion requires explicit confirmation");
        await trashFile(token, id);
        return NextResponse.json({ ok: true, trashed: id });
      }
      case "star": {
        const id = requireDriveId(body, "fileId");
        const starred = optionalBoolean(body, "starred") ?? true;
        await setStarred({ accessToken: token, fileId: id, starred });
        const supabase = await createSupabaseServerClient();
        await setFavorite(supabase, session.userId, id, starred);
        return NextResponse.json({ ok: true, starred });
      }
      case "createFolder": {
        const name = requireString(body, "name", { min: 1, max: 255 });
        const parentId =
          optionalDriveId(body, "parentId") ?? (fileId ?? (await rootFolderId(session.userId)));
        const folder = await createFolder({ accessToken: token, name, parentId });
        return NextResponse.json({ item: folder });
      }
      default:
        return jsonError(400, "Unsupported action");
    }
  } catch (error) {
    if (error instanceof DriveError) {
      return jsonError(error.status === 401 ? 401 : 502, error.message);
    }
    if (error instanceof Error && error.message.includes("not connected")) {
      return jsonError(401, error.message);
    }
    return handleError(error);
  }
}