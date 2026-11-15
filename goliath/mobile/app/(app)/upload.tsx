import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { apiFetch, uploadChunk } from "../../lib/api";
import { useSession } from "../../lib/session";

interface InitResponse {
  transferId: string;
  chunkSize: number;
  totalChunks: number;
}

interface Job {
  name: string;
  size: number;
  sent: number;
  status: "queued" | "uploading" | "done" | "failed";
  error?: string;
}

const C = {
  bg: "#07080a",
  panel: "#101318",
  border: "#1d2128",
  text: "#dfe3ea",
  muted: "#737b88",
  accent: "#38a8ff",
  ok: "#34d399",
  bad: "#f87171",
};

export default function UploadScreen() {
  const { session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  function patch(index: number, update: Partial<Job>) {
    setJobs((current) =>
      current.map((job, i) => (i === index ? { ...job, ...update } : job)),
    );
  }

  async function pickAndUpload() {
    if (!session) return;
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    setBusy(true);
    const startIndex = jobs.length;
    setJobs((current) => [
      ...current,
      ...result.assets.map((asset) => ({
        name: asset.name ?? "upload",
        size: asset.size ?? 0,
        sent: 0,
        status: "queued" as const,
      })),
    ]);

    for (let i = 0; i < result.assets.length; i += 1) {
      const asset = result.assets[i];
      const jobIndex = startIndex + i;
      const size = asset.size ?? 0;
      patch(jobIndex, { status: "uploading" });

      try {
        const init = await apiFetch<InitResponse>(session, "/api/drive/upload/init", {
          method: "POST",
          body: JSON.stringify({
            name: asset.name ?? "upload",
            mimeType: asset.mimeType ?? "application/octet-stream",
            size,
          }),
        });

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const chunkSize = init.chunkSize || 5 * 1024 * 1024;
        const totalChunks = size === 0 ? 0 : Math.ceil(size / chunkSize);

        if (size === 0) {
          await uploadChunk(session, init.transferId, 0, new ArrayBuffer(0));
        } else {
          for (let index = 0; index < totalChunks; index += 1) {
            const start = index * chunkSize;
            const end = Math.min(start + chunkSize, size);
            const slice = blob.slice(start, end);
            const buffer = await slice.arrayBuffer();
            const chunkResult = await uploadChunk(session, init.transferId, index, buffer);
            patch(jobIndex, { sent: chunkResult.bytesReceived });

            if (chunkResult.status === "completed") break;
          }
        }

        patch(jobIndex, { status: "done", sent: size });
      } catch (err) {
        patch(jobIndex, {
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }

    setBusy(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload to GOLIATH</Text>
      <Text style={styles.subtitle}>
        Files go straight to the GOLIATH folder in your Drive using resumable chunks.
      </Text>

      <Pressable
        onPress={() => void pickAndUpload()}
        disabled={busy}
        style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.7 }]}
      >
        {busy ? <ActivityIndicator color="#04121f" /> : <Text style={styles.buttonText}>Choose files</Text>}
      </Pressable>

      {jobs.map((job, index) => {
        const pct = job.size > 0 ? Math.min(100, (job.sent / job.size) * 100) : job.status === "done" ? 100 : 0;
        return (
          <View key={`${job.name}-${index}`} style={styles.job}>
            <Text style={styles.jobName} numberOfLines={1}>
              {job.name}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${pct}%`,
                    backgroundColor:
                      job.status === "failed" ? C.bad : job.status === "done" ? C.ok : C.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.meta}>
              {job.status} · {Math.round(pct)}%{job.error ? ` · ${job.error}` : ""}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  title: { color: C.text, fontSize: 18, fontWeight: "600" },
  subtitle: { color: C.muted, fontSize: 12, lineHeight: 18 },
  button: {
    marginTop: 12,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#04121f", fontWeight: "700", fontSize: 15 },
  job: {
    marginTop: 10,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  jobName: { color: C.text, fontSize: 13, fontWeight: "500" },
  track: { height: 6, borderRadius: 999, backgroundColor: C.border, overflow: "hidden" },
  fill: { height: 6, borderRadius: 999 },
  meta: { color: C.muted, fontSize: 11 },
});