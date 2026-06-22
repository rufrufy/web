import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: "full" | "mark";
}

export function LogoSemarang({
  size = 40,
  className = "",
  showText = true,
  variant = "full",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showText && variant === "full" && (
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide text-white">
            SADEWA
          </div>
          <div className="text-[10px] font-medium text-blue-100">
            Pemkot Semarang
          </div>
        </div>
      )}
    </div>
  );
}

export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Logo Pemerintah Kota Semarang"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <path
        d="M32 2 L58 12 V32 C58 48 46 58 32 62 C18 58 6 48 6 32 V12 Z"
        fill="url(#logoGrad)"
        stroke="#fbbf24"
        strokeWidth="1.5"
      />

      <path
        d="M32 6 L54 14 V32 C54 45 44 54 32 58 C20 54 10 45 10 32 V14 Z"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
      />

      <path
        d="M32 14 C36 14 38 16 38 20 C38 24 35 27 32 30 C29 27 26 24 26 20 C26 16 28 14 32 14 Z"
        fill="url(#goldGrad)"
      />

      <path
        d="M20 34 C22 31 26 30 30 31 L32 34 L34 31 C38 30 42 31 44 34 C44 38 41 41 37 42 C35 41 33 40 32 38 C31 40 29 41 27 42 C23 41 20 38 20 34 Z"
        fill="#ffffff"
        opacity="0.95"
      />

      <path
        d="M24 44 C28 47 36 47 40 44"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M24 49 C28 52 36 52 40 49"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoSemarangDark({
  size = 56,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <LogoMark size={size} />
      <div className="mt-3 text-center">
        <div className="text-xl font-bold tracking-wide text-gray-900">
          SADEWA
        </div>
        <div className="text-xs font-medium text-gray-500">
          Sistem Absensi Digital
        </div>
        <div className="text-[11px] font-semibold text-primary">
          Pemerintah Kota Semarang
        </div>
      </div>
    </div>
  );
}
