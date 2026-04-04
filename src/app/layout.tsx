import type { Metadata } from "next";
import type { User } from "@supabase/supabase-js";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { LastSeenHeartbeat } from "@/components/last-seen-heartbeat";
import { RefreshToHome } from "@/components/refresh-to-home";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { isAdminEmail, isSupabaseConfigured } from "@/lib/env";
import { getSiteUrl } from "@/lib/site-url";
import { isProfileQuestionnaireComplete } from "@/lib/profile-completion";
import { createClient } from "@/lib/supabase/server";
import { themeBootstrapScript } from "@/lib/theme-storage";
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
  "Beta: genre-agnostic discovery for emerging artists, producers, DJs, and venues—collaborators nearby, not another global feed. Roadmap: ~15s card audio, ID + SoundCloud verification, Stripe Connect / Plaid checkout, label pitching, dual roles, tighter proximity. Fair pricing—not a steep monthly gate.";

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
  let isAdmin = false;
  const supabaseEnabled = isSupabaseConfigured();

  if (supabaseEnabled) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
      if (user) {
        isAdmin = isAdminEmail(user.email);
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
      isAdmin = false;
    }
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <Script
          id="prodlink-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <ThemeProvider>
          <RefreshToHome />
          <LastSeenHeartbeat enabled={supabaseEnabled && Boolean(user)} />
          <div className="flex min-h-full flex-1 flex-col md:flex-row">
            <SiteHeader
              user={user}
              isAdmin={isAdmin}
              profileAvatarUrl={profileAvatarUrl}
              supabaseEnabled={supabaseEnabled}
              unreadMessages={unreadMessages}
              unreadNotifications={unreadNotifications}
              showBuildProfileNav={showBuildProfileNav}
            />
            <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </div>
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
