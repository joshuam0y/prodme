"use client";

import Link, { type LinkProps } from "next/link";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<
  LinkProps & {
    className?: string;
  }
>;

export function MobileNavLink({ children, className, ...props }: Props) {
  return (
    <Link
      {...props}
      className={className}
      onClick={(e) => {
        const host = (e.currentTarget as HTMLElement).closest("details");
        if (host instanceof HTMLDetailsElement) {
          host.open = false;
        }
      }}
    >
      {children}
    </Link>
  );
}
