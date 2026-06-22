"use client";

import { useCallback, useEffect, useState } from "react";

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  address: string;
}

type Status = "idle" | "loading" | "ok" | "error";

interface State {
  status: Status;
  location: GeoLocation | null;
  error: string;
}

async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`,
      {
        signal,
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export function useCurrentLocation(auto = true) {
  const [state, setState] = useState<State>({
    status: "idle",
    location: null,
    error: "",
  });

  const request = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading", error: "" }));
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "error", location: null, error: "Geolokasi tidak didukung" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const controller = new AbortController();
        const address = await reverseGeocode(latitude, longitude, controller.signal);
        setState({
          status: "ok",
          error: "",
          location: { lat: latitude, lng: longitude, accuracy, address },
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak"
            : err.code === err.POSITION_UNAVAILABLE
              ? "Posisi tidak tersedia"
              : err.code === err.TIMEOUT
                ? "Waktu permintaan lokasi habis"
                : "Gagal mendapatkan lokasi";
        setState({ status: "error", location: null, error: msg });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    if (auto) request();
  }, [auto, request]);

  return { ...state, request };
}
