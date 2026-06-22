"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useCurrentLocation, type GeoLocation } from "@/hooks/useCurrentLocation";
import { MapPinIcon, RefreshIcon, AlertCircleIcon } from "@/components/Icons";

const LocationMapModal = dynamic(() => import("./LocationMapModal"), {
  ssr: false,
  loading: () => null,
});

export function CurrentLocationCard() {
  const { status, location, error, request } = useCurrentLocation(true);
  const [showMap, setShowMap] = useState(false);

  const clickable = status === "ok" && !!location;

  return (
    <>
      <button
        type="button"
        onClick={() => clickable && setShowMap(true)}
        disabled={!clickable}
        className={`card w-full p-4 text-left transition active:scale-[0.99] ${
          clickable ? "hover:border-primary cursor-pointer" : "cursor-default"
        }`}
        aria-label="Lihat lokasi GPS saat ini di peta"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-primary">
            <MapPinIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Lokasi Saat Ini
              </h3>
              {status === "ok" && (
                <span className="badge bg-green-100 text-green-700">Aktif</span>
              )}
              {status === "loading" && (
                <span className="badge bg-blue-100 text-blue-700">Mendeteksi…</span>
              )}
              {status === "error" && (
                <span className="badge bg-red-100 text-red-700">Gagal</span>
              )}
            </div>

            {status === "loading" && (
              <p className="mt-1 text-xs text-gray-500">Mengambil koordinat GPS…</p>
            )}

            {status === "ok" && location && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {location.address}
              </p>
            )}

            {status === "error" && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircleIcon size={12} />
                <span className="flex-1 truncate">{error}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    request();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      request();
                    }
                  }}
                  className="inline-flex items-center gap-1 font-medium text-primary underline"
                >
                  <RefreshIcon size={12} />
                  Coba lagi
                </span>
              </div>
            )}

            {status === "ok" && location && (
              <p className="mt-2 text-[11px] text-primary">
                Ketuk untuk lihat di peta →
              </p>
            )}
          </div>
        </div>
      </button>

      {showMap && location && (
        <LocationMapModal
          location={location as GeoLocation}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}
