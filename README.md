# SADEWA Web

Versi web SADEWA (Sistem Absensi Digital Pemkot Semarang) — port dari aplikasi Android `semarangkota.sadewa`, menggunakan API yang sama persis.

## Fitur

- **Login** (`api/auth/login`) — autentikasi NIP + password, token Bearer
- **Beranda** (`api/main/home`) — dashboard: jam kerja, lokasi absen, absen masuk/pulang, apel, kegiatan, notifikasi
- **Absen Face** (`api/absen/add-face`, `add-face-wo`, `add-apel-face`, `add-apel-face-wo`) — kamera + multipart upload
- **Absen Scan QR** (`api/absen/add-scan`) — input manual QR result
- **Riwayat** (`api/laporan/riwayat-absen`, `riwayat-absen-apel`) — history harian
- **Statistik** (`api/laporan/statistik-bulanan`) — ringkasan bulanan
- **Rekap & Jadwal WFH** (`api/laporan/rekap-bulanan`, `jadwal-wfh`)
- **Kegiatan** (`api/kegiatan/get-list`, `add`) — daftar & tambah kegiatan
- **Notifikasi** (`api/notification/list`, `read`) — daftar & tandai dibaca
- **Profil** — data pegawai dari login response

## Stack

- Next.js 14 (App Router)
- TypeScript strict mode
- Tailwind CSS
- API proxy route (`/api/proxy/[...path]`) — meneruskan semua request ke `https://secure-sadewa.semarangkota.go.id` dengan header `Authorization: Bearer <token>`

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Struktur

```
src/
  app/
    layout.tsx              # Root layout + AuthProvider
    page.tsx                # Redirect ke /home atau /login
    login/page.tsx          # Halaman login
    home/page.tsx           # Halaman utama (gabungan semua tab)
    api/proxy/[...path]/route.ts  # API proxy ke server SADEWA
  components/
    AppShell.tsx            # Layout + bottom navigation
    Home.tsx                # Tab Beranda
    Riwayat.tsx             # Tab Riwayat (absen/apel/statistik)
    Laporan.tsx             # Tab Laporan (rekap/wfh)
    Profil.tsx              # Tab Profil
    AbsenModal.tsx          # Modal absen face/scan/apel
    Notifikasi.tsx          # Modal notifikasi
    Kegiatan.tsx            # Modal kegiatan (list + add)
    Feedback.tsx            # Loading/Error/Empty states
    Icons.tsx               # SVG icons
  hooks/
    useAuth.tsx             # Auth context (localStorage-based)
  lib/
    api.ts                  # API client (mirrors ApiInterface)
  types/
    index.ts                # TypeScript types untuk semua response
```

## Catatan

- Token disimpan di `localStorage` (format: `Bearer <token>`) sesuai pola aplikasi mobile.
- Geolokasi menggunakan `navigator.geolocation` dan dicocokkan dengan `lokasi_absen` (haversine + radius).
- Absen face menggunakan `getUserMedia` untuk capture foto, lalu dikirim sebagai multipart.
- Absen scan QR menerima input manual (di mobile menggunakan kamera scanner).
- Cuti dan Data Dukung sengaja belum diimplementasikan (sesuai permintaan).
