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
} from "@/components/Icons";

interface AbsenModalProps {
  mode: "hadir" | "pulang";
  jenis: "absen" | "apel";
  homeData: HomeData | null;
  onClose: () => void;
}

type Step = "select" | "camera" | "scan" | "submitting" | "success" | "error";

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
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setErrorMsg("Tidak dapat mengakses kamera");
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
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
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
      android_id: navigator.userAgent,
      lokasi: location
        ? `${location.lat},${location.lng}`
        : "0,0",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
          <button onClick={onClose} className="flex items-center gap-1 text-sm">
            <ArrowLeftIcon />
            {title}
          </button>
        </div>

        <div className="p-4">
          {step === "select" && (
            <div className="space-y-4">
              <div>
                <label className="label">Jenis Absen</label>
                <div className="flex gap-2">
                  {(homeData?.jenis_absen || ["WFO", "WFH"]).map((j) => (
                    <button
                      key={j}
                      onClick={() => setJenisAbsen(j)}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                        jenisAbsen === j
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600"
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
                    <CameraIcon />
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
                    <QrIcon />
                    Scan QR
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "camera" && (
            <div className="space-y-3">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-full border-4 border-white/50" />
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
                  Ambil Foto
                </button>
              </div>
            </div>
          )}

          {photo && step !== "submitting" && step !== "success" && step !== "error" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Foto absen"
                  className="w-full"
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
                  <CheckIcon />
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
                <CheckIcon />
              </div>
              <p className="font-semibold text-gray-900">Berhasil!</p>
              <p className="mt-1 text-sm text-gray-500">{successMsg}</p>
              <button onClick={onClose} className="btn-primary mt-4">
                Selesai
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-danger text-2xl">
                !
              </div>
              <p className="font-semibold text-gray-900">Gagal</p>
              <p className="mt-1 text-sm text-gray-500">{errorMsg}</p>
              <button
                onClick={() => setStep("select")}
                className="btn-outline mt-4"
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
      <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
        Mendeteksi lokasi...
      </div>
    );
  if (status === "error")
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        Lokasi tidak terdeteksi.{" "}
        <button onClick={onRetry} className="underline">
          Coba lagi
        </button>
      </div>
    );
  if (status === "ok")
    return (
      <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
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
