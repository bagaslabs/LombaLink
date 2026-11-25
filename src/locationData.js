const regionsApi = "https://www.emsifa.com/api-wilayah-indonesia/v2";

export async function fetchPlaces(path, signal) {
  const response = await fetch(`${regionsApi}/${path}`, { signal });
  if (!response.ok) throw new Error(`Layanan data wilayah merespons ${response.status}.`);
  const result = await response.json();
  if (!Array.isArray(result?.data) || result.data.some((place) => typeof place?.id !== "string" || typeof place?.name !== "string")) {
    throw new Error("Format data wilayah tidak valid.");
  }
  if (!result.data.length) throw new Error("Daftar wilayah kosong.");
  return [...result.data].sort((left, right) => left.name.localeCompare(right.name, "id"));
}

export function sameName(left, right) {
  return typeof left === "string" && typeof right === "string"
    && left.trim().toLocaleLowerCase("id-ID") === right.trim().toLocaleLowerCase("id-ID");
}
