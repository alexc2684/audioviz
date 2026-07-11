import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep / Signal — Audio Reactive Visuals",
  description: "A cinematic, multi-scene audio visualizer for deep and melodic house.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Deep / Signal",
    description: "A cinematic, multi-scene audio visualizer for deep and melodic house.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
