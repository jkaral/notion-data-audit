import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Notion Data Audit · Database quality checker",
  description:
    "Inspect a Notion data source, find structural risks, and review evidence-linked fixes before anything changes.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
