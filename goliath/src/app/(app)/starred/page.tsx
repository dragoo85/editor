import { FileBrowser } from "@/components/files/FileBrowser";

export const dynamic = "force-dynamic";

export default function StarredPage() {
  return (
    <FileBrowser
      variant="starred"
      title="Starred files"
      emptyTitle="No starred files yet"
      emptyDescription="Star files from the file manager to pin them here."
    />
  );
}