import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";

interface Status {
  connected: boolean;
  email: string | null;
  configured: boolean;
  scopes: string[];
  reason?: string;
}

interface Usage {
  usedLabel: string;
  freeLabel: string;
  limitLabel: string;
}

const C = {
  bg: "#07080a",
  panel: "#101318",
  border: "#1d2128",
  text: "#dfe3ea",
  muted: "#737b88",
  accent: "#38a8ff",
  ok: "#34d399",
  warn: "#fbbf24",
  bad: "#f87171",
};

export default function AccountScreen() {
  const { session, signOut } = useSession();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const [statusRes, usageRes] = await Promise.all([
        apiFetch<Status>(session, "/api/google/status"),
        apiFetch<Usage>(session, "/api/drive/about").catch(() => null),
      ]);
      setStatus(statusRes);
      setUsage(usageRes);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Account &amp; storage</Text>
      <Text style={styles.email}>{session?.user.email ?? "signed in"}</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Google Drive</Text>
          <Text style={[styles.badge, { color: status?.connected ? C.ok : C.warn }]}>
            {status?.connected ? "connected" : "disconnected"}
          </Text>
        </View>
        {status?.email ? <Text style={styles.muted}>{status.email}</Text> : null}
        {status?.reason ? <Text style={styles.warn}>{status.reason}</Text> : null}
        <Text style={styles.hint}>
          Connect Drive from the web or desktop app (OAuth requires a browser). The mobile client uses the
          same encrypted session.
        </Text>
      </View>

      {usage ? (
        <View style={styles.card}>
          <Text style={styles.label}>Storage</Text>
          <Text style={styles.value}>
            {usage.usedLabel} used · {usage.freeLabel} free
          </Text>
          <Text style={styles.muted}>Plan limit: {usage.limitLabel}</Text>
        </View>
      ) : null}

      {status?.scopes?.length ? (
        <View style={styles.card}>
          <Text style={styles.label}>Granted scopes</Text>
          {status.scopes.map((scope) => (
            <Text key={scope} style={styles.scope}>
              {scope}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.danger, pressed && { opacity: 0.8 }]}
        onPress={async () => {
          await signOut();
          router.replace("/login");
        }}
      >
        <Text style={styles.dangerText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  title: { color: C.text, fontSize: 18, fontWeight: "600" },
  email: { color: C.muted, fontSize: 12 },
  card: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 },
  badge: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  value: { color: C.text, fontSize: 14 },
  muted: { color: C.muted, fontSize: 12 },
  hint: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  warn: { color: C.warn, fontSize: 11, lineHeight: 16 },
  scope: { color: C.accent, fontSize: 11 },
  danger: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)",
    backgroundColor: "rgba(248,113,113,0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerText: { color: C.bad, fontWeight: "600", fontSize: 14 },
});