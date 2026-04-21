"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",       label: "HOME"   },
  { href: "/summon", label: "SUMMON" },
  { href: "/mint",   label: "MINT"   },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav style={{ borderBottom: "1px solid #222222", background: "rgba(0,0,0,0.95)", backdropFilter: "blur(8px)" }}
         className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="pixel text-primary text-[10px] hover:opacity-70 transition-opacity">
        NUMINA
      </Link>
      <div className="flex items-center gap-1 flex-wrap justify-end">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href}
            className="pixel text-[7px] px-2 py-1.5 transition-colors"
            style={{ color: path === href ? "#FFFFFF" : "#666666",
                     borderBottom: path === href ? "1px solid #FFFFFF" : "1px solid transparent" }}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
