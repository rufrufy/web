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

type NavKey = "home" | "riwayat" | "laporan" | "profil";

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Beranda", icon: <HomeIcon /> },
  { key: "riwayat", label: "Riwayat", icon: <RiwayatIcon /> },
  { key: "laporan", label: "Laporan", icon: <LaporanIcon /> },
  { key: "profil", label: "Profil", icon: <ProfilIcon /> },
];

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-gray-100">
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            S
          </div>
          <span className="font-semibold">SADEWA</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          <LogoutIcon />
          {loggingOut ? "..." : "Keluar"}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-2xl border-t border-gray-200 bg-white">
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 transition ${
                active === item.key
                  ? "text-primary"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export type { NavKey };
