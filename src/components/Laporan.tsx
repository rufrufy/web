"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { BaseResponse } from "@/types";
import { Loading, ErrorState, EmptyState } from "@/components/Feedback";

export function Laporan() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"rekap" | "wfh">("rekap");
  const [type, setType] = useState("masuk");
  const [rekap, setRekap] = useState<unknown>(null);
  const [wfh, setWfh] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRekap = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.rekapBulanan(token, user.nip, type);
      setRekap(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat rekap");
    } finally {
      setLoading(false);
    }
  }, [token, user, type]);

  const fetchWfh = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.jadwalWfh(token, user.nip, type);
      setWfh(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat jadwal");
    } finally {
      setLoading(false);
    }
  }, [token, user, type]);

  useEffect(() => {
    if (tab === "rekap") fetchRekap();
    else fetchWfh();
  }, [tab, type, fetchRekap, fetchWfh]);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold text-gray-900">Laporan</h2>

      <div className="flex rounded-lg bg-white p-1 shadow-sm">
        {(["rekap", "wfh"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "bg-primary text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "rekap" ? "Rekap Bulanan" : "Jadwal WFH"}
          </button>
        ))}
      </div>

      <div className="card flex items-center gap-2 p-3">
        <span className="text-sm text-gray-600">Type:</span>
        <select
          className="input flex-1"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={loading}
        >
          <option value="masuk">Masuk</option>
          <option value="pulang">Pulang</option>
        </select>
      </div>

      {loading && <Loading message="Memuat..." />}
      {error && <ErrorState message={error} />}

      {!loading && !error && tab === "rekap" && (
        <DataView data={rekap} title="Rekap Bulanan" />
      )}
      {!loading && !error && tab === "wfh" && (
        <DataView data={wfh} title="Jadwal WFH" />
      )}
    </div>
  );
}

function DataView({
  data,
  title,
}: {
  data: unknown;
  title: string;
}) {
  if (!data) return <EmptyState message="Tidak ada data" />;
  const obj = data as Record<string, unknown>;
  const dataField = obj.data;

  if (!dataField) {
    return (
      <div className="card p-4">
        <p className="text-sm text-gray-600">{obj.message as string}</p>
      </div>
    );
  }

  if (Array.isArray(dataField)) {
    if (dataField.length === 0)
      return <EmptyState message="Tidak ada data" />;
    const msg = obj.message ? String(obj.message) : "";
    return (
      <div className="space-y-2">
        {msg && (
          <div className="card p-3 text-sm text-gray-600">
            {msg}
          </div>
        )}
        {dataField.map((item, i) => {
          const r = item as Record<string, unknown>;
          return (
            <div key={i} className="card p-4">
              {Object.entries(r).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-gray-100 py-1 text-sm last:border-0"
                >
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900">
                    {formatVal(v)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof dataField === "object" && dataField !== null) {
    const entries = Object.entries(dataField as Record<string, unknown>);
    if (entries.length === 0)
      return <EmptyState message="Tidak ada data" />;
    const msg = obj.message ? String(obj.message) : "";
    return (
      <div className="space-y-2">
        {msg && (
          <div className="card p-3 text-sm text-gray-600">
            {msg}
          </div>
        )}
        <div className="card p-4">
          <h3 className="mb-2 font-semibold text-gray-700">{title}</h3>
          {entries.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between border-b border-gray-100 py-1.5 text-sm last:border-0"
            >
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-900">
                {formatVal(v)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <EmptyState message="Format data tidak dikenali" />;
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
