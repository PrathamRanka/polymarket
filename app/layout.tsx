import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Providers from "@/components/Providers";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PredictMarket",
    template: "PredictMarket | %s",
  },
  description: "Trade real-world predictions with virtual coins.",
  openGraph: {
    title: "PredictMarket",
    description: "Virtual-coin prediction markets built for skill.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100">
        <Providers>
          <div className="flex min-h-full flex-col">
            <Navbar />
            {children}
            <Footer />
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
