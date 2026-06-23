"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getParentAbsen, setParentAbsen } from "@/lib/parentAbsen";
import { compressCanvas, dataUrlToFile } from "@/lib/compressPhoto";
import type { AbsenResponse, HomeData } from "@/types";
import {
  CameraIcon,
  QrIcon,
  ArrowLeftIcon,
  CheckIcon,
  AlertCircleIcon,
  MapPinIcon,
} from "@/components/Icons";

interface AbsenModalProps {
  mode: "hadir" | "pulang";
  jenis: "absen" | "apel";
  homeData: HomeData | null;
  onClose: () => void;
}

type Step =
  | "select"
  | "camera"
  | "scan"
  | "submitting"
  | "success"
  | "error";

export function AbsenModal({
  mode,
  jenis,
  homeData,
  onClose,
}: AbsenModalProps) {
  const { token, user } = useAuth();
  const [step, setStep] = useState<Step>("select");
  const [method, setMethod] = useState<"face" | "qr">("face");
  const [jenisAbsen, setJenisAbsen] = useState(jenis === "apel" ? "Apel" : "WFO");
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [submittingScan, setSubmittingScan] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [matchedLokasi, setMatchedLokasi] = useState<string>("");

  const metodeFace = homeData?.metode_absen?.includes("Face") ?? false;
  const metodeQr = homeData?.show_scanner ?? false;

  useEffect(() => {
    setJenisAbsen(jenis === "apel" ? "Apel" : "WFO");
  }, [jenis]);

  useEffect(() => {
    if (!metodeFace && metodeQr) {
      setMethod("qr");
      setStep("scan");
    }
  }, [metodeFace, metodeQr]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevPos = document.body.style.position;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.position = prevPos;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "submitting") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  const getLocation = useCallback(async () => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus("ok");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (!location || !homeData) return;
    // Apel matches against lokasi_apel[]; regular absen against lokasi_absen[].
    const pool =
      jenis === "apel"
        ? homeData.lokasi_apel ?? homeData.lokasi_absen ?? []
        : homeData.lokasi_absen ?? [];
    const matched = pool.find((lok) => {
      const dist = haversine(
        location.lat,
        location.lng,
        parseFloat(lok.lat),
        parseFloat(lok.lng)
      );
      return dist <= parseFloat(lok.radius || homeData.radius_absen || "200");
    });
    setMatchedLokasi(matched?.keterangan || "Luar Kantor");
  }, [location, homeData, jenis]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setErrorMsg("Tidak dapat mengakses kamera. Periksa izin kamera browser.");
      setStep("error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const compressed = compressCanvas(videoRef.current);
    if (!compressed) return;
    setPhoto(compressed);
    stopCamera();
    setStep("submitting");
    void submitFace(compressed);
  };

  const submitFace = async (photoDataUrl: string) => {
    if (!token || !user || !homeData) return;
    setStep("submitting");
    setErrorMsg("");

    const now = new Date();
    const timePart = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    // Server expects full datetime "YYYY-MM-DD HH:MM:SS" for jam_* fields (mirrors Android Shape: tanggal_masuk + " " + jam_masuk).
    const tanggal = homeData.tanggal || now.toISOString().slice(0, 10);
    const jamAbsen = `${tanggal} ${timePart}`;

    const jamKerja = homeData.jam_kerja?.find(
      (j) => j.hari_masuk === homeData.hari?.toUpperCase()
    );

    // Apel uses jam_apel[] (matched by hari_mulai + jenis), not jam_kerja[].
    // JamApel: { id, jenis, lokasi, hari_mulai, jam_mulai, tanggal_mulai }
    const jamApel =
      jenis === "apel"
        ? homeData.jam_apel?.find(
            (a) =>
              a.hari_mulai?.toUpperCase() === homeData.hari?.toUpperCase() &&
              (a.jenis?.toUpperCase() === mode.toUpperCase() ||
                a.jenis?.toUpperCase() === "APEL")
          )
        : undefined;

    const idJamKerja = jamApel?.id ?? jamKerja?.id ?? "1";
    // jam_absen_hadir: apel = tanggal_mulai + " " + jam_mulai; regular = tanggal_masuk + " " + jam_masuk.
    const jamAbsenHadir =
      jamApel?.tanggal_mulai && jamApel?.jam_mulai
        ? `${jamApel.tanggal_mulai} ${jamApel.jam_mulai}`
        : jamKerja?.tanggal_masuk && jamKerja?.jam_masuk
          ? `${jamKerja.tanggal_masuk} ${jamKerja.jam_masuk}`
          : jamKerja?.jam_masuk || "08:00:00";
    const jamAbsenPulang =
      jamKerja?.tanggal_pulang && jamKerja?.jam_pulang
        ? `${jamKerja.tanggal_pulang} ${jamKerja.jam_pulang}`
        : jamKerja?.jam_pulang || "16:00:00";

    const isApel = jenis === "apel";
    // parent_id_absen: round-trip token for regular absen (Hadir sends "", server returns parent_absen, Pulang sends it back). Apel uses id_apel instead.
    const parentIdAbsen = isApel
      ? undefined
      : mode === "pulang"
        ? getParentAbsen()
        : "";

    const params: Record<string, string> = {
      nip: user.nip,
      nama: user.nama,
      opd: user.opd,
      absen_type: mode === "pulang" ? "Pulang" : "Hadir",
      jenis_jam_kerja: "ABSENSI",
      alias_jam_kerja: "TERPUSAT.",
      jenis_absen: jenisAbsen,
      metode_absen: "Face",
      id_jam_kerja: String(idJamKerja),
      jam_absen: jamAbsen,
      jam_absen_hadir: jamAbsenHadir,
      jam_absen_pulang: jamAbsenPulang,
      android_id: navigator.userAgent,
      lokasi: location ? `${location.lat},${location.lng}` : "0,0",
      kantor: matchedLokasi,
      laporan_kegiatan: "",
      app_version: "11",
    };
    if (parentIdAbsen !== undefined) {
      params.parent_id_absen = parentIdAbsen;
    }
    if (isApel && jamApel?.id != null) {
      params.id_apel = String(jamApel.id);
    }

    try {
      const fileName = `depan_${user.nip}_${Date.now()}.jpg`;
      const file = await dataUrlToFile(photoDataUrl, fileName);

      let res: AbsenResponse;
      if (isApel) {
        res = await api.addAbsenApelFace(token, params, file);
      } else {
        res = await api.addAbsenFace(token, params, file);
      }
      if (res.success) {
        if (!isApel && mode === "hadir" && res.parent_absen != null) {
          setParentAbsen(res.parent_absen);
        }
        setSuccessMsg(res.message || "Absen berhasil");
        setStep("success");
      } else {
        setErrorMsg(res.message || "Absen gagal");
        setStep("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
      setStep("error");
    }
  };

  const submitScan = async () => {
    if (!token || !user || !qrInput.trim()) return;
    setStep("submitting");
    setSubmittingScan(true);
    setErrorMsg("");
    try {
      const res = await api.addAbsenScan(
        token,
        user.nip,
        user.nama,
        user.opd,
        navigator.userAgent,
        qrInput.trim()
      );
      if (res.success) {
        setSuccessMsg(res.message || "Absen scan berhasil");
        setStep("success");
      } else {
        setErrorMsg(res.message || "Absen gagal");
        setStep("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
      setStep("error");
    } finally {
      setSubmittingScan(false);
    }
  };

  const title =
    jenis === "apel"
      ? mode === "hadir"
        ? "Apel Hadir"
        : "Apel Pulang"
      : mode === "hadir"
        ? "Absen Masuk"
        : "Absen Pulang";

  return (
    <div
      className="modal-backdrop animate-fade-in fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== "submitting") onClose();
      }}
    >
      <div
        className="animate-slide-up card flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl sm:max-w-md sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="safe-top flex shrink-0 items-center justify-between bg-primary px-4 py-3 text-white">
          <button
            onClick={onClose}
            disabled={step === "submitting"}
            className="flex items-center gap-1.5 text-sm font-medium hover:bg-white/10 active:scale-95 disabled:opacity-50"
            aria-label="Kembali"
          >
            <ArrowLeftIcon size={18} />
            {title}
          </button>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            {jenis}
          </span>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain p-4">
          {step === "select" && (
            <div className="space-y-4">
              <div>
                <label className="label">Jenis Absen</label>
                <div className="flex gap-2">
                  {(homeData?.jenis_absen || ["WFO", "WFH"]).map((j) => (
                    <button
                      key={j}
                      onClick={() => setJenisAbsen(j)}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium transition active:scale-95 ${
                        jenisAbsen === j
                          ? "bg-primary text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>

              <LocationStatus
                status={locationStatus}
                matched={matchedLokasi}
                onRetry={getLocation}
              />

              <div className="grid grid-cols-2 gap-3">
                {metodeFace && (
                  <button
                    onClick={async () => {
                      setMethod("face");
                      setStep("camera");
                      await startCamera();
                    }}
                    className="btn-primary"
                  >
                    <CameraIcon size={20} />
                    Face
                  </button>
                )}
                {metodeQr && (
                  <button
                    onClick={() => {
                      setMethod("qr");
                      setStep("scan");
                    }}
                    className="btn-outline"
                  >
                    <QrIcon size={20} />
                    Scan QR
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "camera" && (
            <div className="space-y-3">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl bg-black shadow-lg">
                <video
                  ref={videoRef}
                  className="h-full w-full -scale-x-100 object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-36 rounded-[50%] border-4 border-white/70 shadow-[0_0_0_2000px_rgba(0,0,0,0.25)]" />
                </div>
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                  Posisikan wajah di dalam lingkaran
                </div>
              </div>
              <p className="text-center text-xs text-gray-500">
                Setelah ambil foto, gambar diproses 3 detik lalu otomatis dikirim.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    stopCamera();
                    setStep("select");
                  }}
                  className="btn-outline"
                >
                  Batal
                </button>
                <button onClick={capturePhoto} className="btn-primary">
                  <CameraIcon size={18} />
                  Ambil Foto
                </button>
              </div>
            </div>
          )}

          {step === "scan" && (
            <div className="space-y-3">
              <div>
                <label className="label">QR Code Result</label>
                <textarea
                  className="input min-h-24"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Tempel hasil scan QR di sini..."
                  disabled={submittingScan}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Di aplikasi mobile, QR di-scan via kamera. Di web, tempel
                  nilai QR secara manual.
                </p>
              </div>
              <button
                onClick={submitScan}
                className="btn-primary w-full"
                disabled={!qrInput.trim()}
              >
                Kirim Absen
              </button>
            </div>
          )}

          {step === "submitting" && (
            <div className="space-y-4 py-2">
              <div className="mx-auto max-w-xs overflow-hidden rounded-2xl bg-black shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photo && (
                  <img
                    src={photo}
                    alt="Foto absen"
                    className="aspect-[3/4] w-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm font-semibold text-gray-900">
                  Mengirim absen…
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-success">
                <CheckIcon size={40} />
              </div>
              <p className="text-lg font-bold text-gray-900">Absen Berhasil</p>
              <p className="mt-1 text-sm text-gray-500">{successMsg}</p>
              <button
                onClick={onClose}
                className="btn-success mt-5 w-full py-3 text-base"
              >
                <CheckIcon size={20} />
                Absen Berhasil
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-danger">
                <AlertCircleIcon size={32} />
              </div>
              <p className="font-semibold text-gray-900">Gagal</p>
              <p className="mt-1 text-sm text-gray-500">{errorMsg}</p>
              <button
                onClick={() => setStep("select")}
                className="btn-outline mt-4 w-full"
              >
                Kembali
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationStatus({
  status,
  matched,
  onRetry,
}: {
  status: "idle" | "loading" | "ok" | "error";
  matched: string;
  onRetry: () => void;
}) {
  if (status === "loading")
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
        <MapPinIcon size={16} className="animate-pulse" />
        Mendeteksi lokasi...
      </div>
    );
  if (status === "error")
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertCircleIcon size={16} />
        Lokasi tidak terdeteksi.{" "}
        <button onClick={onRetry} className="underline font-medium">
          Coba lagi
        </button>
      </div>
    );
  if (status === "ok")
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
        <MapPinIcon size={16} />
        Lokasi: {matched || "Tidak di kantor"}
      </div>
    );
  return null;
}

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
