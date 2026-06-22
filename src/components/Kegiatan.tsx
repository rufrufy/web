"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { KegiatanListResponse } from "@/types";
import { Loading, ErrorState, EmptyState } from "@/components/Feedback";
import { PlusIcon, ArrowLeftIcon } from "@/components/Icons";

export function Kegiatan({ onClose }: { onClose: () => void }) {
  const { token, user } = useAuth();
  const [data, setData] = useState<KegiatanListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetch = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.listKegiatan(token, user.nip, user.opd);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat kegiatan");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="flex items-center gap-1">
              <ArrowLeftIcon />
            </button>
            <span className="font-semibold">Kegiatan</span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg px-3 py-1 text-sm hover:bg-white/10"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <Loading message="Memuat kegiatan..." />}
          {error && <ErrorState message={error} onRetry={fetch} />}
          {!loading && !error && data && (
            <>
              {data.data.length === 0 ? (
                <EmptyState message="Belum ada kegiatan" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {data.data.map((k) => (
                    <div key={k.id} className="p-4">
                      <p className="font-semibold text-gray-900">
                        {k.nama_kegiatan}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {k.tempat}
                      </p>
                      <p className="text-xs text-gray-400">
                        {k.tanggal} • {k.jam}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAdd && token && user && (
        <AddKegiatan
          token={token}
          nip={user.nip}
          opd={user.opd}
          onClose={() => setShowAdd(false)}
          onAdded={() => {
            setShowAdd(false);
            fetch();
          }}
        />
      )}
    </div>
  );
}

function AddKegiatan({
  token,
  nip,
  opd,
  onClose,
  onAdded,
}: {
  token: string;
  nip: string;
  opd: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [tempat, setTempat] = useState("");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [jam, setJam] = useState(
    new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKegiatan || !tempat) {
      setError("Nama kegiatan dan tempat wajib diisi");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await api.addKegiatan(
        token,
        nip,
        opd,
        namaKegiatan,
        tempat,
        tanggal,
        jam
      );
      if (res.success) {
        onAdded();
      } else {
        setError(res.message || "Gagal menambah kegiatan");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-bold">Tambah Kegiatan</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nama Kegiatan</label>
            <input
              className="input"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="label">Tempat</label>
            <input
              className="input"
              value={tempat}
              onChange={(e) => setTempat(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal</label>
              <input
                type="date"
                className="input"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="label">Jam</label>
              <input
                type="time"
                className="input"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
