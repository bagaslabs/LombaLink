import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthUserRecord = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
};

type JsonRecord = Record<string, unknown>;

const supabaseUrl = Deno.env.get("SUPABASE_URL");

function getDefaultKey(dictionaryName: string, legacyName: string) {
  const rawDictionary = Deno.env.get(dictionaryName);
  if (rawDictionary) {
    const keys: Record<string, unknown> = JSON.parse(rawDictionary);
    if (typeof keys.default === "string" && keys.default) return keys.default;
  }

  const legacyKey = Deno.env.get(legacyName);
  if (legacyKey) return legacyKey;
  throw new Error(`Missing ${dictionaryName} and ${legacyName} Edge Function environment values.`);
}

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL Edge Function environment value.");

const publishableKey = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const secretKey = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
const authClient = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const pageSize = 25;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toManagedUser(user: AuthUserRecord) {
  const metadata = user.user_metadata ?? {};
  const appMetadata = user.app_metadata ?? {};
  const sanction = isRecord(appMetadata.account_sanction) ? appMetadata.account_sanction : {};
  const banUntil = user.banned_until ?? (asString(sanction.expires_at) || null);
  const banActive = typeof banUntil === "string" && Date.parse(banUntil) > Date.now();
  const status = appMetadata.account_status === "deactivated"
    ? "deactivated"
    : appMetadata.account_status === "suspended"
      ? "suspended"
      : banActive
        ? "banned"
        : "active";

  return {
    id: user.id,
    email: user.email ?? "",
    username: asString(metadata.username),
    fullName: asString(metadata.full_name ?? metadata.name),
    phone: asString(metadata.phone),
    region: asString(metadata.region),
    province: asString(metadata.province),
    city: asString(metadata.city),
    birthYear: typeof metadata.birth_year === "number" || typeof metadata.birth_year === "string" ? String(metadata.birth_year) : "",
    education: asString(metadata.education),
    institution: asString(metadata.institution),
    avatarUrl: asString(metadata.avatar_url),
    avatarPath: asString(metadata.avatar_path),
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    role: appMetadata.role === "moderator" ? "moderator" : "user",
    status,
    sanctionReason: asString(sanction.reason),
    bannedUntil: banActive ? banUntil : null,
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getTargetUser(userId: string, moderatorId: string): Promise<{ user: AuthUserRecord | null; response: Response | null }> {
  if (userId === moderatorId) {
    return { user: null, response: jsonResponse({ error: "Akun moderator yang sedang digunakan tidak dapat diubah." }, 403) };
  }

  const { data, error } = await adminClient.auth.admin.getUserById(userId);
  if (error) return { user: null, response: jsonResponse({ error: error.message }, 400) };
  if (!data.user) return { user: null, response: jsonResponse({ error: "Pengguna tidak ditemukan." }, 404) };
  if (data.user.app_metadata?.role === "moderator") {
    return { user: null, response: jsonResponse({ error: "Akun moderator lain tidak dapat diubah dari pengelolaan pengguna." }, 403) };
  }

  return { user: data.user, response: null };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Metode tidak didukung." }, 405);

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Sesi login diperlukan." }, 401);

  const { data: { user: moderator }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !moderator) return jsonResponse({ error: "Sesi login tidak valid atau sudah berakhir." }, 401);
  if (moderator.app_metadata?.role !== "moderator") {
    return jsonResponse({ error: "Akses hanya untuk moderator." }, 403);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return jsonResponse({ error: "Format permintaan tidak valid." }, 400);
  }
  if (!isRecord(parsedBody)) return jsonResponse({ error: "Format permintaan tidak valid." }, 400);
  const body = parsedBody;

  if (body.action === "list") {
    const page = body.page ?? 1;
    if (typeof page !== "number" || !Number.isInteger(page) || page < 1 || page > 10000) {
      return jsonResponse({ error: "Nomor halaman tidak valid." }, 400);
    }

    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) return jsonResponse({ error: error.message }, 400);
    const users = data.users.map(toManagedUser);
    return jsonResponse({ users, page, hasMore: users.length === pageSize });
  }

  const userId = body.userId;
  if (!isUuid(userId)) return jsonResponse({ error: "ID pengguna tidak valid." }, 400);
  const { user, response } = await getTargetUser(userId, moderator.id);
  if (response) return response;
  if (!user) return jsonResponse({ error: "Pengguna tidak ditemukan." }, 404);

  if (body.action === "update_profile") {
    const profile = body.profile;
    if (
      !isRecord(profile)
      || typeof profile.username !== "string"
      || typeof profile.fullName !== "string"
      || typeof profile.phone !== "string"
      || typeof profile.province !== "string"
      || typeof profile.city !== "string"
      || typeof profile.birthYear !== "string"
      || typeof profile.education !== "string"
      || typeof profile.institution !== "string"
    ) {
      return jsonResponse({ error: "Data profil tidak lengkap atau tidak valid." }, 400);
    }

    const normalized = {
      username: profile.username.trim().toLowerCase(),
      full_name: profile.fullName.trim(),
      phone: profile.phone.trim(),
      province: profile.province.trim(),
      city: profile.city.trim(),
      birth_year: profile.birthYear.trim(),
      education: profile.education.trim(),
      institution: profile.institution.trim(),
    };
    if (
      !normalized.username
      || !normalized.full_name
      || !normalized.phone
      || !normalized.province
      || !normalized.city
      || !normalized.birth_year
      || !normalized.education
    ) {
      return jsonResponse({ error: "Username, nama, nomor HP, provinsi, kota, tahun lahir, dan jenjang wajib diisi." }, 400);
    }
    if (!/^[a-z0-9._]{3,30}$/.test(normalized.username)) {
      return jsonResponse({ error: "Username harus 3–30 karakter dan hanya boleh berisi huruf, angka, titik, atau garis bawah." }, 400);
    }
    const birthYear = Number(normalized.birth_year);
    if (!/^\d{4}$/.test(normalized.birth_year) || !Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
      return jsonResponse({ error: "Tahun lahir tidak valid." }, 400);
    }
    if (!["SMP", "SMA", "Kuliah", "Umum"].includes(normalized.education)) {
      return jsonResponse({ error: "Jenjang tidak valid." }, 400);
    }
    if (normalized.full_name.length > 120 || normalized.phone.length > 40 || normalized.province.length > 120 || normalized.city.length > 120 || normalized.institution.length > 160) {
      return jsonResponse({ error: "Ada data profil yang melebihi batas panjang." }, 400);
    }
    const region = `${normalized.city}, ${normalized.province}`;
    const normalizedProfile = { ...normalized, birth_year: birthYear };

    const userMetadata = { ...(user.user_metadata ?? {}), ...normalizedProfile, region, birth_date: null };
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: userMetadata,
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    if (!data.user) return jsonResponse({ error: "Profil pengguna tidak ditemukan setelah diperbarui." }, 404);
    const { error: profileError } = await adminClient.from("lombalink_profiles").upsert({
      id: userId,
      ...normalizedProfile,
      region,
    });
    if (profileError) {
      if (profileError.code === "23505") return jsonResponse({ error: "Username sudah digunakan. Pilih username lain." }, 409);
      return jsonResponse({ error: `Metadata Auth berhasil diperbarui, tetapi profil database gagal diperbarui: ${profileError.message}` }, 500);
    }
    return jsonResponse({ user: toManagedUser(data.user) });
  }

  if (body.action === "delete") {
    const avatarPath = asString(user.user_metadata?.avatar_path);
    if (avatarPath) {
      if (!avatarPath.startsWith(`${userId}/`)) {
        return jsonResponse({ error: "Path foto profil tidak sesuai dengan akun dan tidak dapat dihapus dengan aman." }, 400);
      }
      const { error: avatarError } = await adminClient.storage.from("lombalink-profile-photos").remove([avatarPath]);
      if (avatarError) return jsonResponse({ error: `Foto profil gagal dihapus: ${avatarError.message}` }, 400);
    }
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ deletedUserId: userId });
  }

  if (body.action === "suspend" || body.action === "ban") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      return jsonResponse({ error: "Alasan wajib diisi dan maksimal 500 karakter." }, 400);
    }

    let durationDays: number | null = null;
    if (body.action === "ban") {
      const allowedDurations = [3, 7, 14, 30, 365];
      if (typeof body.durationDays !== "number" || !allowedDurations.includes(body.durationDays)) {
        return jsonResponse({ error: "Durasi ban tidak valid." }, 400);
      }
      durationDays = body.durationDays;
    }

    const appMetadata = { ...(user.app_metadata ?? {}) };
    const expiresAt = durationDays === null ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    appMetadata.account_status = body.action === "suspend" ? "suspended" : "banned";
    appMetadata.account_sanction = {
      type: body.action,
      reason,
      applied_at: new Date().toISOString(),
      expires_at: expiresAt,
    };
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: appMetadata,
      ban_duration: durationDays === null ? "876000h" : `${durationDays * 24}h`,
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    if (!data.user) return jsonResponse({ error: "Akun pengguna tidak ditemukan setelah perubahan." }, 404);
    return jsonResponse({ user: toManagedUser(data.user) });
  }

  if (body.action === "reactivate") {
    const appMetadata = { ...(user.app_metadata ?? {}) };
    appMetadata.account_status = "active";
    appMetadata.account_sanction = null;
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: appMetadata,
      ban_duration: "none",
    });
    if (error) return jsonResponse({ error: error.message }, 400);
    if (!data.user) return jsonResponse({ error: "Akun pengguna tidak ditemukan setelah perubahan." }, 404);
    const { data: refreshedData, error: refreshError } = await adminClient.auth.admin.getUserById(userId);
    if (refreshError) return jsonResponse({ error: `Status akun diperbarui, tetapi gagal diverifikasi: ${refreshError.message}` }, 500);
    if (!refreshedData.user) return jsonResponse({ error: "Akun pengguna tidak ditemukan saat verifikasi." }, 404);
    const updatedUser = toManagedUser(refreshedData.user);
    if (updatedUser.status !== "active") {
      return jsonResponse({ error: "Batasan login belum berhasil dihapus dari akun." }, 500);
    }
    return jsonResponse({ user: updatedUser });
  }

  return jsonResponse({ error: "Aksi tidak dikenali." }, 400);
});
