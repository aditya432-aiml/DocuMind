import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuMind - AI Document Intelligence",
  description:
    "Drop a PDF. Ask anything. DocuMind's AI agents read, understand, and answer your questions in seconds.",
  openGraph: {
    title: "DocuMind - AI Document Intelligence",
    description: "Drop a PDF. Ask anything. Get answers instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
