"use client";

import { useAuth } from "@/hooks/useAuth";
import { CameraIcon } from "@/components/Icons";

export function Profil({
  onOpenTrainFace,
}: {
  onOpenTrainFace?: () => void;
}) {
  const { user } = useAuth();

  if (!user) return null;

  const fields = [
    { label: "NIP", value: user.nip },
    { label: "Nama", value: user.nama },
    { label: "Jabatan", value: user.jabatan },
    { label: "OPD", value: user.opd },
    { label: "Unit Kerja", value: user.unit_kerja },
    { label: "Kode OPD", value: user.kode_opd },
    { label: "Telepon", value: user.telepon || "-" },
    { label: "NIK", value: user.nik || "-" },
    { label: "Type", value: user.type || "-" },
    { label: "Verifikasi", value: user.verif ? "Terverifikasi" : "Belum" },
  ];

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold text-gray-900">Profil</h2>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-accent p-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-4 ring-white/30">
            {user.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.foto}
                alt={user.nama}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-3xl font-bold">
                {user.nama?.charAt(0) || "?"}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold">{user.nama}</h3>
          <p className="text-sm opacity-90">{user.jabatan}</p>
          <p className="text-xs opacity-80">{user.opd}</p>
        </div>
      </div>

      {onOpenTrainFace && (
        <button onClick={onOpenTrainFace} className="btn-outline w-full">
          <CameraIcon size={18} />
          Perbarui Wajah
        </button>
      )}

      <div className="card divide-y divide-gray-100">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="text-sm text-gray-500">{f.label}</span>
            <span className="text-sm font-medium text-gray-900">
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
