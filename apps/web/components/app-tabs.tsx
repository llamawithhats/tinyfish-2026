"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/help", label: "Help" }
];

export function AppTabs() {
  const pathname = usePathname();

  return (
    <nav className="appTabs" aria-label="Primary">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            className={`appTab${isActive ? " active" : ""}`}
            href={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
