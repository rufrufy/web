// Storage for parent_absen (analog of Android SharedPref.getParent_absen/setParent_absen).
// The server returns parent_absen in the AbsenResponse after a successful "Hadir" check-in.
// It must be sent back as parent_id_absen on the subsequent "Pulang" check-out.
const PARENT_ABSEN_KEY = "sadewa_parent_absen";

export function getParentAbsen(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PARENT_ABSEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setParentAbsen(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PARENT_ABSEN_KEY, value ?? "");
  } catch {
  }
}

export function clearParentAbsen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PARENT_ABSEN_KEY);
  } catch {
  }
}
