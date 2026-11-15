import { useEffect } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../lib/session";

export default function Index() {
  const { session, loading } = useSession();

  useEffect(() => {
    // Nothing to do: the redirect below is declarative.
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#07080a" }}>
        <ActivityIndicator color="#38a8ff" />
      </View>
    );
  }

  return <Redirect href={session ? "/(app)" : "/login"} />;
}