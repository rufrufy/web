"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { NotifikasiListResponse } from "@/types";
import { Loading, ErrorState, EmptyState } from "@/components/Feedback";
import { BellIcon, CheckIcon } from "@/components/Icons";
import { ModalShell } from "@/components/ModalShell";

export function Notifikasi({ onClose }: { onClose: () => void }) {
  const { token, user } = useAuth();
  const [data, setData] = useState<NotifikasiListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readingId, setReadingId] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.listNotifikasi(token, user.nip);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleRead = async (id: number) => {
    if (!token) return;
    setReadingId(id);
    try {
      await api.readNotifikasi(token, String(id));
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n
          ),
        };
      });
    } catch {
      void 0;
    } finally {
      setReadingId(null);
    }
  };

  return (
    <ModalShell title="Notifikasi" onClose={onClose}>
      {loading && (
        <div className="p-6">
          <Loading message="Memuat notifikasi..." />
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
              <EmptyState message="Tidak ada notifikasi" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.data.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 ${!n.read_at ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {n.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">{n.body}</p>
                      <p className="mt-1 text-xs text-gray-400">{n.sent_at}</p>
                    </div>
                    {!n.read_at && (
                      <button
                        onClick={() => handleRead(n.id)}
                        disabled={readingId === n.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-primary hover:bg-blue-200 active:scale-95 disabled:opacity-50"
                      >
                        <CheckIcon size={12} />
                        {readingId === n.id ? "..." : "Dibaca"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}
