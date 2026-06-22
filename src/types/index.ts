export interface User {
  nama: string;
  nip: string;
  foto: string;
  telepon: string;
  opd: string;
  jabatan: string;
  type: string;
  nik: string;
  unit_kerja: string;
  kode_opd: string;
  trained_face: string;
  verif: boolean;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token: string;
  user: User;
}

export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: unknown;
  data?: unknown;
}

export interface LokasiAbsen {
  id: number;
  nip: string | null;
  kode_opd: string;
  type_lokasi: string;
  lat: string;
  lng: string;
  radius: string;
  keterangan: string;
  expired_at: string | null;
}

export interface JamKerja {
  id: number;
  hari_masuk: string;
  jam_masuk: string;
  hari_pulang: string;
  jam_pulang: string;
  kode_opd: string | null;
  shift: string;
  alias: string;
  channel?: string;
}

export interface JamApel {
  id: number;
  jenis: string;
  lokasi: string;
  hari_mulai: string;
  jam_mulai: string;
  tanggal_mulai: string;
}

export interface HomeData {
  absen_timer: number;
  admin_opd: string;
  auto_refresh: string;
  count_notification: string;
  current_version: string;
  enable_apel_pulang: string;
  enable_retrain: string;
  face_distance: string;
  fcm_token: string;
  force_tracking: boolean;
  force_update_app: boolean;
  gps: boolean;
  hari: string;
  is_mandiri: string;
  jam: string;
  jam_apel: JamApel[];
  jam_kerja: JamKerja[];
  jenis_absen: string[];
  last_loaded: string;
  liveness_level: string;
  lokasi_absen: LokasiAbsen[];
  lokasi_apel: LokasiAbsen[];
  metode_absen: string[];
  qr_key: string;
  radius_absen: string;
  send_photo: string;
  show_scanner: boolean;
  tanggal: string;
  token: string;
  train_distance: string;
}

export interface HomeResponse {
  success: boolean;
  message?: string;
  data: HomeData;
  jam_apel?: JamApel[];
  jam_kerja?: JamKerja[];
  lokasi_absen?: LokasiAbsen[];
  lokasi_apel?: LokasiAbsen[];
}

export interface RiwayatAbsenItem {
  id: number;
  hari: string;
  tanggal: string;
  jenis_jam_kerja: string;
  alias_jam_kerja: string;
  id_jam_kerja_hadir: number | string;
  id_absen_hadir: number | string;
  jam_kerja_hadir: string;
  jam_absen_hadir: string;
  selisih_hadir: string;
  id_jam_kerja_pulang: number | string;
  id_absen_pulang: number | string;
  jam_kerja_pulang: string;
  jam_absen_pulang: string;
  selisih_pulang: string;
}

export interface RiwayatAbsenResponse {
  success: boolean;
  nip: string;
  tanggal: string;
  jam_absen_hadir: string;
  id_jam_kerja_hadir: number;
  jam_absen_pulang: string;
  id_jam_kerja_pulang: number | string;
  message: string;
  data: Record<string, RiwayatAbsenItem[]>;
}

export interface StatistikBulananData {
  jumlah_hari_kerja: number;
  jumlah_hadir: number;
  jumlah_tidak_hadir: number;
  jumlah_konfirmasi: number;
  jumlah_cuti: number;
  jumlah_telat: string;
}

export interface StatistikBulananResponse {
  success: boolean;
  nip: string;
  bulan: string;
  message: string;
  data: StatistikBulananData;
}

export interface NotifikasiItem {
  id: number;
  to_user: number;
  title: string;
  body: string;
  url: string;
  sent_at: string;
  read_at: string;
}

export interface NotifikasiListResponse {
  success: boolean;
  message: string;
  data: NotifikasiItem[];
}

export interface KegiatanItem {
  id: number;
  nip: string;
  opd: string;
  nama_kegiatan: string;
  tempat: string;
  tanggal: string;
  jam: string;
}

export interface KegiatanListResponse {
  success: boolean;
  message: string;
  data: KegiatanItem[];
}

export interface AbsenResponse {
  success: boolean;
  message: string;
  data?: unknown;
}
