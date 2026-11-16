export const educationOptions = ["SMP", "SMA", "Kuliah", "Umum"];
export const competitionCategoryOptions = ["Akademik", "Non-akademik"];
export const competitionTypeOptions = [
  "Esai / karya tulis",
  "Ujian / tes tertulis",
  "Proyek / riset",
  "Olimpiade / kuis",
  "Debat",
  "Presentasi / pitching",
  "Karya / prototipe",
  "Desain / kreativitas",
  "Hackathon",
  "Pertunjukan / penampilan",
  "Lainnya",
];
export const competitionFieldOptions = [
  "Teknologi",
  "Sains",
  "Matematika",
  "Esai dan Karya Tulis",
  "Desain dan Kreativitas",
  "Bisnis dan Ekonomi",
  "Olahraga",
  "Seni dan Budaya",
  "Lainnya",
];
export const participantTypeOptions = ["Individu", "Tim"];
export const targetParticipantOptions = ["SD / MI", "SMP / MTs", "SMA / SMK / MA", "Mahasiswa", "Umum"];
export const scopeOptions = ["Kabupaten/Kota", "Provinsi", "Nasional", "Internasional"];
export const provinceOptions = [
  "Aceh",
  "Bali",
  "Banten",
  "Bengkulu",
  "DI Yogyakarta",
  "DKI Jakarta",
  "Gorontalo",
  "Jambi",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Kepulauan Bangka Belitung",
  "Kepulauan Riau",
  "Lampung",
  "Maluku",
  "Maluku Utara",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Pegunungan",
  "Papua Selatan",
  "Papua Tengah",
  "Riau",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Sulawesi Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Sumatera Utara",
];
export const organizerOptions = ["Pemerintah", "Universitas", "Lembaga umum", "Komunitas"];
export const organizerLevelOptions = [
  "SD",
  "SMP",
  "SMA",
  "Perguruan Tinggi / Universitas",
  "Pemerintah Daerah",
  "Kementerian Pendidikan Dasar",
  "Kemdikti",
  "Lembaga/Organisasi",
  "Komunitas",
  "Lainnya",
];
export const competitionModeOptions = ["Online", "Offline", "Hybrid"];
const validAccountTypes = ["participant", "organizer"];
const createCompetitionTagline = (description) => {
  const summary = String(description || "")
    .replace(/\[\[\/?justify\]\]/g, "")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (summary.length <= 500) return summary;
  const cutoff = summary.lastIndexOf(" ", 497);
  return `${summary.slice(0, cutoff > 0 ? cutoff : 497).trimEnd()}...`;
};

export const phoneCountryCodes = [
  { country: "ID", name: "Indonesia", callingCode: "+62" },
  { country: "MY", name: "Malaysia", callingCode: "+60" },
  { country: "SG", name: "Singapura", callingCode: "+65" },
  { country: "BN", name: "Brunei", callingCode: "+673" },
  { country: "PH", name: "Filipina", callingCode: "+63" },
  { country: "TH", name: "Thailand", callingCode: "+66" },
  { country: "VN", name: "Vietnam", callingCode: "+84" },
  { country: "JP", name: "Jepang", callingCode: "+81" },
  { country: "KR", name: "Korea Selatan", callingCode: "+82" },
  { country: "CN", name: "Tiongkok", callingCode: "+86" },
  { country: "HK", name: "Hong Kong", callingCode: "+852" },
  { country: "TW", name: "Taiwan", callingCode: "+886" },
  { country: "IN", name: "India", callingCode: "+91" },
  { country: "AU", name: "Australia", callingCode: "+61" },
  { country: "NZ", name: "Selandia Baru", callingCode: "+64" },
  { country: "US", name: "Amerika Serikat", callingCode: "+1" },
  { country: "CA", name: "Kanada", callingCode: "+1" },
  { country: "GB", name: "Britania Raya", callingCode: "+44" },
  { country: "DE", name: "Jerman", callingCode: "+49" },
  { country: "FR", name: "Prancis", callingCode: "+33" },
  { country: "NL", name: "Belanda", callingCode: "+31" },
  { country: "SA", name: "Arab Saudi", callingCode: "+966" },
  { country: "AE", name: "Uni Emirat Arab", callingCode: "+971" },
];
export function getScrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

export function scrollToPageSection(sectionId, behavior = getScrollBehavior()) {
  const section = document.getElementById(sectionId);
  if (!section) return false;

  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const top = window.scrollY + section.getBoundingClientRect().top - headerHeight - 12;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export const birthYearOptions = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => String(1900 + index),
);
export const defaultPreferences = {
  category: "",
  mode: "",
  education: "",
  locationScope: "",
  province: "",
  city: "",
  feeType: "",
};

const preferenceEducationAliases = {
  SMP: "SMP / MTs",
  SMA: "SMA / SMK / MA",
  Kuliah: "Mahasiswa",
};
const preferenceLocationAliases = { Daerah: "Kabupaten/Kota" };

