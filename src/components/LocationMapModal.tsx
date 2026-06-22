"use client";

import { useEffect, useRef } from "react";
import type { GeoLocation } from "@/hooks/useCurrentLocation";
import { ModalShell } from "@/components/ModalShell";

interface Props {
  location: GeoLocation;
  onClose: () => void;
  title?: string;
}

export default function LocationMapModal({ location, onClose, title = "Lokasi GPS Terdeteksi" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let mounted = true;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mounted || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([location.lat, location.lng], 17);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `<div style="transform:translate(-50%,-100%)">
          <svg width="34" height="44" viewBox="0 0 24 24" fill="#1e40af" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        </div>`,
        iconSize: [34, 44],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([location.lat, location.lng], { icon }).addTo(map);
      marker.bindPopup(`<div style="font-size:12px;max-width:200px">${location.address}</div>`).openPopup();

      cleanup = () => {
        map.remove();
        mapRef.current = null;
      };
    })();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [location]);

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="p-4">
        <div
          ref={containerRef}
          className="h-72 w-full overflow-hidden rounded-xl border border-gray-200"
          aria-label="Peta lokasi"
        />
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <div className="flex items-center gap-1.5 font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {location.address}
          </div>
          <div className="mt-1 text-blue-700">
            Koordinat: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            {location.accuracy > 0 && ` • Akurasi ±${Math.round(location.accuracy)}m`}
          </div>
        </div>
        <a
          href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=18/${location.lat}/${location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline mt-3 w-full"
        >
          Buka di OpenStreetMap
        </a>
      </div>
    </ModalShell>
  );
}
