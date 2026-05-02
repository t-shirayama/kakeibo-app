"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  FileUp,
  LayoutDashboard,
  ListTree,
  NotebookText,
  Settings,
  WalletCards,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/transactions", label: "明細一覧", icon: FileText },
  { href: "/income-settings", label: "収入設定", icon: WalletCards },
  { href: "/upload", label: "アップロード", icon: FileUp },
  { href: "/categories", label: "カテゴリ管理", icon: ListTree },
  { href: "/reports", label: "レポート", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  // 現在のパスからサイドバーの選択状態を決め、主要画面の導線を一箇所にまとめる。
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <div className="app-shell">
        <aside className="sidebar" aria-label="メインナビゲーション">
          <Link className="brand" href="/dashboard">
            <span className="brand-mark">
              <NotebookText size={14} aria-hidden="true" />
            </span>
            <span>かけいぼノート</span>
          </Link>

          <nav className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link className={`nav-link${isActive ? " active" : ""}`} href={item.href} key={item.href}>
                  <Icon size={15} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-upload">
            <p>PDFをアップロードして明細を自動で取り込みます。</p>
            <Link className="button" href="/upload">
              PDFアップロード
            </Link>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
