"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { HomeResponse, NotifikasiListResponse } from "@/types";
import { Loading, ErrorState } from "@/components/Feedback";
import {
  BellIcon,
  CameraIcon,
  LocationIcon,
  QrIcon,
  ActivityIcon,
  ClockIcon,
  CalendarIcon,
  RefreshIcon,
  CheckIcon,
} from "@/components/Icons";
import type { NavKey } from "@/components/AppShell";

interface HomeProps {
  onNavigate: (key: NavKey) => void;
  onOpenAbsen: (mode: "hadir" | "pulang") => void;
  onOpenApel: (mode: "hadir" | "pulang") => void;
  onOpenKegiatan: () => void;
  onOpenNotifikasi: () => void;
  onOpenScan: () => void;
  onOpenTrainFace: () => void;
}

export function Home({
  onNavigate,
  onOpenAbsen,
  onOpenApel,
  onOpenKegiatan,
  onOpenNotifikasi,
  onOpenScan,
  onOpenTrainFace,
}: HomeProps) {
  const { token, user } = useAuth();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [notifCount, setNotifCount] = useState(0);

  const fetchHome = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.home(token, user.nip, user.opd, user.kode_opd);
      setData(res);
      setNotifCount(
        parseInt(res.data?.count_notification || "0", 10) || 0
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchHome();
  }, [fetchHome]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <Loading message="Memuat beranda..." />;
  if (error || !data || !data.data)
    return <ErrorState message={error || "Data tidak tersedia"} onRetry={fetchHome} />;

  const d = data.data;
  const metodeFace = d.metode_absen?.includes("Face") ?? false;
  const metodeQr = d.show_scanner || (d.metode_absen?.includes("QR") ?? false);
  const trainedFaceEmpty =
    !user?.trained_face || user.trained_face === "" || user.trained_face === "{}";
  const needsTrainFace =
    metodeFace && (trainedFaceEmpty || d.enable_retrain === "1");
  const jamKerjaHariIni = d.jam_kerja?.find(
    (j) => j.hari_masuk === d.hari?.toUpperCase()
  );

  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4 p-4">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-90">{user?.opd}</p>
              <h2 className="mt-1 text-lg font-bold">{user?.nama}</h2>
              <p className="text-xs opacity-80">{user?.jabatan}</p>
            </div>
            <button
              onClick={onOpenNotifikasi}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            >
              <BellIcon />
              {notifCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ClockIcon />
            <span className="text-2xl font-bold tabular-nums">{timeStr}</span>
            <span className="text-sm opacity-80">WIB</span>
          </div>
          <p className="mt-1 text-sm opacity-90">{dateStr}</p>
        </div>
      </div>

      <button
        onClick={fetchHome}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
      >
        <RefreshIcon />
        Refresh
      </button>

      {(needsTrainFace) && (
        <div className="card border-2 border-warning p-4">
          <div className="mb-2 flex items-center gap-2">
            <CameraIcon />
            <h3 className="font-semibold text-warning">Pendaftaran Wajah</h3>
          </div>
          <p className="mb-3 text-sm text-gray-600">
            Wajah Anda belum terdaftar. Daftarkan wajah untuk dapat melakukan
            absen face.
          </p>
          <button onClick={onOpenTrainFace} className="btn-primary w-full">
            <CameraIcon />
            Daftar Wajah Sekarang
          </button>
        </div>
      )}

      {(d.jenis_absen?.length ?? 0) > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarIcon />
            <h3 className="font-semibold">Absensi</h3>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Hari ini: {d.hari} • {d.tanggal}
          </p>

          {jamKerjaHariIni && (
            <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm">
              <span className="text-gray-600">Jam Kerja: </span>
              <span className="font-semibold">
                {jamKerjaHariIni.jam_masuk} - {jamKerjaHariIni.jam_pulang}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                ({jamKerjaHariIni.alias})
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenAbsen("hadir")}
              className="btn-success"
            >
              <CheckIcon />
              Absen Masuk
            </button>
            <button
              onClick={() => onOpenAbsen("pulang")}
              className="btn-outline"
            >
              <CheckIcon />
              Absen Pulang
            </button>
          </div>
        </div>
      )}

      {d.jenis_absen?.includes("Apel") && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <BellIcon />
            <h3 className="font-semibold">Apel</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenApel("hadir")}
              className="btn-primary"
            >
              Apel Hadir
            </button>
            {d.enable_apel_pulang === "1" && (
              <button
                onClick={() => onOpenApel("pulang")}
                className="btn-outline"
              >
                Apel Pulang
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {metodeFace && (
          <button
            onClick={() => onOpenAbsen("hadir")}
            className="card flex flex-col items-center gap-2 p-4 text-center hover:border-primary"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-primary">
              <CameraIcon />
            </div>
            <span className="text-xs font-medium">Face</span>
          </button>
        )}
        {metodeQr && (
          <button
            onClick={onOpenScan}
            className="card flex flex-col items-center gap-2 p-4 text-center hover:border-primary"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-primary">
              <QrIcon />
            </div>
            <span className="text-xs font-medium">Scan QR</span>
          </button>
        )}
        <button
          onClick={onOpenKegiatan}
          className="card flex flex-col items-center gap-2 p-4 text-center hover:border-primary"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-primary">
            <ActivityIcon />
          </div>
          <span className="text-xs font-medium">Kegiatan</span>
        </button>
      </div>

      {d.lokasi_absen && d.lokasi_absen.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <LocationIcon />
            <h3 className="font-semibold">Lokasi Absen</h3>
          </div>
          <div className="space-y-2">
            {d.lokasi_absen.map((lok) => (
              <div
                key={lok.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{lok.keterangan}</p>
                  <p className="text-xs text-gray-500">
                    {lok.type_lokasi} • Radius {lok.radius}m
                  </p>
                </div>
                <span className="badge bg-blue-100 text-blue-700">
                  {lok.kode_opd}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("riwayat")}
          className="card p-4 text-left hover:border-primary"
        >
          <p className="text-sm font-semibold text-gray-700">Riwayat Absen</p>
          <p className="text-xs text-gray-400">Lihat history kehadiran</p>
        </button>
        <button
          onClick={() => onNavigate("laporan")}
          className="card p-4 text-left hover:border-primary"
        >
          <p className="text-sm font-semibold text-gray-700">Laporan</p>
          <p className="text-xs text-gray-400">Statistik & rekap</p>
        </button>
      </div>
    </div>
  );
}
