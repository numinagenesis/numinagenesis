"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const LINKS = [
  { href: "/",       label: "HOME"   },
  { href: "/summon", label: "SUMMON" },
  { href: "/docs",   label: "DOCS"   },
  { href: "/mint",   label: "MINT"   },
  { href: "/points", label: "POINTS" },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close overlay on route change
  useEffect(() => { setOpen(false); }, [path]);

  // Lock body scroll while menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav
        style={{ borderBottom: "1px solid #222222", background: "rgba(0,0,0,0.95)", backdropFilter: "blur(8px)" }}
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between">

        <Link href="/" className="pixel text-primary text-[10px] hover:opacity-70 transition-opacity">
          NUMINA
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className="pixel text-[7px] px-2 py-1.5 transition-colors"
              style={{
                color: path === href ? "#FFFFFF" : "#666666",
                borderBottom: path === href ? "1px solid #FFFFFF" : "1px solid transparent",
              }}>
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger — 44×44 touch target */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="sm:hidden flex flex-col items-center justify-center"
          style={{ minWidth: 44, minHeight: 44, background: "none", border: "none", cursor: "pointer", padding: 10, gap: 5 }}>
          <span style={{
            display: "block", width: 20, height: 2, background: "#FFFFFF",
            transform: open ? "translateY(7px) rotate(45deg)" : "none",
            transition: "transform 0.2s ease",
          }} />
          <span style={{
            display: "block", width: 20, height: 2, background: "#FFFFFF",
            opacity: open ? 0 : 1,
            transition: "opacity 0.15s ease",
          }} />
          <span style={{
            display: "block", width: 20, height: 2, background: "#FFFFFF",
            transform: open ? "translateY(-7px) rotate(-45deg)" : "none",
            transition: "transform 0.2s ease",
          }} />
        </button>
      </nav>

      {/* Mobile fullscreen overlay — z-[49] so sticky nav (z-50) stays on top */}
      <div
        className="sm:hidden fixed inset-0 z-[49] flex flex-col items-center justify-center"
        style={{
          background: "rgba(0,0,0,0.97)",
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}>
        <div className="flex flex-col items-center w-full">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href} href={href}
              onClick={() => setOpen(false)}
              className="pixel w-full text-center"
              style={{
                fontSize: 16,
                color: path === href ? "#FFFFFF" : "#555555",
                padding: "24px 0",
                borderBottom: "1px solid #111111",
                letterSpacing: "0.1em",
              }}>
              {label}
            </Link>
          ))}
        </div>
        <p className="pixel text-[7px] mt-12" style={{ color: "#333333" }}>
          ERC-8004 · TRUSTLESS AGENTS
        </p>
      </div>
    </>
  );
}
