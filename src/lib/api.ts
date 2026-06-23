import type {
  AbsenResponse,
  BaseResponse,
  HomeResponse,
  KegiatanListResponse,
  LoginResponse,
  NotifikasiListResponse,
  RiwayatAbsenResponse,
  StatistikBulananResponse,
} from "@/types";

const BASE = "/api/proxy";

interface RequestOptions {
  token?: string | null;
  form?: Record<string, string>;
  multipart?: FormData;
}

async function request<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  let body: string | FormData | undefined;

  if (opts.multipart) {
    body = opts.multipart;
  } else if (opts.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = Object.entries(opts.form)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v ?? ""))}`
      )
      .join("&");
  }

  if (opts.token) {
    headers["X-Auth-Token"] = opts.token;
  }

  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { success: false, message: text };
  }

  if (!res.ok) {
    const errMsg =
      (json as { message?: string }).message ||
      `HTTP ${res.status}`;
    console.error(`[api] ${path} failed: ${res.status}`, {
      responseText: text.slice(0, 500),
    });
    if (errMsg === "Unauthenticated.") {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("unauthenticated"));
      }
    }
    throw new Error(errMsg);
  }

  const result = json as T;
  if (result && typeof result === "object" && "success" in result) {
    if (!(result as { success: boolean }).success) {
      console.warn(`[api] ${path} returned success=false:`, text.slice(0, 500));
    }
  }

  return result;
}

export const api = {
  login: (username: string, password: string, deviceId: string) =>
    request<LoginResponse>("api/auth/login", {
      form: {
        username,
        password,
        device_id: deviceId,
        ip_address: "",
        fcm_token: "",
      },
    }),

  logout: (token: string, nip: string) =>
    request<LoginResponse>("api/auth/logout", { token, form: { nip } }),

  home: (
    token: string,
    nip: string,
    opd: string,
    kodeOpd: string
  ) =>
    request<HomeResponse>("api/main/home", {
      token,
      form: { app_version: "11", nip, opd, kode_opd: kodeOpd },
    }),

  riwayatAbsen: (token: string, nip: string, tanggal: string) =>
    request<RiwayatAbsenResponse>("api/laporan/riwayat-absen", {
      token,
      form: { nip, tanggal },
    }),

  riwayatAbsenApel: (token: string, nip: string, tanggal: string) =>
    request<RiwayatAbsenResponse>("api/laporan/riwayat-absen-apel", {
      token,
      form: { nip, tanggal },
    }),

  riwayatApel: (token: string, nip: string) =>
    request<BaseResponse>("api/laporan/riwayat-apel", {
      token,
      form: { nip },
    }),

  riwayatKegiatan: (token: string, nip: string) =>
    request<BaseResponse>("api/laporan/riwayat-kegiatan", {
      token,
      form: { nip },
    }),

  rekapBulanan: (token: string, nip: string, type: string) =>
    request<BaseResponse>("api/laporan/rekap-bulanan", {
      token,
      form: { nip, type },
    }),

  statistikBulanan: (token: string, nip: string) =>
    request<StatistikBulananResponse>("api/laporan/statistik-bulanan", {
      token,
      form: { nip },
    }),

  detailAbsen: (
    token: string,
    nip: string,
    idAbsenHadir: string,
    idAbsenPulang: string
  ) =>
    request<BaseResponse>("api/laporan/detail-absen", {
      token,
      form: {
        nip,
        id_absen_hadir: idAbsenHadir,
        id_absen_pulang: idAbsenPulang,
      },
    }),

  jadwalWfh: (token: string, nip: string, type: string) =>
    request<BaseResponse>("api/laporan/jadwal-wfh", {
      token,
      form: { nip, type },
    }),

  listNotifikasi: (token: string, nip: string) =>
    request<NotifikasiListResponse>("api/notification/list", {
      token,
      form: { nip },
    }),

  readNotifikasi: (token: string, notificationId: string) =>
    request<BaseResponse>("api/notification/read", {
      token,
      form: { notification_id: notificationId },
    }),

  listKegiatan: (token: string, nip: string, opd: string) =>
    request<KegiatanListResponse>("api/kegiatan/get-list", {
      token,
      form: { nip, opd },
    }),

  addKegiatan: (
    token: string,
    nip: string,
    opd: string,
    namaKegiatan: string,
    tempat: string,
    tanggal: string,
    jam: string
  ) =>
    request<BaseResponse>("api/kegiatan/add", {
      token,
      form: {
        nip,
        opd,
        nama_kegiatan: namaKegiatan,
        tempat,
        tanggal,
        jam,
      },
    }),

  addAbsenFaceWo: (
    token: string,
    params: Record<string, string>
  ) =>
    request<AbsenResponse>("api/absen/add-face-wo", {
      token,
      multipart: buildMultipart(params),
    }),

  addAbsenFace: (
    token: string,
    params: Record<string, string>,
    fileDepan: File
  ) => {
    const fd = buildMultipart(params);
    fd.append("depan", fileDepan, fileDepan.name);
    return request<AbsenResponse>("api/absen/add-face", {
      token,
      multipart: fd,
    });
  },

  addAbsenApelFaceWo: (
    token: string,
    params: Record<string, string>
  ) =>
    request<AbsenResponse>("api/absen/add-apel-face-wo", {
      token,
      multipart: buildMultipart(params),
    }),

  addAbsenApelFace: (
    token: string,
    params: Record<string, string>,
    fileDepan: File
  ) => {
    const fd = buildMultipart(params);
    fd.append("depan", fileDepan, fileDepan.name);
    return request<AbsenResponse>("api/absen/add-apel-face", {
      token,
      multipart: fd,
    });
  },

  addAbsenScan: (
    token: string,
    requestorNip: string,
    requestorNama: string,
    requestorOpd: string,
    requestorDevice: string,
    qrResult: string
  ) =>
    request<AbsenResponse>("api/absen/add-scan", {
      token,
      form: {
        requestor_nip: requestorNip,
        requestor_nama: requestorNama,
        requestor_opd: requestorOpd,
        requestor_device: requestorDevice,
        qr_result: qrResult,
      },
    }),

  generateQrAbsen: (
    token: string,
    params: Record<string, string>
  ) =>
    request<BaseResponse>("api/absen/generate-qr-absen", {
      token,
      form: params,
    }),

  addConfig: (token: string, nip: string, gps: string) =>
    request<BaseResponse>("api/absen/add-config", {
      token,
      form: { nip, gps },
    }),

  addLokasi: (token: string, nip: string, lokasi: string, proof: string) =>
    request<BaseResponse>("api/absen/add-lokasi", {
      token,
      form: { nip, lokasi, proof },
    }),

  perbaruiData: (token: string, nip: string) =>
    request<LoginResponse>("api/auth/perbaruidata", {
      token,
      form: { nip },
    }),

  refreshFcm: (token: string, nip: string, fcmToken: string) =>
    request<BaseResponse>("api/auth/refreshfcm", {
      token,
      form: { nip, fcm_token: fcmToken },
    }),

  reportError: (
    token: string,
    nip: string,
    nama: string,
    opd: string,
    deviceId: string,
    errorDetail: string,
    activityLog: string
  ) =>
    request<BaseResponse>("api/error/report", {
      token,
      form: {
        nip,
        nama,
        opd,
        device_id: deviceId,
        error_detail: errorDetail,
        activity_log: activityLog,
      },
    }),

  trainFace: (
    token: string,
    nip: string,
    nama: string,
    trainedFace: string,
    trainDistance: string,
    fileDepan: File,
    fileKanan: File,
    fileKiri: File
  ) => {
    const fd = new FormData();
    fd.append("nip", nip);
    fd.append("nama", nama);
    fd.append("trained_face", trainedFace);
    fd.append("train_distance", trainDistance);
    fd.append("depan", fileDepan, fileDepan.name);
    fd.append("kanan", fileKanan, fileKanan.name);
    fd.append("kiri", fileKiri, fileKiri.name);
    return request<BaseResponse>("api/face/train", {
      token,
      multipart: fd,
    });
  },
};

function buildMultipart(params: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(params)) {
    fd.append(k, String(v ?? ""));
  }
  return fd;
}
