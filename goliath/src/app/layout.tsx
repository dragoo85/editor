import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GOLIATH — your Drive, rebuilt",
  description:
    "GOLIATH is a premium cloud storage workspace on top of your own Google Drive: file manager, resumable transfers, AI document analysis and a controlled agent.",
  applicationName: "GOLIATH",
};

export const viewport: Viewport = {
  themeColor: "#07080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}