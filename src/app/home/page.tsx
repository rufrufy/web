"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { HomeData } from "@/types";
import { AppShell, type NavKey } from "@/components/AppShell";
import { Home } from "@/components/Home";
import { Riwayat } from "@/components/Riwayat";
import { Laporan } from "@/components/Laporan";
import { Profil } from "@/components/Profil";
import { AbsenModal } from "@/components/AbsenModal";
import { Notifikasi } from "@/components/Notifikasi";
import { Kegiatan } from "@/components/Kegiatan";
import { TrainFaceModal } from "@/components/TrainFaceModal";
import { Loading } from "@/components/Feedback";

type ModalState =
  | { type: "none" }
  | {
      type: "absen";
      mode: "hadir" | "pulang";
      jenis: "absen" | "apel";
    }
  | { type: "notifikasi" }
  | { type: "kegiatan" }
  | { type: "scan" }
  | { type: "trainFace" };

export default function HomePage() {
  const router = useRouter();
  const { token, user, loading } = useAuth();
  const [nav, setNav] = useState<NavKey>("home");
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  useEffect(() => {
    if (!loading && (!token || !user)) {
      router.push("/login");
    }
  }, [loading, token, user, router]);

  useEffect(() => {
    if (!token || !user) return;
    api
      .home(token, user.nip, user.opd, user.kode_opd)
      .then((res) => {
        if (res.success && res.data) setHomeData(res.data);
      })
      .catch(() => {
        void 0;
      });
  }, [token, user]);

  if (loading || !token || !user) {
    return <Loading message="Memuat..." />;
  }

  return (
    <>
      <AppShell active={nav} onNavigate={setNav}>
        {nav === "home" && (
          <Home
            onNavigate={setNav}
            onOpenAbsen={(mode) =>
              setModal({ type: "absen", mode, jenis: "absen" })
            }
            onOpenApel={(mode) =>
              setModal({ type: "absen", mode, jenis: "apel" })
            }
            onOpenKegiatan={() => setModal({ type: "kegiatan" })}
            onOpenNotifikasi={() => setModal({ type: "notifikasi" })}
            onOpenScan={() => setModal({ type: "scan" })}
            onOpenTrainFace={() => setModal({ type: "trainFace" })}
          />
        )}
        {nav === "riwayat" && <Riwayat />}
        {nav === "laporan" && <Laporan />}
        {nav === "profil" && <Profil />}
      </AppShell>

      {modal.type === "absen" && homeData && (
        <AbsenModal
          mode={modal.mode}
          jenis={modal.jenis}
          homeData={homeData}
          onClose={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "absen" && !homeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-500">
              Data home belum dimuat. Coba refresh.
            </p>
            <button
              onClick={() => setModal({ type: "none" })}
              className="btn-outline mt-4"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {modal.type === "scan" && homeData && (
        <AbsenModal
          mode="hadir"
          jenis="absen"
          homeData={homeData}
          onClose={() => setModal({ type: "none" })}
        />
      )}

      {modal.type === "notifikasi" && (
        <Notifikasi onClose={() => setModal({ type: "none" })} />
      )}

      {modal.type === "kegiatan" && (
        <Kegiatan onClose={() => setModal({ type: "none" })} />
      )}

      {modal.type === "trainFace" && (
        <TrainFaceModal onClose={() => setModal({ type: "none" })} />
      )}
    </>
  );
}
