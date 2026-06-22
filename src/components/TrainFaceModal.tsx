"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Loading } from "@/components/Feedback";
import {
  CameraIcon,
  CheckIcon,
  AlertCircleIcon,
} from "@/components/Icons";
import { ModalShell } from "@/components/ModalShell";

type Step = "capture" | "submitting" | "success" | "error";
type Pose = "Depan" | "Kanan" | "Kiri";

const POSES: { key: Pose; label: string; instruksi: string }[] = [
  { key: "Depan", label: "Menghadap Depan", instruksi: "Arahkan Wajah Menghadap Ke Depan" },
  { key: "Kanan", label: "Menoleh Kanan", instruksi: "Arahkan Wajah Menghadap Ke Kanan" },
  { key: "Kiri", label: "Menoleh Kiri", instruksi: "Arahkan Wajah Menghadap Ke Kiri" },
];

export function TrainFaceModal({ onClose }: { onClose: () => void }) {
  const { token, user } = useAuth();
  const [step, setStep] = useState<Step>("capture");
  const [currentPoseIdx, setCurrentPoseIdx] = useState(0);
  const [photos, setPhotos] = useState<Record<Pose, string | null>>({
    Depan: null,
    Kanan: null,
    Kiri: null,
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentPose = POSES[currentPoseIdx];
  const allCaptured = photos.Depan && photos.Kanan && photos.Kiri;

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
      setCameraActive(true);
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
    setCameraActive(false);
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
    setPhotos((prev) => ({ ...prev, [currentPose.key]: dataUrl }));
    stopCamera();
  };

  const retakePhoto = (poseIdx: number) => {
    setCurrentPoseIdx(poseIdx);
    setPhotos((prev) => ({ ...prev, [POSES[poseIdx].key]: null }));
  };

  const dataUrlToFile = async (
    dataUrl: string,
    filename: string
  ): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: "image/jpeg" });
  };

  const submit = async () => {
    if (!token || !user || !photos.Depan || !photos.Kanan || !photos.Kiri)
      return;
    setStep("submitting");
    setErrorMsg("");

    const trainedFace = JSON.stringify({
      Depan: { distance: -1, extra: [], id: "1", title: "Depan" },
      Kanan: { distance: -1, extra: [], id: "2", title: "Kanan" },
      Kiri: { distance: -1, extra: [], id: "3", title: "Kiri" },
    });

    try {
      const fileDepan = await dataUrlToFile(photos.Depan, `depan_${user.nip}.jpg`);
      const fileKanan = await dataUrlToFile(photos.Kanan, `kanan_${user.nip}.jpg`);
      const fileKiri = await dataUrlToFile(photos.Kiri, `kiri_${user.nip}.jpg`);

      const res = await api.trainFace(
        token,
        user.nip,
        user.nama,
        trainedFace,
        "1.0",
        fileDepan,
        fileKanan,
        fileKiri
      );

      if (res.success) {
        setSuccessMsg(res.message || "Pendaftaran wajah berhasil");
        setStep("success");
      } else {
        setErrorMsg(res.message || "Pendaftaran gagal");
        setStep("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan");
      setStep("error");
    }
  };

  return (
    <ModalShell
      title="Daftar Wajah"
      onClose={onClose}
      closeable={step !== "submitting"}
    >
      <div className="p-4">
        {step === "capture" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Pendaftaran wajah diperlukan untuk absen face. Ambil 3 foto:
                depan, kanan, dan kiri.
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {POSES.map((p, i) => (
                <div
                  key={p.key}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2 ${
                    currentPoseIdx === i
                      ? "border-primary bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  {photos[p.key] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photos[p.key] as string}
                      alt={p.key}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-gray-400">
                      <CameraIcon size={20} />
                    </div>
                  )}
                  <span className="text-xs font-medium">{p.label}</span>
                  {photos[p.key] && currentPoseIdx !== i && (
                    <button
                      onClick={() => retakePhoto(i)}
                      className="text-xs text-primary underline"
                    >
                      Ulang
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!photos[currentPose.key] && !cameraActive && (
              <button onClick={startCamera} className="btn-primary w-full">
                <CameraIcon size={18} />
                Buka Kamera
              </button>
            )}

            {!photos[currentPose.key] && cameraActive && (
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
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                    {currentPose.instruksi}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      stopCamera();
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

            {photos[currentPose.key] && !allCaptured && (
              <div className="space-y-3">
                <div className="mx-auto max-w-xs overflow-hidden rounded-2xl shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[currentPose.key] as string}
                    alt={currentPose.key}
                    className="aspect-[3/4] w-full object-cover"
                  />
                </div>
                {currentPoseIdx < POSES.length - 1 ? (
                  <button
                    onClick={() => {
                      setCurrentPoseIdx(currentPoseIdx + 1);
                    }}
                    className="btn-primary w-full"
                  >
                    Lanjut: {POSES[currentPoseIdx + 1].label}
                  </button>
                ) : null}
              </div>
            )}

            {allCaptured && (
              <div className="space-y-3">
                <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  Semua foto sudah diambil. Klik kirim untuk mendaftar.
                </div>
                <button onClick={submit} className="btn-success w-full">
                  <CheckIcon size={18} />
                  Kirim Pendaftaran
                </button>
              </div>
            )}
          </div>
        )}

        {step === "submitting" && (
          <div className="py-8">
            <Loading message="Mengirim pendaftaran wajah..." />
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-success">
              <CheckIcon size={32} />
            </div>
            <p className="font-semibold text-gray-900">Berhasil!</p>
            <p className="mt-1 text-sm text-gray-500">{successMsg}</p>
            <p className="mt-1 text-xs text-gray-400">
              Silakan login ulang untuk memperbarui data.
            </p>
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
              onClick={() => setStep("capture")}
              className="btn-outline mt-4 w-full"
            >
              Kembali
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
