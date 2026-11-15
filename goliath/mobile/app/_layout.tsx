import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "../lib/session";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0b0d10" },
          headerTintColor: "#dfe3ea",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#07080a" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}