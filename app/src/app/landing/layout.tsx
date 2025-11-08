import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { AccentPicker } from "@/components/landing/AccentPicker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Star Resonance - Blue Protocol Analytics",
  description: "Master the stars in Blue Protocol with comprehensive combat analytics and performance tracking.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nested layouts must not render <html> or <body> — only the root layout should.
  // Apply the same classes on a wrapper div instead to avoid hydration mismatches.
  return (
    <div className={`h-screen dark ${geistSans.variable} ${geistMono.variable} antialiased bg-[#02030a] text-white overflow-hidden`}>
      <Providers>
        {/* Background Effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-[#050814] via-[#02030a] to-[#000] pointer-events-none" />

        {/* Navigation */}
        <LandingNavbar />

        {/* Accent Picker */}
        <div className="fixed top-20 right-4 z-50">
          <AccentPicker />
        </div>

        {/* Main Content */}
        <main className="relative z-10">
          {children}
        </main>
      </Providers>
    </div>
  );
}