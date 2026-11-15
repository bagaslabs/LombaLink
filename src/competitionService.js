export const competitionCoverBucket = "lombalink-competition-covers";

export async function uploadCompetitionCover(supabaseClient, ownerId, competitionId, file) {
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) {
    return { path: "", error: "Gambar lomba harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB." };
  }

  const path = `${ownerId}/${competitionId}/${crypto.randomUUID()}.${extension}`;
  try {
    const { data, error } = await supabaseClient.storage
      .from(competitionCoverBucket)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    return error
      ? { path: "", error: `Gambar lomba gagal diunggah: ${error.message}` }
      : { path: data.path, error: "" };
  } catch (error) {
    return {
      path: "",
      error: `Gambar lomba gagal diunggah: ${error instanceof Error ? error.message : "kesalahan tidak diketahui."}`,
    };
  }
}

export async function uploadCompetitionGuidebook(supabaseClient, ownerId, competitionId, file) {
  if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
    return { path: "", error: "Panduan lomba harus berupa PDF dengan ukuran maksimal 5 MB." };
  }

  const path = `${ownerId}/${competitionId}/guidebook-${crypto.randomUUID()}.pdf`;
  try {
    const { data, error } = await supabaseClient.storage
      .from(competitionCoverBucket)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    return error
      ? { path: "", error: `Panduan lomba gagal diunggah: ${error.message}` }
      : { path: data.path, error: "" };
  } catch (error) {
    return {
      path: "",
      error: `Panduan lomba gagal diunggah: ${error instanceof Error ? error.message : "kesalahan tidak diketahui."}`,
    };
  }
}

export async function removeCompetitionCover(supabaseClient, path) {
  if (!path) return "";
  try {
    const { error } = await supabaseClient.storage.from(competitionCoverBucket).remove([path]);
    return error ? `Gambar lomba tidak dapat dibersihkan: ${error.message}` : "";
  } catch (error) {
    return `Gambar lomba tidak dapat dibersihkan: ${error instanceof Error ? error.message : "kesalahan tidak diketahui."}`;
  }
}
