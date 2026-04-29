import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpsFlow AI — Enterprise Operations Assistant",
  description:
    "AI-powered operations assistant for enterprise teams. Built with Next.js 14, FastAPI, AWS Lambda, and Anthropic Claude.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-64 flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
