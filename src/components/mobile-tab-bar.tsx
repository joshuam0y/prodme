"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProfileAvatar } from "@/components/profile-avatar";

type Props = {
  signedIn: boolean;
  profileAvatarUrl?: string | null;
  profileName?: string | null;
  unreadMessages?: number;
  unreadNotifications?: number;
  showBuildProfileNav?: boolean;
};

type Tab = {
  href: string;
  label: string;
  icon: string;
  badge?: string | null;
  avatar?: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({
  signedIn,
  profileAvatarUrl = null,
  profileName = null,
  unreadMessages = 0,
  unreadNotifications = 0,
  showBuildProfileNav = true,
}: Props) {
  const pathname = usePathname();

  const tabs: Tab[] = signedIn
    ? [
        { href: "/explore", label: "Discover", icon: "⌂" },
        {
          href: "/matches",
          label: "Messages",
          icon: "✉",
          badge: unreadMessages > 0 ? (unreadMessages > 9 ? "9+" : String(unreadMessages)) : null,
        },
        {
          href: "/notifications",
          label: "Alerts",
          icon: "◉",
          badge:
            unreadNotifications > 0
              ? unreadNotifications > 9
                ? "9+"
                : String(unreadNotifications)
              : null,
        },
        {
          href: showBuildProfileNav ? "/onboarding" : "/profile",
          label: "Profile",
          icon: "•",
          avatar: !showBuildProfileNav,
        },
      ]
    : [
        { href: "/explore", label: "Discover", icon: "⌂" },
        { href: "/bundles", label: "Bundles", icon: "▣" },
        { href: "/how-it-works", label: "How it works", icon: "?" },
        { href: "/login", label: "Sign in", icon: "→" },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const active = isActivePath(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                  active
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                }`}
              >
                {tab.avatar ? (
                  <ProfileAvatar
                    name={profileName}
                    avatarUrl={profileAvatarUrl}
                    sizeClassName="h-5 w-5"
                    textClassName="text-[8px] font-semibold text-zinc-100"
                    ringClassName={active ? "border border-amber-500/35 bg-zinc-800/70" : "border border-white/10 bg-zinc-800/60"}
                  />
                ) : (
                  <span className="text-sm leading-none" aria-hidden>
                    {tab.icon}
                  </span>
                )}
                <span className="truncate">{tab.label}</span>
                {tab.badge ? (
                  <span className="absolute right-3 top-2 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-zinc-950">
                    {tab.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
