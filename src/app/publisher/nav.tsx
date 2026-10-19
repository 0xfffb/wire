"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: Array<[string, string]> = [
  ["概览", "/publisher"],
  ["持仓", "/publisher/holdings"],
  ["记录", "/publisher/activity"],
  ["连接", "/publisher/broker"],
  ["公开", "/publisher/share"],
  ["预览", "/publisher/preview"],
];

export function PublisherNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-8 space-y-1">
      {links.map(([label, href]) => {
        const active = href === "/publisher" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`block rounded-md px-2 py-1.5 text-sm ${active ? "bg-[#fafafa] text-black" : "text-[#666] hover:bg-[#fafafa] hover:text-black"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
