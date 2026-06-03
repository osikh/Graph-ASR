import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PlaybackProvider } from "@/store/playback";
import TopNav from "@/components/shell/TopNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-var", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Graph-Augmented ARS",
  description: "Adaptive reasoning system with graph-enhanced memory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable}`}>
        <PlaybackProvider>
          <div className="app">
            <TopNav />
            {children}
          </div>
        </PlaybackProvider>
      </body>
    </html>
  );
}
