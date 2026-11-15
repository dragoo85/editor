import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { isSupabaseConfigured } from "../lib/api";
import { useSession } from "../lib/session";

const C = {
  bg: "#07080a",
  panel: "#101318",
  border: "#1d2128",
  text: "#dfe3ea",
  muted: "#737b88",
  accent: "#38a8ff",
  danger: "#f87171",
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.brand}>GOLIATH</Text>
        <Text style={styles.subtitle}>Your Drive, rebuilt. Sign in to continue.</Text>

        {!isSupabaseConfigured ? (
          <Text style={styles.warn}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable sign-in.
          </Text>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={C.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
          placeholderTextColor={C.muted}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void submit()}
          disabled={busy || !isSupabaseConfigured}
          style={({ pressed }) => [styles.button, (pressed || busy) && { opacity: 0.7 }]}
        >
          {busy ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={styles.buttonText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}>
          <Text style={styles.link}>
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  brand: { color: C.text, fontSize: 26, fontWeight: "700", letterSpacing: 8 },
  subtitle: { color: C.muted, fontSize: 13, marginBottom: 16 },
  label: { color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.4, marginTop: 10 },
  input: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#04121f", fontWeight: "700", fontSize: 15 },
  link: { marginTop: 18, color: C.muted, fontSize: 13, textAlign: "center" },
  warn: {
    color: "#fbbf24",
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
  error: {
    color: C.danger,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
  },
});