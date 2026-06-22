"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { LogoSemarangDark } from "@/components/Logo";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const { login, saveCreds } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("NIP dan password wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const deviceId =
        typeof navigator !== "undefined"
          ? `${navigator.userAgent} (web)`
          : "WebClient";
      const res = await api.login(username, password, deviceId);
      if (res.success && res.token && res.user) {
        saveCreds(username, password, deviceId);
        login(res.token, res.user);
        router.push("/home");
      } else {
        setError(res.message || "Login gagal");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="safe-top safe-x relative flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-sky-600 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="card overflow-hidden rounded-2xl shadow-xl">
          <div className="bg-white/95 p-6 pb-8 backdrop-blur sm:p-8">
            <div className="mb-6 flex justify-center">
              <LogoSemarangDark size={72} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="nip">
                  NIP
                </label>
                <input
                  id="nip"
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan NIP"
                  autoComplete="username"
                  autoCapitalize="none"
                  inputMode="text"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>

          <div className="bg-primary px-6 py-3 text-center">
            <p className="text-[11px] font-medium text-blue-100">
              Versi Web — Sistem Absensi Digital Pemkot Semarang
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
