import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/src/components/app-providers";

export const metadata: Metadata = {
  title: "Campus Notifications Hub",
  description: "Responsive priority inbox for campus notifications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
