import { FileBrowser } from "@/components/files/FileBrowser";

export const dynamic = "force-dynamic";

export default function RecentPage() {
  return (
    <FileBrowser
      variant="recent"
      title="Recent files"
      emptyTitle="No recent files"
      emptyDescription="Open the file manager to sync metadata for your GOLIATH folder."
    />
  );
}