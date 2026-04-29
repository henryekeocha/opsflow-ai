"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  GitCompare,
  UserSearch,
  Network,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/brief", label: "Content Brief", icon: FileText },
  { href: "/compare", label: "Model Comparator", icon: GitCompare },
  { href: "/enrich", label: "Lead Enrichment", icon: UserSearch },
  { href: "/architecture", label: "Architecture", icon: Network },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">OpsFlow AI</p>
          <p className="text-xs text-muted-foreground">Enterprise Ops</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Features
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t p-4">
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs font-medium">Stack</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {["Next.js 14", "FastAPI", "Lambda", "Terraform", "Claude"].map((tech) => (
              <span
                key={tech}
                className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
