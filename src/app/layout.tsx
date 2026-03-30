import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "prod.me — network & discover for music",
  description:
    "A bridge between artists, producers, DJs, and venues. Build your profile, discover by niche, explore bundles — payments later.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: User | null = null;
  const supabaseEnabled = isSupabaseConfigured();

  if (supabaseEnabled) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      user = null;
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        <SiteHeader user={user} supabaseEnabled={supabaseEnabled} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
