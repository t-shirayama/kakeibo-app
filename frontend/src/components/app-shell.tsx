"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  FileUp,
  ListTree,
  PiggyBank,
  Tags,
  type LucideIcon,
  NotebookText,
  Settings,
  WalletCards,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
  { href: "/transactions", label: "明細一覧", icon: FileText },
  { href: "/income-settings", label: "収入設定", icon: WalletCards },
  { href: "/budgets", label: "予算管理", icon: PiggyBank },
  { href: "/upload", label: "アップロード", icon: FileUp },
  { href: "/categories", label: "カテゴリ管理", icon: ListTree },
  { href: "/category-rules", label: "分類ルール", icon: Tags },
];

const utilityNavItems = [
  { href: "/audit-logs", label: "監査ログ", icon: ClipboardList },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // 現在のパスからサイドバーの選択状態を決め、主要画面の導線を一箇所にまとめる。
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <div className="app-shell">
        <aside className="sidebar" aria-label="メインナビゲーション">
          <Link className="brand" href="/dashboard" prefetch={false}>
            <span className="brand-mark">
              <NotebookText size={14} aria-hidden="true" />
            </span>
            <span>かけいぼノート</span>
          </Link>

          <nav className="sidebar-nav">
            <div className="nav-list">
              {navItems.map((item) => (
                <NavLinkItem href={item.href} icon={item.icon} isActive={isNavItemActive(pathname, item.href)} key={item.href} label={item.label} />
              ))}
            </div>
            <div className="nav-list nav-list-utility">
              {utilityNavItems.map((item) => (
                <NavLinkItem href={item.href} icon={item.icon} isActive={pathname === item.href} key={item.href} label={item.label} />
              ))}
            </div>
          </nav>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/reports";
  }
  return pathname === href;
}

function NavLinkItem({ href, icon: Icon, isActive, label }: { href: string; icon: LucideIcon; isActive: boolean; label: string }) {
  return (
    <Link aria-current={isActive ? "page" : undefined} className={`nav-link${isActive ? " active" : ""}`} href={href} prefetch={false}>
      <Icon size={15} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
