import { Tabs } from "expo-router";
import { Cloud, FolderOpen, UploadCloud } from "lucide-react-native";

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0b0d10" },
        headerTintColor: "#dfe3ea",
        tabBarStyle: { backgroundColor: "#0b0d10", borderTopColor: "#1d2128" },
        tabBarActiveTintColor: "#38a8ff",
        tabBarInactiveTintColor: "#737b88",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Files",
          tabBarIcon: ({ color, size }) => <FolderOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color, size }) => <UploadCloud color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <Cloud color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}