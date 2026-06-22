"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  HomeIcon,
  RiwayatIcon,
  LaporanIcon,
  ProfilIcon,
  LogoutIcon,
} from "@/components/Icons";
import { LogoSemarang } from "@/components/Logo";

type NavKey = "home" | "riwayat" | "laporan" | "profil";

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Beranda", icon: <HomeIcon size={22} /> },
  { key: "riwayat", label: "Riwayat", icon: <RiwayatIcon size={22} /> },
  { key: "laporan", label: "Laporan", icon: <LaporanIcon size={22} /> },
  { key: "profil", label: "Profil", icon: <ProfilIcon size={22} /> },
];

export const NAV_BAR_HEIGHT = 64;

export function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  children: React.ReactNode;
}) {
  const { user, logout, token } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!token || !user) {
      logout();
      return;
    }
    setLoggingOut(true);
    try {
      await api.logout(token, user.nip);
    } catch {
      void 0;
    } finally {
      logout();
    }
  };

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-gray-100 shadow-sm">
      <header className="safe-top sticky top-0 z-40 flex items-center justify-between bg-primary px-4 py-3 text-white shadow-sm">
        <LogoSemarang size={36} />
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-white/10 active:scale-95 disabled:opacity-50"
          aria-label="Keluar"
        >
          <LogoutIcon size={18} />
          <span className="hidden xs:inline sm:inline">
            {loggingOut ? "..." : "Keluar"}
          </span>
        </button>
      </header>

      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: `calc(${NAV_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 8px)` }}
      >
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navigasi utama"
      >
        <div
          className="flex"
          style={{ height: `${NAV_BAR_HEIGHT}px` }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-10 rounded-full bg-primary" />
                )}
                <span className={isActive ? "scale-110 transition-transform" : "transition-transform"}>
                  {item.icon}
                </span>
                <span className="text-[11px] font-medium leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export type { NavKey };
