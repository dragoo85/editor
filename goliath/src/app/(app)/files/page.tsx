"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileBrowser } from "@/components/files/FileBrowser";
import { LoadingBlock } from "@/components/ui/primitives";

function FilesInner() {
  const params = useSearchParams();
  const folderId = params.get("folderId");
  return (
    <FileBrowser
      variant="folder"
      folderId={folderId}
      title={folderId ? "Folder" : "GOLIATH root"}
      emptyTitle="This folder is empty"
      emptyDescription="Drop files here to upload into your Drive, or create a folder to stay organised."
    />
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Opening file manager" />}>
      <FilesInner />
    </Suspense>
  );
}