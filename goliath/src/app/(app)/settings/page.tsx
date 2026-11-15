"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiGet, apiSend, errorMessage } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { LoadingBlock } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import type { UserSettings } from "@/lib/types";

interface HealthPayload {
  integrations: { supabase: boolean; googleDrive: boolean; ai: string };
}

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [settingsRes, healthRes] = await Promise.all([
          apiGet<{ settings: UserSettings }>("/api/settings"),
          apiGet<HealthPayload>("/api/health"),
        ]);
        setSettings(settingsRes.settings);
        setHealth(healthRes);
      } catch (error) {
        toast.push({ title: "Could not load settings", description: errorMessage(error), tone: "error" });
      }
    })();
  }, [toast]);

  async function save(patch: Partial<UserSettings>) {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = await apiSend<{ settings: UserSettings }>("/api/settings", patch, "PUT");
      setSettings(payload.settings);
      toast.push({ title: "Settings saved", tone: "success" });
    } catch (error) {
      toast.push({ title: "Save failed", description: errorMessage(error), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <LoadingBlock label="Loading settings" />;

  return (
    <div className="max-w-2xl space-y-4">
      <section className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-silver-200">File manager</h3>
        </div>
        <div className="space-y-3 p-5">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm text-silver-200">Default to grid view</span>
              <span className="block text-xs text-silver-500">Applies the next time you open the file manager.</span>
            </span>
            <input
              type="checkbox"
              checked={settings.gridView}
              onChange={(event) => void save({ gridView: event.target.checked })}
              className="h-4 w-8 appearance-none rounded-full bg-graphite-700 transition-colors before:block before:h-4 before:w-4 before:translate-x-0 before:rounded-full before:bg-silver-300 before:transition-transform checked:bg-electric-500/60 checked:before:translate-x-4"
            />
          </label>

          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm text-silver-200">Confirm before deleting</span>
              <span className="block text-xs text-silver-500">Ask for explicit confirmation before moving files to trash.</span>
            </span>
            <input
              type="checkbox"
              checked={settings.confirmDelete}
              onChange={(event) => void save({ confirmDelete: event.target.checked })}
              className="h-4 w-8 appearance-none rounded-full bg-graphite-700 transition-colors before:block before:h-4 before:w-4 before:translate-x-0 before:rounded-full before:bg-silver-300 before:transition-transform checked:bg-electric-500/60 checked:before:translate-x-4"
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm text-silver-200">Items per page</span>
              <span className="block text-xs text-silver-500">Drive page size for listings and search.</span>
            </span>
            <select
              value={settings.pageSize}
              onChange={(event) => void save({ pageSize: Number(event.target.value) })}
              className="input h-9 w-24 py-0"
            >
              {[24, 48, 60, 100].map((size) => (
                <option key={size} value={size} className="bg-graphite-900">
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-silver-200">AI</h3>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm text-silver-200">Provider</span>
              <span className="block text-xs text-silver-500">
                Active integration: {health?.integrations.ai ?? "unknown"}
              </span>
            </span>
            <select
              value={settings.aiProvider}
              onChange={(event) => void save({ aiProvider: event.target.value })}
              className="input h-9 w-36 py-0"
            >
              <option value="auto" className="bg-graphite-900">
                Auto
              </option>
              <option value="gemini" className="bg-graphite-900">
                Gemini
              </option>
              <option value="ollama" className="bg-graphite-900">
                Local Ollama
              </option>
              <option value="disabled" className="bg-graphite-900">
                Disabled
              </option>
            </select>
          </div>
          <p className="rounded-lg border border-white/5 bg-graphite-950/60 p-3 text-xs leading-relaxed text-silver-500">
            A Google AI Pro subscription does not include Gemini Developer API quota. Add a
            <code className="mx-1 rounded bg-graphite-800 px-1 py-0.5 text-[11px] text-silver-300">GEMINI_API_KEY</code>
            in <code className="rounded bg-graphite-800 px-1 py-0.5 text-[11px] text-silver-300">.env.local</code> to enable cloud
            models, or run Ollama locally for private inference.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3 className="text-sm font-medium text-silver-200">Integrations</h3>
          <Button variant="ghost" icon={<Save className="h-4 w-4" />} onClick={() => void save({})} loading={saving}>
            Re-save
          </Button>
        </div>
        <dl className="divide-y divide-white/5 text-xs">
          {[
            ["Supabase", health?.integrations.supabase ? "configured" : "missing env"],
            ["Google Drive", health?.integrations.googleDrive ? "configured" : "missing env"],
            ["AI", health?.integrations.ai ?? "unknown"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <dt className="text-silver-400">{label}</dt>
              <dd className={value === "missing env" ? "text-red-300" : "text-silver-200"}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}