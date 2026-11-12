export const educationOptions = ["SMP", "SMA", "Kuliah", "Umum"];
export const scopeOptions = ["Daerah", "Provinsi", "Nasional", "Internasional"];
export const organizerOptions = ["Pemerintah", "Universitas", "Lembaga umum", "Komunitas"];
export const defaultPreferences = {
  category: "",
  education: "",
  scope: "",
  organizerType: "",
  location: "",
};

export function getInitialTheme() {
  const savedTheme = localStorage.getItem("lombalink.theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function accountFromUser(user) {
  if (!user) return null;
  const savedPreferences = user.user_metadata?.preferences;
  const preferences = savedPreferences && typeof savedPreferences === "object" ? savedPreferences : {};
  const province = user.user_metadata?.province || "";
  const city = user.user_metadata?.city || "";
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    username: user.user_metadata?.username || "",
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || "",
    email: user.email || "",
    phone: user.user_metadata?.phone || "",
    province,
    city,
    region: province && city ? `${city}, ${province}` : user.user_metadata?.region || "",
    birthDate: user.user_metadata?.birth_date || "",
    education: user.user_metadata?.education || "",
    institution: user.user_metadata?.institution || "",
    avatarUrl: user.user_metadata?.avatar_url || "",
    avatarPath: user.user_metadata?.avatar_path || "",
    preferences: {
      category: typeof preferences.category === "string" ? preferences.category : "",
      education: typeof preferences.education === "string" ? preferences.education : "",
      scope: typeof preferences.scope === "string" ? preferences.scope : "",
      organizerType: typeof preferences.organizerType === "string" ? preferences.organizerType : "",
      location: typeof preferences.location === "string" ? preferences.location : "",
    },
    role: user.app_metadata?.role === "moderator" ? "moderator" : "user",
  };
}

export function competitionFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    organizerType: row.organizer_type,
    category: row.category,
    education: row.education,
    scope: row.scope,
    location: row.location,
    deadline: row.deadline,
    prize: row.prize,
    mode: row.mode,
    description: row.description,
    registrationUrl: row.registration_url,
    featured: row.featured,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

export function authErrorMessage(error, fallback = "Login gagal. Silakan coba kembali.") {
  const code = typeof error?.code === "string" ? error.code.toLowerCase() : "";
  const message = typeof error === "string" ? error : typeof error?.message === "string" ? error.message : "";
  const normalized = message.toLowerCase();

  if (code === "user_banned" || normalized.includes("user is banned") || normalized.includes("user banned")) {
    return "Akun sedang dibatasi moderator. Jika ini ban sementara, coba lagi setelah masa ban berakhir. Untuk mengetahui detailnya, hubungi moderator LombaLink.";
  }
  if (code === "invalid_credentials" || normalized.includes("invalid login credentials")) {
    return "Email atau kredensial masuk tidak cocok. Periksa kembali lalu coba lagi.";
  }
  if (code === "email_not_confirmed" || normalized.includes("email not confirmed")) {
    return "Email akun belum dikonfirmasi. Selesaikan konfirmasi melalui email terlebih dahulu.";
  }
  if (code === "over_request_rate_limit" || error?.status === 429) {
    return "Terlalu banyak percobaan masuk. Tunggu beberapa saat sebelum mencoba lagi.";
  }
  if (code === "signup_disabled") {
    return "Pendaftaran sedang dinonaktifkan. Silakan hubungi administrator LombaLink.";
  }
  if (code === "provider_disabled" || normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
    return "Login Google belum aktif. Periksa konfigurasi Google di Supabase Authentication.";
  }
  if (error instanceof TypeError && normalized.includes("fetch")) {
    return "Tidak dapat terhubung ke layanan login. Periksa koneksi internet lalu coba lagi.";
  }
  return message || fallback;
}

export function googleOAuthErrorMessage(error) {
  const message = typeof error === "string" ? error : typeof error?.message === "string" ? error.message : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google OAuth belum aktif di Supabase. Aktifkan Google di Authentication → Sign In / Providers, isi Client ID dan Client Secret dari Google Cloud, lalu izinkan URL callback Supabase di Google Cloud serta URL aplikasi di Authentication → URL Configuration.";
  }
  return authErrorMessage(error, "Login Google gagal. Silakan coba kembali.");
}

export function isProfileComplete(account) {
  return Boolean(
    account?.username?.trim()
    && account?.fullName?.trim()
    && account?.phone?.trim()
    && account?.province?.trim()
    && account?.city?.trim()
    && account?.birthDate
    && account?.education,
  );
}

export function formatDate(dateString) {
  if (!dateString) return "Segera";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date);
}
