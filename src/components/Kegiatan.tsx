"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { KegiatanListResponse } from "@/types";
import { Loading, ErrorState, EmptyState } from "@/components/Feedback";
import { PlusIcon, ArrowLeftIcon } from "@/components/Icons";
import { ModalShell } from "@/components/ModalShell";

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
    <>
      <ModalShell
        title="Kegiatan"
        onClose={onClose}
        footer={
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary w-full"
          >
            <PlusIcon size={18} />
            Tambah Kegiatan
          </button>
        }
      >
        {loading && (
          <div className="p-6">
            <Loading message="Memuat kegiatan..." />
          </div>
        )}
        {error && (
          <div className="p-6">
            <ErrorState message={error} onRetry={fetch} />
          </div>
        )}
        {!loading && !error && data && (
          <>
            {data.data.length === 0 ? (
              <div className="p-8">
                <EmptyState message="Belum ada kegiatan" />
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.data.map((k) => (
                  <div key={k.id} className="p-4">
                    <p className="font-semibold text-gray-900">
                      {k.nama_kegiatan}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{k.tempat}</p>
                    <p className="text-xs text-gray-400">
                      {k.tanggal} • {k.jam}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </ModalShell>

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
    </>
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
    <ModalShell title="Tambah Kegiatan" onClose={onClose} closeable={!submitting}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
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
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
