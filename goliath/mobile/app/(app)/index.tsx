import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../../lib/api";
import { useSession } from "../../lib/session";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  kind: "file" | "folder";
  size: number;
  modifiedTime: string;
}

const C = {
  bg: "#07080a",
  panel: "#101318",
  border: "#1d2128",
  text: "#dfe3ea",
  muted: "#737b88",
  accent: "#38a8ff",
};

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export default function FilesScreen() {
  const { session } = useSession();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (target: string | null) => {
      if (!session) return;
      setError(null);
      try {
        const query = target ? `?folderId=${encodeURIComponent(target)}` : "";
        const payload = await apiFetch<{ items: DriveItem[] }>(session, `/api/drive/files${query}`);
        setItems(payload.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void load(folderId);
  }, [folderId, load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => setFolderId(null)}>
          <Text style={styles.breadcrumb}>GOLIATH</Text>
        </Pressable>
        <Text style={styles.count}>{items.length} items</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.accent}
              onRefresh={() => {
                setRefreshing(true);
                void load(folderId);
              }}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => (item.kind === "folder" ? setFolderId(item.id) : undefined)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta}>
                  {item.kind === "folder" ? "Folder" : formatSize(item.size)} ·{" "}
                  {new Date(item.modifiedTime).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.muted}>This folder is empty.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  breadcrumb: { color: C.accent, fontSize: 13, fontWeight: "600" },
  count: { color: C.muted, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 12, gap: 8 },
  row: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  name: { color: C.text, fontSize: 14, fontWeight: "500" },
  meta: { color: C.muted, fontSize: 11, marginTop: 2 },
  muted: { color: C.muted, textAlign: "center", marginTop: 40, fontSize: 13 },
  error: {
    color: "#f87171",
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    backgroundColor: "rgba(248,113,113,0.08)",
  },
});