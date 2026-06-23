"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type {
  RiwayatAbsenResponse,
  StatistikBulananResponse,
} from "@/types";
import { Loading, ErrorState, EmptyState } from "@/components/Feedback";
import { CalendarIcon, ClockIcon } from "@/components/Icons";

const UPSTREAM_ORIGIN = "https://secure-sadewa.semarangkota.go.id";

// Backend field name for the attendance photo is not yet confirmed; try each.
const FOTO_FIELDS = [
  "foto",
  "foto_depan",
  "foto_hadir",
  "foto_pulang",
  "depan",
  "photo",
  "gambar",
  "image",
  "file_foto",
  "url_foto",
];

function extractFoto(
  r: Record<string, unknown>
): { hadir: string | null; pulang: string | null } {
  const hadir =
    pickFirst(r, ["foto_hadir", "foto_depan_hadir", "depan_hadir"]) ||
    pickFirst(r, FOTO_FIELDS);
  const pulang =
    pickFirst(r, ["foto_pulang", "foto_depan_pulang", "depan_pulang"]) ||
    pickFirst(r, FOTO_FIELDS);
  return { hadir: resolveUrl(hadir), pulang: resolveUrl(pulang) };
}

function pickFirst(
  r: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const f of fields) {
    const v = r[f];
    if (typeof v === "string" && v.trim() !== "" && v.trim() !== "-") {
      return v.trim();
    }
  }
  return null;
}

function resolveUrl(val: string | null): string | null {
  if (!val) return null;
  if (/^(https?:|data:|blob:)/i.test(val)) return val;
  if (val.startsWith("/")) return `${UPSTREAM_ORIGIN}${val}`;
  return `${UPSTREAM_ORIGIN}/${val}`;
}

export function Riwayat() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"absen" | "apel" | "statistik">("absen");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [riwayat, setRiwayat] = useState<RiwayatAbsenResponse | null>(null);
  const [riwayatApel, setRiwayatApel] = useState<RiwayatAbsenResponse | null>(
    null
  );
  const [statistik, setStatistik] = useState<StatistikBulananResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRiwayat = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.riwayatAbsen(token, user.nip, tanggal);
      console.log("[Riwayat] raw riwayat-absen response:", res);
      setRiwayat(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  }, [token, user, tanggal]);

  const fetchRiwayatApel = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.riwayatAbsenApel(token, user.nip, tanggal);
      console.log("[Riwayat] raw riwayat-absen-apel response:", res);
      setRiwayatApel(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  }, [token, user, tanggal]);

  const fetchStatistik = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.statistikBulanan(token, user.nip);
      setStatistik(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat statistik");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (tab === "absen") fetchRiwayat();
    else if (tab === "apel") fetchRiwayatApel();
    else fetchStatistik();
  }, [tab, fetchRiwayat, fetchRiwayatApel, fetchStatistik]);

  const entries = (riwayat?.data || {}) as Record<string, unknown[]>;
  const apelEntries = (riwayatApel?.data || {}) as Record<string, unknown[]>;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold text-gray-900">Riwayat</h2>

      <div className="flex rounded-lg bg-white p-1 shadow-sm">
        {(["absen", "apel", "statistik"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "bg-primary text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "absen" ? "Absen" : t === "apel" ? "Apel" : "Statistik"}
          </button>
        ))}
      </div>

      {tab !== "statistik" && (
        <div className="card flex items-center gap-2 p-3">
          <CalendarIcon />
          <input
            type="date"
            className="input flex-1"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            disabled={loading}
          />
        </div>
      )}

      {loading && <Loading message="Memuat..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && tab === "absen" && (
        <RiwayatList
          title="Riwayat Absen"
          entries={entries}
          response={riwayat}
        />
      )}

      {!loading && !error && tab === "apel" && (
        <RiwayatList
          title="Riwayat Apel"
          entries={apelEntries}
          response={riwayatApel}
        />
      )}

      {!loading && !error && tab === "statistik" && statistik && (
        <StatistikView data={statistik} />
      )}
    </div>
  );
}

function RiwayatList({
  title,
  entries,
  response,
}: {
  title: string;
  entries: Record<string, unknown[]>;
  response: RiwayatAbsenResponse | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const keys = Object.keys(entries);

  if (keys.length === 0) {
    return (
      <>
        {response && (
          <div className="card p-3 text-sm text-gray-500">
            {response.message}
          </div>
        )}
        <EmptyState message={`Tidak ada data ${title.toLowerCase()}`} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {response?.message && (
        <div className="card p-3 text-sm text-gray-600">
          {response.message}
        </div>
      )}
      {keys.map((date) => (
        <div key={date} className="card p-4">
          <h3 className="mb-3 font-semibold text-gray-700">{date}</h3>
          <div className="space-y-2">
            {entries[date].map((item, i) => {
              const r = item as Record<string, unknown>;
              const { hadir, pulang } = extractFoto(r);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                >
                  <FotoThumb
                    src={hadir}
                    fallback={<ClockIcon />}
                    onOpen={() => hadir && setPreview(hadir)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {String(r.jenis_jam_kerja || "-")} •{" "}
                      {String(r.alias_jam_kerja || "")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Masuk: {formatTime(String(r.jam_absen_hadir || "-"))}
                      {r.selisih_hadir ? ` (${r.selisih_hadir})` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      Pulang: {formatTime(String(r.jam_absen_pulang || "-"))}
                    </p>
                  </div>
                  {pulang && pulang !== hadir && (
                    <FotoThumb
                      src={pulang}
                      fallback={<ClockIcon />}
                      onOpen={() => setPreview(pulang)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Foto absen"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

function FotoThumb({
  src,
  fallback,
  onOpen,
}: {
  src: string | null;
  fallback: ReactNode;
  onOpen: () => void;
}) {
  if (!src) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary">
        {fallback}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 ring-2 ring-transparent transition hover:ring-primary active:scale-95"
      aria-label="Lihat foto"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Foto absen"
        className="h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </button>
  );
}

function StatistikView({
  data,
}: {
  data: StatistikBulananResponse;
}) {
  const s = data.data;
  const items = [
    { label: "Hari Kerja", value: s.jumlah_hari_kerja, color: "text-blue-600" },
    { label: "Hadir", value: s.jumlah_hadir, color: "text-green-600" },
    {
      label: "Tidak Hadir",
      value: s.jumlah_tidak_hadir,
      color: "text-red-600",
    },
    {
      label: "Konfirmasi",
      value: s.jumlah_konfirmasi,
      color: "text-yellow-600",
    },
    { label: "Cuti", value: s.jumlah_cuti, color: "text-purple-600" },
    {
      label: "Total Telat",
      value: s.jumlah_telat,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4 text-center">
        <p className="text-sm text-gray-500">Statistik Bulan</p>
        <p className="text-lg font-bold text-primary">{data.bulan}</p>
        <p className="mt-1 text-xs text-gray-400">{data.message}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>
              {item.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(t: string): string {
  if (!t || t === "-") return "-";
  if (t.includes(" ")) {
    const parts = t.split(" ");
    return parts[1] || t;
  }
  return t;
}
