"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { HomeData } from "@/types";
import { Loading } from "@/components/Feedback";
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
  const [jenisAbsen, setJenisAbsen] = useState("WFO");
  const [photo, setPhoto] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [submittingScan, setSubmittingScan] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    if (location && homeData?.lokasi_absen) {
      const matched = homeData.lokasi_absen.find((lok) => {
        const dist = haversine(
          location.lat,
          location.lng,
          parseFloat(lok.lat),
          parseFloat(lok.lng)
        );
        return dist <= parseFloat(lok.radius || homeData.radius_absen || "200");
      });
      setMatchedLokasi(matched?.keterangan || "Luar Kantor");
    }
  }, [location, homeData]);

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
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    setPhoto(dataUrl);
    stopCamera();
  };

  const dataUrlToFile = async (
    dataUrl: string,
    filename: string
  ): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: "image/jpeg" });
  };

  const submitFace = async () => {
    if (!token || !user || !homeData || !photo) return;
    setStep("submitting");
    setErrorMsg("");

    const now = new Date();
    const jamAbsen = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const jamKerja = homeData.jam_kerja?.find(
      (j) => j.hari_masuk === homeData.hari?.toUpperCase()
    );

    const params: Record<string, string> = {
      nip: user.nip,
      nama: user.nama,
      opd: user.opd,
      absen_type: mode,
      jenis_jam_kerja: jamKerja?.alias || "TERPUSAT.",
      alias_jam_kerja: jamKerja?.alias || "TERPUSAT.",
      jenis_absen: jenisAbsen,
      metode_absen: "Face",
      parent_id_absen: "0",
      id_jam_kerja: String(jamKerja?.id || "1"),
      jam_absen: jamAbsen,
      jam_absen_hadir: jamKerja?.jam_masuk || "08:00:00",
      jam_absen_pulang: jamKerja?.jam_pulang || "16:00:00",
      ancodebuddy_id: navigator.userAgent,
      lokasi: location ? `${location.lat},${location.lng}` : "0,0",
      kantor: matchedLokasi,
      laporan_kegiatan: "",
      app_version: "11",
    };

    try {
      const file = await dataUrlToFile(photo, "face_depan.jpg");
      const res =
        jenis === "apel"
          ? await api.addAbsenApelFaceWo(token, params)
          : await api.addAbsenFace(token, params, file);
      if (res.success) {
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

  const showPhotoReview =
    photo && step !== "submitting" && step !== "success" && step !== "error";

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
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-36 rounded-[50%] border-4 border-white/70 shadow-[0_0_0_2000px_rgba(0,0,0,0.25)]" />
                </div>
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                  Posisikan wajah di dalam lingkaran
                </div>
              </div>
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

          {showPhotoReview && (
            <div className="space-y-3">
              <div className="mx-auto max-w-xs overflow-hidden rounded-2xl bg-black shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Foto absen"
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <LocationStatus
                status={locationStatus}
                matched={matchedLokasi}
                onRetry={getLocation}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPhoto(null);
                    setStep("select");
                  }}
                  className="btn-outline"
                >
                  Ulang
                </button>
                <button onClick={submitFace} className="btn-success">
                  <CheckIcon size={18} />
                  Kirim
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

          {step === "submitting" && <Loading message="Mengirim absen..." />}

          {step === "success" && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-success">
                <CheckIcon size={32} />
              </div>
              <p className="font-semibold text-gray-900">Berhasil!</p>
              <p className="mt-1 text-sm text-gray-500">{successMsg}</p>
              <button onClick={onClose} className="btn-primary mt-4 w-full">
                Selesai
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
