import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { getSessionUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <AppShell email={user.email ?? "signed-in user"}>{children}</AppShell>
    </ToastProvider>
  );
}