import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { RefreshToHome } from "@/components/refresh-to-home";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured } from "@/lib/env";
import { getSiteUrl } from "@/lib/site-url";
import { isProfileQuestionnaireComplete } from "@/lib/profile-completion";
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

const description =
  "A bridge between artists, producers, DJs, and venues. Build your profile, discover by style, explore bundles — payments later.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "prodLink — network & discover for music",
    template: "%s · prodLink",
  },
  description,
  icons: {
    icon: "/prodlink-logo-v2.svg",
    shortcut: "/prodlink-logo-v2.svg",
    apple: "/prodlink-logo-v2.svg",
  },
  openGraph: {
    title: "prodLink — network & discover for music",
    description,
    type: "website",
    locale: "en_US",
    images: ["/prodlink-logo-v2.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "prodLink",
    description,
    images: ["/prodlink-logo-v2.svg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: User | null = null;
  let profileAvatarUrl: string | null = null;
  let showBuildProfileNav = true;
  let unreadMessages = 0;
  let unreadNotifications = 0;
  const supabaseEnabled = isSupabaseConfigured();

  if (supabaseEnabled) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
      if (user) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("onboarding_completed_at, niche, role, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        profileAvatarUrl = profileRow?.avatar_url?.trim() || null;
        if (isProfileQuestionnaireComplete(profileRow)) {
          showBuildProfileNav = false;
        }
        const { count } = await supabase
          .from("match_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null);
        unreadMessages = count ?? 0;
        try {
          const { count: notifCount } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("read_at", null);
          unreadNotifications = notifCount ?? 0;
        } catch {
          unreadNotifications = 0;
        }
      }
    } catch {
      user = null;
      profileAvatarUrl = null;
      unreadMessages = 0;
      unreadNotifications = 0;
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        <RefreshToHome />
        <SiteHeader
          user={user}
          profileAvatarUrl={profileAvatarUrl}
          supabaseEnabled={supabaseEnabled}
          unreadMessages={unreadMessages}
          unreadNotifications={unreadNotifications}
          showBuildProfileNav={showBuildProfileNav}
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