export function normalizePhoneNumber(phone, callingCode = "+62") {
  const value = String(phone || "").trim();
  let digits = value.replace(/\D/g, "");
  if (value.startsWith("+")) {
    const internationalNumber = `+${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(internationalNumber) ? internationalNumber : "";
  }

  if (digits.startsWith("00")) digits = digits.slice(2);
  const countryDigits = callingCode.replace(/\D/g, "");
  if (digits.startsWith(countryDigits) && digits.length - countryDigits.length >= 7) {
    digits = digits.slice(countryDigits.length);
  }
  if (digits.startsWith("0")) digits = digits.slice(1);

  const internationalNumber = `+${countryDigits}${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(internationalNumber) ? internationalNumber : "";
}

export function getInitialTheme() {
  const savedTheme = localStorage.getItem("lombalink.theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function accountFromUser(user, profileAccountType) {
  if (!user) return null;
  const accountType = validAccountTypes.includes(profileAccountType) ? profileAccountType : "";
  const savedPreferences = user.user_metadata?.preferences;
  const preferences = savedPreferences && typeof savedPreferences === "object" ? savedPreferences : {};
  const province = user.user_metadata?.province || "";
  const city = user.user_metadata?.city || "";
  const birthYear = user.user_metadata?.birth_year;
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
    birthYear: typeof birthYear === "number" || typeof birthYear === "string" ? String(birthYear) : "",
    education: user.user_metadata?.education || "",
    institution: user.user_metadata?.institution || "",
    avatarUrl: user.user_metadata?.avatar_url || "",
    avatarPath: user.user_metadata?.avatar_path || "",
    preferences: {
      category: typeof preferences.category === "string" ? preferences.category : "",
      mode: typeof preferences.mode === "string" ? preferences.mode : "",
      education: typeof preferences.education === "string"
        ? preferenceEducationAliases[preferences.education] || preferences.education
        : "",
      locationScope: typeof preferences.locationScope === "string"
        ? preferenceLocationAliases[preferences.locationScope] || preferences.locationScope
        : "",
      province: typeof preferences.province === "string" ? preferences.province : "",
      city: typeof preferences.city === "string" ? preferences.city : "",
      feeType: typeof preferences.feeType === "string" ? preferences.feeType : "",
    },
    accountType,
    role: user.app_metadata?.role === "moderator" ? "moderator" : accountType || "unselected",
  };
}

export function competitionFromRow(row) {
  return {
    id: row.id,
    submitterId: row.submitted_by || "",
    title: row.title,
    organizer: row.organizer,
    organizerType: row.organizer_type,
    category: row.category,
    competitionCategory: row.competition_category || "",
    participantType: row.participant_type || "",
    teamMinMembers: row.team_min_members == null ? "" : String(row.team_min_members),
    teamMaxMembers: row.team_max_members == null ? "" : String(row.team_max_members),
    targetParticipants: Array.isArray(row.target_participants) ? row.target_participants : [],
    requirements: row.requirements || "",
    feeType: row.fee_type || (Array.isArray(row.fee_tiers) && row.fee_tiers.length ? "Berbayar" : "Gratis"),
    feeAmount: row.fee_amount == null ? "" : String(row.fee_amount),
    contact: row.contact || row.contact_person_phone || "",
    education: row.education,
    scope: row.scope,
    location: row.location,
    deadline: row.deadline,
    prize: row.prize,
    mode: row.mode,
    description: row.description,
    registrationUrl: row.registration_url,
    informationUrl: row.information_url || "",
    rulebookUrl: row.rulebook_url || "",
    guidebookPath: row.guidebook_path || "",
    guidebookUrl: row.rulebook_url || "",
    coverPath: row.cover_path || "",
    tagline: row.description ? createCompetitionTagline(row.description) : row.tagline || "",
    audience: row.audience || "",
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    feeTiers: Array.isArray(row.fee_tiers) ? row.fee_tiers : [],
    registrationBatches: Array.isArray(row.registration_batches) ? row.registration_batches : [],
    eventStartDate: row.event_start_date || "",
    eventEndDate: row.event_end_date || "",
    competitionType: row.competition_type || "",
    organizerLevel: row.organizer_level || "",
    contactPersonName: row.contact_person_name || "",
    contactPersonEmail: row.contact_person_email || "",
    contactPersonPhone: row.contact_person_phone || "",
    contactPeople: Array.isArray(row.contact_people) ? row.contact_people : [],
    benefits: row.benefits || "",
    archivedAt: row.archived_at || null,
    featured: row.featured,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

export function getCompetitionCoverUrl(supabaseClient, coverPath) {
  if (!coverPath) return "";
  return supabaseClient.storage.from("lombalink-competition-covers").getPublicUrl(coverPath).data.publicUrl;
}

function legacyEducation(targetParticipants) {
  const firstParticipant = targetParticipants[0];
  if (firstParticipant === "SMP / MTs") return "SMP";
  if (firstParticipant === "SMA / SMK / MA") return "SMA";
  if (firstParticipant === "Mahasiswa") return "Kuliah";
  return "Umum";
}

export function getAnalyticsVisitorId() {
  const key = "lombalink.analytics-visitor";
  try {
    let visitorId = sessionStorage.getItem(key);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      sessionStorage.setItem(key, visitorId);
    }
    return visitorId;
  } catch {
    return crypto.randomUUID();
  }
}

export function competitionFieldsFromForm(form) {
  const registrationBatches = (Array.isArray(form.registrationBatches) ? form.registrationBatches : [])
    .map((batch, index) => {
      const amount = batch.feeType === "Berbayar" && batch.feeAmount !== "" && batch.feeAmount != null
        ? typeof batch.feeAmount === "number"
          ? batch.feeAmount
          : Number(String(batch.feeAmount ?? "").replace(/\D/g, "")) || 0
        : null;
      return {
        label: `Batch ${index + 1}`,
        startsAt: batch.startsAt,
        endsAt: batch.endsAt,
        feeType: batch.feeType,
        feeAmount: amount,
      };
    });
  const firstBatch = registrationBatches[0];
  const contactPeople = (Array.isArray(form.contactPeople) ? form.contactPeople : []).map((person) => ({
    name: person.name.trim(),
    phone: person.contactMethods.includes("whatsapp") ? normalizePhoneNumber(person.phone, "+62") : "",
    email: person.email.trim() || "",
    instagramUsername: person.instagramUsername.trim().replace(/^@+/, ""),
    instagramUrl: person.instagramUrl.trim(),
    tiktokUsername: person.tiktokUsername.trim().replace(/^@+/, ""),
    tiktokUrl: person.tiktokUrl.trim(),
    whatsappUrl: person.whatsappUrl.trim(),
    contactMethods: [...person.contactMethods],
  }));
  const primaryContact = contactPeople[0] || {
    name: "",
    phone: "",
    email: "",
  };
  const teamMemberRange = String(form.teamMemberRange || "").match(/^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/);
  const governmentOrganizerLevels = ["Pemerintah Daerah", "Kementerian Pendidikan Dasar", "Kemdikti"];
  const organizerType = form.organizerType || (
    governmentOrganizerLevels.includes(form.organizerLevel)
      ? "Pemerintah"
      : form.organizerLevel === "Perguruan Tinggi / Universitas"
        ? "Universitas"
        : form.organizerLevel === "Komunitas" ? "Komunitas" : "Lembaga umum"
  );
  const latestRegistrationDeadline = registrationBatches
    .map((batch) => batch.endsAt)
    .filter(Boolean)
    .sort()
    .at(-1) || "";
  return {
    title: form.title.trim(),
    tagline: createCompetitionTagline(form.description),
    description: form.description.trim(),
    organizer: form.organizer.trim(),
    organizer_type: organizerType,
    organizer_level: form.organizerLevel || "Lembaga",
    contact: primaryContact.phone,
    contact_person_name: primaryContact.name,
    contact_person_email: primaryContact.email || null,
    contact_person_phone: primaryContact.phone || null,
    contact_people: contactPeople,
    audience: form.targetParticipants.join(", "),
    education: legacyEducation(form.targetParticipants),
    scope: form.scope,
    category: form.field === "Lainnya" ? (form.customField.trim() || "Lainnya") : form.field,
    competition_category: form.competitionCategory,
    participant_type: form.participantType,
    team_min_members: form.participantType === "Tim" && teamMemberRange ? Number(teamMemberRange[1]) : null,
    team_max_members: form.participantType === "Tim" && teamMemberRange ? Number(teamMemberRange[2] || teamMemberRange[1]) : null,
    target_participants: form.targetParticipants,
    requirements: form.requirements.trim(),
    keywords: form.keywords,
    competition_type: form.competitionType === "Lainnya"
      ? form.customCompetitionType.trim()
      : form.competitionType || "Lainnya",
    mode: form.mode,
    location: form.mode === "Online" ? "Online" : form.location.trim(),
    fee_type: firstBatch?.feeType || "Gratis",
    fee_amount: firstBatch?.feeType === "Berbayar" ? firstBatch.feeAmount : null,
    fee_tiers: registrationBatches
      .filter((batch) => batch.feeType === "Berbayar" && batch.feeAmount != null)
      .map(({ label, feeAmount }) => ({ label, amount: feeAmount })),
    prize: form.prize.trim() || "Informasi hadiah belum ditambahkan",
    registration_batches: registrationBatches,
    deadline: latestRegistrationDeadline || null,
    event_start_date: form.eventStartDate || null,
    event_end_date: form.eventStartDate && form.eventEndDate && form.eventEndDate >= form.eventStartDate
      ? form.eventEndDate
      : null,
    registration_url: form.registrationUrl.trim() || null,
    information_url: form.informationUrl || null,
    rulebook_url: form.guidebookUrl?.trim() || null,
    guidebook_path: form.guidebookPath || null,
    benefits: form.benefits.trim(),
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
  const birthYear = Number(account?.birthYear);
  return Boolean(
    account?.username?.trim()
    && account?.fullName?.trim()
    && normalizePhoneNumber(account?.phone)
    && account?.province?.trim()
    && account?.city?.trim()
    && Number.isInteger(birthYear)
    && birthYear >= 1900
    && birthYear <= new Date().getFullYear()
    && account?.education,
  );
}

export function formatDate(dateString) {
  if (!dateString) return "Segera";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
