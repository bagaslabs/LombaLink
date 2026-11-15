import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  AlignJustify,
  ArrowRight,
  Bold,
  Camera,
  Crop,
  Instagram,
  Italic,
  List,
  ListOrdered,
  Mail,
  MessageCircle,
  Music2,
  RotateCcw,
  Save,
  Smile,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import {
  competitionCategoryOptions,
  competitionFieldOptions,
  competitionModeOptions,
  competitionTypeOptions,
  normalizePhoneNumber,
  organizerLevelOptions,
  participantTypeOptions,
  provinceOptions,
  scopeOptions,
  targetParticipantOptions,
} from "./data.js";

const popularKeywordTags = ["#pramuka", "#olimpiade", "#esai", "#sains", "#teknologi", "#seni", "#debat", "#pelajar", "#gratis"];
const formSections = [
  { id: "competition-section-general", label: "Umum" },
  { id: "competition-section-technical", label: "Spesifik" },
];
const descriptionEmojis = ["🎉", "🏆", "📅", "✨", "📢", "🎁", "✅", "📍"];
const contactPlatforms = [
  { id: "instagram", label: "Instagram", Icon: Instagram },
  { id: "gmail", label: "Gmail", Icon: Mail },
  { id: "tiktok", label: "TikTok", Icon: Music2 },
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
];
const coverCropWidth = 900;
const coverCropPresetRatios = [
  { label: "4:6", width: 4, height: 6 },
  { label: "4:5", width: 4, height: 5 },
  { label: "9:16", width: 9, height: 16 },
];

function getCoverCropBounds(image, zoom, ratio) {
  const cropHeight = Math.max(1, Math.round(coverCropWidth * ratio.height / ratio.width));
  const scale = Math.max(
    coverCropWidth / image.naturalWidth,
    cropHeight / image.naturalHeight,
  ) * zoom;
  return {
    x: Math.max(0, (image.naturalWidth * scale - coverCropWidth) / 2),
    y: Math.max(0, (image.naturalHeight * scale - cropHeight) / 2),
  };
}

function clampCoverCropOffset(offset, image, zoom, ratio) {
  const bounds = getCoverCropBounds(image, zoom, ratio);
  return {
    x: Math.min(bounds.x, Math.max(-bounds.x, offset.x)),
    y: Math.min(bounds.y, Math.max(-bounds.y, offset.y)),
  };
}

function drawCoverCrop(canvas, image, zoom, offset, ratio) {
  const context = canvas.getContext("2d");
  if (!context) return false;
  const cropHeight = Math.max(1, Math.round(canvas.width * ratio.height / ratio.width));

  const scale = Math.max(
    canvas.width / image.naturalWidth,
    cropHeight / image.naturalHeight,
  ) * zoom;
  const cropOffset = clampCoverCropOffset(offset, image, zoom, ratio);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  if (canvas.height !== cropHeight) canvas.height = cropHeight;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, cropHeight);
  context.drawImage(
    image,
    (canvas.width - width) / 2 + cropOffset.x,
    (canvas.height - height) / 2 + cropOffset.y,
    width,
    height,
  );
  return true;
}

function normalizeKeywordTag(value) {
  const tag = String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .toLocaleLowerCase("id-ID");
  return tag ? `#${tag}` : "";
}

function formatRupiahInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 15);
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

function normalizeRegistrationBatch(batch, index, fallbackFeeType = "Gratis", fallbackFeeAmount = "") {
  const feeType = batch?.feeType || fallbackFeeType;
  return {
    label: batch?.label || `Batch ${index + 1}`,
    startsAt: batch?.startsAt || "",
    endsAt: batch?.endsAt || "",
    feeType,
    feeAmount: feeType === "Berbayar"
      ? formatRupiahInput(batch?.feeAmount ?? fallbackFeeAmount)
      : "",
  };
}

function normalizeContactPerson(person = {}) {
  let phone = String(person.phone || "").replace(/\D/g, "");
  if (phone.startsWith("62")) phone = phone.slice(2);
  else if (phone.startsWith("0")) phone = phone.slice(1);
  const savedContactMethods = Array.isArray(person.contactMethods)
    ? [...new Set(person.contactMethods.filter((method) => contactPlatforms.some((platform) => platform.id === method)))]
    : [];
  const contactMethods = savedContactMethods.length
    ? savedContactMethods
    : [
      ...(person.instagramUsername || person.instagramUrl ? ["instagram"] : []),
      ...(person.email ? ["gmail"] : []),
      ...(person.tiktokUsername || person.tiktokUrl ? ["tiktok"] : []),
      ...(person.phone || person.whatsappUrl ? ["whatsapp"] : []),
    ];
  return {
    name: person.name || "",
    phone: phone.slice(0, 13),
    email: person.email || "",
    instagramUsername: person.instagramUsername || "",
    instagramUrl: person.instagramUrl || "",
    tiktokUsername: person.tiktokUsername || "",
    tiktokUrl: person.tiktokUrl || "",
    whatsappUrl: person.whatsappUrl || "",
    contactMethods,
  };
}

function hasContactMethodDetails(person) {
  return person.contactMethods.some((method) => {
    if (method === "instagram") return Boolean(person.instagramUsername.trim() || person.instagramUrl.trim());
    if (method === "gmail") return Boolean(person.email.trim());
    if (method === "tiktok") return Boolean(person.tiktokUsername.trim() || person.tiktokUrl.trim());
    if (method === "whatsapp") return isValidIndonesianPhone(person.phone);
    return false;
  });
}

function getTeamMemberRange(minimum, maximum) {
  const minimumValue = minimum == null || minimum === "" ? "" : String(minimum);
  const maximumValue = maximum == null || maximum === "" ? "" : String(maximum);
  if (!minimumValue) return maximumValue;
  if (!maximumValue || minimumValue === maximumValue) return minimumValue;
  return `${minimumValue}-${maximumValue}`;
}

function parseTeamMemberRange(value) {
  const match = String(value || "").match(/^\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/);
  if (!match) return null;
  return { minimum: Number(match[1]), maximum: Number(match[2] || match[1]) };
}

function getCompetitionLocationFields(location, scope) {
  const value = String(location || "").trim();
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const matchProvince = (part) => provinceOptions.find((province) => (
    province.toLocaleLowerCase("id-ID") === part.toLocaleLowerCase("id-ID")
  ));
  if (scope === "Provinsi") {
    const province = [...parts].reverse().map(matchProvince).find(Boolean);
    return { locationArea: "", locationProvince: province || value };
  }
  if (scope === "Kabupaten/Kota" || scope === "Daerah") {
    if (parts.length > 1) {
      return {
        locationArea: parts.slice(0, -1).join(", "),
        locationProvince: matchProvince(parts.at(-1)) || parts.at(-1),
      };
    }
    const province = matchProvince(value);
    return province
      ? { locationArea: "", locationProvince: province }
      : { locationArea: value, locationProvince: "" };
  }
  return { locationArea: "", locationProvince: "" };
}

function combineCompetitionLocation(scope, locationArea, locationProvince, fallback = "") {
  if (scope === "Provinsi") return String(locationProvince || "").trim();
  if (scope === "Kabupaten/Kota" || scope === "Daerah") {
    return [locationArea, locationProvince].map((part) => String(part || "").trim()).filter(Boolean).join(", ");
  }
  return fallback;
}

function normalizeCompetitionType(value, customValue = "") {
  const type = String(value || "").trim();
  const customType = String(customValue || "").trim();
  if (type === "Lainnya") {
    return customType
      ? { competitionType: "Lainnya", customCompetitionType: customType }
      : { competitionType: "", customCompetitionType: "" };
  }
  if (competitionTypeOptions.includes(type)) {
    return { competitionType: type, customCompetitionType: "" };
  }
  return type
    ? { competitionType: "Lainnya", customCompetitionType: type }
    : { competitionType: "", customCompetitionType: "" };
}

function toForm(competition) {
  const legacyTargets = {
    SMP: ["SMP / MTs"],
    SMA: ["SMA / SMK / MA"],
    Kuliah: ["Mahasiswa"],
    Umum: ["Umum"],
  };
  const feeTiers = Array.isArray(competition?.feeTiers) ? competition.feeTiers : [];
  const savedBatches = Array.isArray(competition?.registrationBatches) ? competition.registrationBatches : [];
  const fallbackFeeType = competition?.feeType || (feeTiers.length ? "Berbayar" : "Gratis");
  const registrationBatches = (savedBatches.length ? savedBatches : [{
    startsAt: "",
    endsAt: competition?.deadline || "",
  }]).map((batch, index) => {
    const feeTier = feeTiers[index];
    return normalizeRegistrationBatch(
      batch,
      index,
      feeTier ? "Berbayar" : fallbackFeeType,
      feeTier?.amount ?? competition?.feeAmount ?? "",
    );
  });
  const savedContactPeople = Array.isArray(competition?.contactPeople) ? competition.contactPeople : [];
  const legacyPhone = competition?.contactPersonPhone
    || (/^[+\d\s().-]+$/.test(competition?.contact || "") ? competition.contact : "");
  const contactPeople = (savedContactPeople.length ? savedContactPeople : [{
    name: competition?.contactPersonName || "",
    phone: legacyPhone,
    email: competition?.contactPersonEmail || "",
  }]).map(normalizeContactPerson);
  const savedField = competition?.category || "";
  const customField = savedField && !competitionFieldOptions.includes(savedField) ? savedField : "";
  const competitionTypeFields = normalizeCompetitionType(competition?.competitionType);
  const location = competition?.location || "";
  return {
    title: competition?.title || "",
    description: competition?.description || "",
    competitionCategory: competition?.competitionCategory || "",
    field: customField ? "Lainnya" : savedField,
    customField,
    keywords: Array.isArray(competition?.keywords)
      ? [...new Set(competition.keywords.map(normalizeKeywordTag).filter(Boolean))]
      : [],
    keywordInput: "",
    scope: competition?.scope || "",
    participantType: competition?.participantType === "Individu dan Tim" ? "" : competition?.participantType || "",
    targetParticipants: Array.isArray(competition?.targetParticipants) && competition.targetParticipants.length
      ? competition.targetParticipants
      : legacyTargets[competition?.education] || [],
    mode: competition?.mode || "",
    location,
    ...getCompetitionLocationFields(location, competition?.scope || ""),
    organizer: competition?.organizer || "",
    organizerType: competition?.organizerType || "",
    organizerLevel: competition?.organizerLevel || "",
    contactPeople,
    teamMemberRange: competition?.teamMemberRange || getTeamMemberRange(competition?.teamMinMembers, competition?.teamMaxMembers),
    ...competitionTypeFields,
    registrationBatches,
    prize: competition?.prize === "Informasi hadiah belum ditambahkan" ? "" : competition?.prize || "",
    requirements: competition?.requirements || "",
    eventStartDate: competition?.eventStartDate || "",
    eventEndDate: competition?.eventEndDate || "",
    registrationUrl: competition?.registrationUrl || "",
    informationUrl: competition?.informationUrl || "",
    rulebookUrl: competition?.rulebookUrl || "",
    guidebookPath: competition?.guidebookPath || "",
    guidebookUrl: competition?.guidebookUrl || competition?.rulebookUrl || "",
    benefits: competition?.benefits || "",
    coverPath: competition?.coverPath || "",
    coverUrl: competition?.coverUrl || "",
    coverFile: null,
    coverNeedsReselect: false,
    removeCover: false,
  };
}

function restoreFormDraft(storageKey, competition) {
  const initialForm = toForm(competition);
  if (!storageKey) return { form: initialForm, notice: "" };

  try {
    const savedDraft = window.localStorage.getItem(storageKey);
    if (!savedDraft) return { form: initialForm, notice: "" };
    const savedForm = JSON.parse(savedDraft);
    if (!savedForm || typeof savedForm !== "object" || Array.isArray(savedForm)) {
      throw new Error("Format draft lokal tidak valid.");
    }
    const savedKeywords = Array.isArray(savedForm.keywords)
      ? savedForm.keywords
      : typeof savedForm.keywords === "string" ? savedForm.keywords.split(",") : [];
    const savedBatches = Array.isArray(savedForm.registrationBatches)
      ? savedForm.registrationBatches
      : Array.isArray(savedForm.legacyRegistrationBatches) ? savedForm.legacyRegistrationBatches : [];
    const savedFeeTiers = Array.isArray(savedForm.feeTiers) ? savedForm.feeTiers : [];
    const legacyTargets = {
      SMP: ["SMP / MTs"],
      SMA: ["SMA / SMK / MA"],
      Kuliah: ["Mahasiswa"],
      Umum: ["Umum"],
    };
    const targetParticipants = Array.isArray(savedForm.targetParticipants)
      ? savedForm.targetParticipants
      : targetParticipantOptions.filter((target) => String(savedForm.audience || "").includes(target)).length
        ? targetParticipantOptions.filter((target) => String(savedForm.audience || "").includes(target))
        : legacyTargets[savedForm.education] || [];
    const savedField = savedForm.field ?? savedForm.category ?? "";
    const customField = savedForm.customField
      ?? (savedField && !competitionFieldOptions.includes(savedField) ? savedField : "");
    const competitionTypeFields = normalizeCompetitionType(
      savedForm.competitionType ?? savedForm.legacyCompetitionType ?? savedForm.competition_type,
      savedForm.customCompetitionType,
    );
    const locationFields = getCompetitionLocationFields(savedForm.location, savedForm.scope);
    const fallbackFeeType = savedForm.feeType ?? (savedFeeTiers.length ? "Berbayar" : "Gratis");
    const registrationBatches = (savedBatches.length ? savedBatches : [{
      startsAt: savedForm.registrationOpensAt || "",
      endsAt: savedForm.registrationDeadline || "",
    }]).map((batch, index) => normalizeRegistrationBatch(
      batch,
      index,
      savedFeeTiers[index] ? "Berbayar" : fallbackFeeType,
      savedFeeTiers[index]?.amount ?? savedForm.feeAmount ?? "",
    ));
    const savedContactPeople = Array.isArray(savedForm.contactPeople) ? savedForm.contactPeople : [{
      name: savedForm.contactPersonName || initialForm.contactPeople[0]?.name || "",
      phone: savedForm.contactPersonPhone || savedForm.contact || initialForm.contactPeople[0]?.phone || "",
      email: savedForm.contactPersonEmail || initialForm.contactPeople[0]?.email || "",
    }];

    return {
      form: {
        ...initialForm,
        ...savedForm,
        competitionCategory: savedForm.competitionCategory ?? "",
        ...competitionTypeFields,
        locationArea: savedForm.locationArea ?? locationFields.locationArea,
        locationProvince: savedForm.locationProvince ?? locationFields.locationProvince,
        field: customField ? "Lainnya" : savedField,
        customField,
        participantType: savedForm.participantType === "Individu dan Tim" ? "" : savedForm.participantType ?? "",
        targetParticipants,
        contactPeople: savedContactPeople.map(normalizeContactPerson),
        teamMemberRange: savedForm.teamMemberRange
          ?? getTeamMemberRange(savedForm.teamMinMembers, savedForm.teamMaxMembers),
        registrationBatches,
        keywords: [...new Set(savedKeywords.map(normalizeKeywordTag).filter(Boolean))],
        coverFile: null,
        coverNeedsReselect: Boolean(savedForm.coverNeedsReselect),
      },
      notice: "Draft formulir dipulihkan dari penyimpanan perangkat.",
    };
  } catch (error) {
    return {
      form: initialForm,
      notice: `Draft lokal gagal dipulihkan: ${error instanceof Error ? error.message : "kesalahan penyimpanan."}`,
    };
  }
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidIndonesianPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^[2-9]\d{6,12}$/.test(digits) && Boolean(normalizePhoneNumber(digits, "+62"));
}

export default function CompetitionForm({
  mode = "organizer",
  initialCompetition = null,
  suggestedKeywords = [],
  suggestedCompetitions = [],
  persistenceKey = "",
  onSubmit,
  onCancel,
  onSuccess,
}) {
  const [restoredForm] = useState(() => restoreFormDraft(persistenceKey, initialCompetition));
  const [form, setForm] = useState(restoredForm.form);
  const [error, setError] = useState("");
  const [storageNotice, setStorageNotice] = useState(restoredForm.notice);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [coverPreviewAspectRatio, setCoverPreviewAspectRatio] = useState("9 / 16");
  const [coverOriginalFile, setCoverOriginalFile] = useState(null);
  const [loadingCoverForEdit, setLoadingCoverForEdit] = useState(false);
  const [coverEditorFile, setCoverEditorFile] = useState(null);
  const [coverEditorUrl, setCoverEditorUrl] = useState("");
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [coverEditorZoom, setCoverEditorZoom] = useState(1);
  const [coverCropRatioLabel, setCoverCropRatioLabel] = useState("9:16");
  const [coverOriginalCropRatio, setCoverOriginalCropRatio] = useState(null);
  const [coverCropOffset, setCoverCropOffset] = useState({ x: 0, y: 0 });
  const [coverEditorImageLoaded, setCoverEditorImageLoaded] = useState(false);
  const [coverEditorError, setCoverEditorError] = useState("");
  const [activeSection, setActiveSection] = useState(formSections[0].id);
  const [emojiPickerField, setEmojiPickerField] = useState("");
  const [fieldSuggestionsOpen, setFieldSuggestionsOpen] = useState(false);
  const [typeSuggestionsOpen, setTypeSuggestionsOpen] = useState(false);
  const [organizerSuggestionsOpen, setOrganizerSuggestionsOpen] = useState(false);
  const formRef = useRef(null);
  const descriptionRef = useRef(null);
  const requirementsRef = useRef(null);
  const prizeRef = useRef(null);
  const coverEditorImageRef = useRef(null);
  const coverCropCanvasRef = useRef(null);
  const coverCropDragRef = useRef(null);
  const formStateRef = useRef(form);
  const submitButtonRef = useRef(null);
  const saveActionRef = useRef("submit");
  const isModerator = mode === "moderator";
  const isEditing = Boolean(initialCompetition?.id);
  const canSaveAsDraft = !isModerator && (!isEditing || initialCompetition.status === "draft");
  const canArchiveFromForm = !isEditing || initialCompetition.status === "draft";
  const normalizedKeywordInput = normalizeKeywordTag(form.keywordInput);
  const fieldInputValue = form.field === "Lainnya" ? form.customField : form.field;
  const competitionTypeInputValue = form.competitionType === "Lainnya"
    ? form.customCompetitionType
    : form.competitionType;
  const { keywordUsageCounts, fieldUsageCounts, organizerUsageCounts } = useMemo(() => {
    const keywordUsers = new Map();
    const fieldUsers = new Map();
    const organizerUsers = new Map();
    for (const competition of suggestedCompetitions) {
      const userId = competition.submitterId || competition.id;
      if (!userId) continue;
      for (const tag of new Set((competition.keywords || []).map(normalizeKeywordTag).filter(Boolean))) {
        if (!keywordUsers.has(tag)) keywordUsers.set(tag, new Set());
        keywordUsers.get(tag).add(userId);
      }
      const field = String(competition.category || "").trim();
      if (field && field !== "Lainnya") {
        if (!fieldUsers.has(field)) fieldUsers.set(field, new Set());
        fieldUsers.get(field).add(userId);
      }
      const organizer = String(competition.organizer || "").trim();
      if (organizer) {
        const key = organizer.toLocaleLowerCase("id-ID");
        if (!organizerUsers.has(key)) organizerUsers.set(key, { name: organizer, users: new Set() });
        organizerUsers.get(key).users.add(userId);
      }
    }
    return {
      keywordUsageCounts: new Map([...keywordUsers].map(([key, users]) => [key, users.size])),
      fieldUsageCounts: new Map([...fieldUsers].map(([key, users]) => [key, users.size])),
      organizerUsageCounts: new Map([...organizerUsers].map(([key, value]) => [key, { name: value.name, count: value.users.size }])),
    };
  }, [suggestedCompetitions]);
  const keywordSuggestions = [...new Set([
    ...suggestedKeywords.map(normalizeKeywordTag),
    ...suggestedCompetitions.flatMap((competition) => competition.keywords || []),
    ...popularKeywordTags,
  ])]
    .map(normalizeKeywordTag)
    .filter((tag) => tag && !form.keywords.includes(tag))
    .filter((tag) => !normalizedKeywordInput || tag.includes(normalizedKeywordInput.slice(1)))
    .map((tag) => ({ tag, count: keywordUsageCounts.get(tag) || 0 }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 7);
  const showCustomKeyword = normalizedKeywordInput
    && !form.keywords.includes(normalizedKeywordInput)
    && !keywordSuggestions.some(({ tag }) => tag === normalizedKeywordInput);
  const fieldSuggestions = [...new Set([
    ...competitionFieldOptions.filter((field) => field !== "Lainnya"),
    ...suggestedCompetitions.map((competition) => String(competition.category || "").trim()),
  ])]
    .filter(Boolean)
    .filter((field) => !fieldInputValue || field.toLocaleLowerCase("id-ID").includes(fieldInputValue.trim().toLocaleLowerCase("id-ID")))
    .map((field) => ({ field, count: fieldUsageCounts.get(field) || 0 }))
    .sort((first, second) => (
      Number(second.field.toLocaleLowerCase("id-ID") === fieldInputValue.trim().toLocaleLowerCase("id-ID"))
      - Number(first.field.toLocaleLowerCase("id-ID") === fieldInputValue.trim().toLocaleLowerCase("id-ID"))
      || second.count - first.count
    ))
    .slice(0, 6);
  const showCustomField = fieldInputValue.trim()
    && !fieldSuggestions.some(({ field }) => field.toLocaleLowerCase("id-ID") === fieldInputValue.trim().toLocaleLowerCase("id-ID"));
  const typeSuggestions = competitionTypeOptions
    .filter((type) => type !== "Lainnya")
    .filter((type) => !competitionTypeInputValue || type.toLocaleLowerCase("id-ID").includes(competitionTypeInputValue.trim().toLocaleLowerCase("id-ID")))
    .slice(0, 7);
  const showCustomType = competitionTypeInputValue.trim()
    && !typeSuggestions.some((type) => type.toLocaleLowerCase("id-ID") === competitionTypeInputValue.trim().toLocaleLowerCase("id-ID"));
  const organizerQuery = form.organizer.trim().toLocaleLowerCase("id-ID");
  const organizerSuggestions = [...organizerUsageCounts.values()]
    .filter(({ name }) => !organizerQuery || name.toLocaleLowerCase("id-ID").includes(organizerQuery))
    .sort((first, second) => (
      Number(second.name.toLocaleLowerCase("id-ID") === organizerQuery)
      - Number(first.name.toLocaleLowerCase("id-ID") === organizerQuery)
      || second.count - first.count
    ))
    .slice(0, 6);
  const showCustomOrganizer = organizerQuery
    && !organizerSuggestions.some(({ name }) => name.toLocaleLowerCase("id-ID") === organizerQuery);
  const selectedCoverCropRatio = coverCropRatioLabel === "Asli"
    ? coverOriginalCropRatio || coverCropPresetRatios[2]
    : coverCropPresetRatios.find(({ label }) => label === coverCropRatioLabel) || coverCropPresetRatios[2];
  const availableCoverCropRatios = coverOriginalCropRatio
    ? [...coverCropPresetRatios, coverOriginalCropRatio]
    : coverCropPresetRatios;
  const coverCropCanvasHeight = Math.max(1, Math.round(
    coverCropWidth * selectedCoverCropRatio.height / selectedCoverCropRatio.width,
  ));

  const updateForm = (updater) => {
    setForm((current) => {
      const next = updater(current);
      formStateRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    if (!persistenceKey) return undefined;
    const persistForm = () => {
      try {
        const { coverFile, ...savedForm } = formStateRef.current;
        window.localStorage.setItem(persistenceKey, JSON.stringify({
          ...savedForm,
          coverNeedsReselect: Boolean(coverFile) || savedForm.coverNeedsReselect,
        }));
        setStorageNotice((current) => current.startsWith("Draft lokal gagal")
          ? current
          : "Perubahan tersimpan otomatis di perangkat ini.");
      } catch (persistError) {
        setStorageNotice(`Draft lokal gagal disimpan: ${persistError instanceof Error ? persistError.message : "kesalahan penyimpanan."}`);
      }
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") persistForm();
    };

    persistForm();
    window.addEventListener("pagehide", persistForm);
    document.addEventListener("visibilitychange", persistWhenHidden);
    return () => {
      window.removeEventListener("pagehide", persistForm);
      document.removeEventListener("visibilitychange", persistWhenHidden);
    };
  }, [form, persistenceKey]);

  useEffect(() => {
    if (!form.coverFile) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(form.coverFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [form.coverFile]);

  useEffect(() => {
    if (!coverEditorFile) {
      setCoverEditorUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(coverEditorFile);
    setCoverEditorUrl(objectUrl);
    setCoverEditorImageLoaded(false);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverEditorFile]);

  useEffect(() => {
    const image = coverEditorImageRef.current;
    const canvas = coverCropCanvasRef.current;
    if (!coverEditorOpen || !coverEditorImageLoaded || !image || !canvas) return;
    if (!drawCoverCrop(canvas, image, coverEditorZoom, coverCropOffset, selectedCoverCropRatio)) {
      setCoverEditorError("Editor gambar tidak dapat dibuka di browser ini.");
    }
  }, [coverEditorImageLoaded, coverEditorOpen, coverEditorZoom, coverCropOffset, selectedCoverCropRatio]);

  useEffect(() => {
    const formElement = formRef.current;
    if (!formElement || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
      if (visibleSections[0]) setActiveSection(visibleSections[0].target.id);
    }, { rootMargin: "-15% 0px -70% 0px" });

    formElement.querySelectorAll("[data-form-section]").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId) => {
    const section = formRef.current?.querySelector(`#${sectionId}`);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  };

  const submitWithAction = (action) => {
    saveActionRef.current = action;
    formRef.current?.requestSubmit(submitButtonRef.current);
  };

  const update = (key) => (event) => {
    const value = event.target.value;
    updateForm((current) => ({ ...current, [key]: value }));
  };
  const updateCompetitionScope = (event) => {
    const scope = event.target.value;
    updateForm((current) => {
      const locationFields = getCompetitionLocationFields(current.location, scope);
      return {
        ...current,
        scope,
        ...locationFields,
        location: combineCompetitionLocation(
          scope,
          locationFields.locationArea,
          locationFields.locationProvince,
          current.location,
        ),
      };
    });
  };
  const updateLocationArea = (event) => {
    const locationArea = event.target.value;
    updateForm((current) => ({
      ...current,
      locationArea,
      location: combineCompetitionLocation(current.scope, locationArea, current.locationProvince, current.location),
    }));
  };
  const updateLocationProvince = (event) => {
    const locationProvince = event.target.value;
    updateForm((current) => ({
      ...current,
      locationProvince,
      location: combineCompetitionLocation(current.scope, current.locationArea, locationProvince, current.location),
    }));
  };

  const updateContactPerson = (index, key, value) => {
    const updatedValue = key === "phone"
      ? (() => {
        let digits = String(value).replace(/\D/g, "");
        if (digits.startsWith("62")) digits = digits.slice(2);
        else if (digits.startsWith("0")) digits = digits.slice(1);
        return digits.slice(0, 13);
      })()
      : value;
    updateForm((current) => ({
      ...current,
      contactPeople: current.contactPeople.map((person, personIndex) => (
        personIndex === index ? { ...person, [key]: updatedValue } : person
      )),
    }));
  };

  const toggleContactMethod = (index, method) => {
    const channelFields = [
      "email",
      "instagramUsername",
      "instagramUrl",
      "tiktokUsername",
      "tiktokUrl",
      "whatsappUrl",
    ];
    updateForm((current) => ({
      ...current,
      contactPeople: current.contactPeople.map((person, personIndex) => {
        if (personIndex !== index) return person;
        const isSelected = person.contactMethods.length === 1 && person.contactMethods[0] === method;
        const clearedFields = Object.fromEntries(channelFields.map((field) => [field, ""]));
        return isSelected
          ? {
            ...person,
            ...clearedFields,
            phone: "",
            contactMethods: [],
          }
          : {
            ...person,
            ...clearedFields,
            phone: "",
            contactMethods: [method],
          };
      }),
    }));
  };

  const updateRegistrationBatch = (index, key, value) => {
    updateForm((current) => ({
      ...current,
      registrationBatches: current.registrationBatches.map((batch, batchIndex) => (
        batchIndex === index ? { ...batch, [key]: value } : batch
      )),
    }));
  };

  const addContactPerson = () => {
    updateForm((current) => ({
      ...current,
      contactPeople: [...current.contactPeople, normalizeContactPerson()],
    }));
  };

  const removeContactPerson = (index) => {
    updateForm((current) => ({
      ...current,
      contactPeople: current.contactPeople.filter((_, personIndex) => personIndex !== index),
    }));
  };

  const addRegistrationBatch = () => {
    updateForm((current) => ({
      ...current,
      registrationBatches: [
        ...current.registrationBatches,
        normalizeRegistrationBatch({}, current.registrationBatches.length),
      ],
    }));
  };

  const removeRegistrationBatch = (index) => {
    updateForm((current) => ({
      ...current,
      registrationBatches: current.registrationBatches.filter((_, batchIndex) => batchIndex !== index),
    }));
  };

  const addKeywordTag = (value = form.keywordInput) => {
    const tag = normalizeKeywordTag(value);
    if (!tag) return;
    updateForm((current) => ({
      ...current,
      keywords: current.keywords.includes(tag) ? current.keywords : [...current.keywords, tag],
      keywordInput: "",
    }));
  };

  const selectCompetitionField = (value) => {
    const builtInField = competitionFieldOptions.find((field) => (
      field !== "Lainnya" && field.toLocaleLowerCase("id-ID") === value.toLocaleLowerCase("id-ID")
    ));
    updateForm((current) => ({
      ...current,
      field: builtInField || "Lainnya",
      customField: builtInField ? "" : value,
    }));
    setFieldSuggestionsOpen(false);
  };

  const selectCompetitionType = (value) => {
    const knownType = competitionTypeOptions.find((type) => (
      type !== "Lainnya" && type.toLocaleLowerCase("id-ID") === value.trim().toLocaleLowerCase("id-ID")
    ));
    updateForm((current) => ({
      ...current,
      competitionType: knownType || "Lainnya",
      customCompetitionType: knownType ? "" : value.trim(),
    }));
    setTypeSuggestionsOpen(false);
  };

  const selectOrganizer = (value) => {
    updateForm((current) => ({ ...current, organizer: value }));
    setOrganizerSuggestionsOpen(false);
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.description.trim() || !form.organizer.trim()
      || !form.organizerLevel || !form.competitionCategory || !form.competitionType || !form.field
      || (form.competitionType === "Lainnya" && !form.customCompetitionType.trim())
      || (form.field === "Lainnya" && !form.customField.trim())
      || !form.scope || !form.registrationUrl.trim()
      || !form.contactPeople.length) {
      return "Lengkapi nama, deskripsi, penyelenggara, kategori, tipe lomba, bidang, tingkat, link pendaftaran, dan kontak.";
    }
    if (!form.contactPeople.every((person) => (
      person.name.trim()
      && person.contactMethods.length > 0
      && hasContactMethodDetails(person)
    ))) {
      return "Setiap kontak wajib memiliki nama, memilih kanal, dan mengisi detail kontaknya.";
    }
    if (form.contactPeople.some((person) => (
      (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
      || (person.instagramUrl && !isValidUrl(person.instagramUrl))
      || (person.tiktokUrl && !isValidUrl(person.tiktokUrl))
      || (person.whatsappUrl && !isValidUrl(person.whatsappUrl))
    ))) {
      return "Periksa kembali format Gmail dan tautan Instagram, TikTok, atau WhatsApp.";
    }
    if (!form.participantType || !form.targetParticipants.length || !form.mode) {
      return "Pilih jenis peserta, minimal satu target peserta, dan mode pelaksanaan.";
    }
    if (form.participantType === "Tim" && (
      !parseTeamMemberRange(form.teamMemberRange)
      || parseTeamMemberRange(form.teamMemberRange).minimum < 1
      || parseTeamMemberRange(form.teamMemberRange).maximum < parseTeamMemberRange(form.teamMemberRange).minimum
    )) {
      return "Isi jumlah anggota tim dengan benar, contoh 5 atau 3-5.";
    }
    if (form.scope === "Provinsi" && !form.locationProvince) {
      return "Pilih provinsi cakupan lomba.";
    }
    if ((form.scope === "Kabupaten/Kota" || form.scope === "Daerah")
      && (!form.locationArea.trim() || !form.locationProvince)) {
      return "Isi daerah dan pilih provinsi cakupan lomba.";
    }
    if (form.mode !== "Online" && form.scope !== "Provinsi"
      && form.scope !== "Kabupaten/Kota" && form.scope !== "Daerah" && !form.location.trim()) {
      return "Lokasi wajib diisi untuk lomba Offline atau Hybrid.";
    }
    if (!form.registrationBatches.length) {
      return "Tambahkan minimal satu batch pendaftaran.";
    }
    if (form.registrationBatches.some((batch) => (
      !batch.startsAt
      || !batch.endsAt
      || batch.endsAt < batch.startsAt
      || !["Gratis", "Berbayar"].includes(batch.feeType)
      || (batch.feeType === "Berbayar" && (!batch.feeAmount || !Number.isFinite(Number(batch.feeAmount.replace(/\D/g, "")))))
    ))) {
      return "Lengkapi tanggal dan biaya setiap batch pendaftaran dengan benar.";
    }
    if (!isValidUrl(form.registrationUrl)) {
      return "Link pendaftaran harus diawali http:// atau https://.";
    }
    if (!isValidUrl(form.guidebookUrl)) {
      return "Link panduan harus diawali http:// atau https://.";
    }
    if (!form.coverFile && (form.removeCover || !form.coverPath)) {
      return "Poster lomba wajib diunggah sebelum mengirim lomba.";
    }

    return "";
  };

  const selectCover = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Gambar lomba harus JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    setError("");
    setCoverEditorFile(file);
    setCoverEditorZoom(1);
    setCoverOriginalCropRatio(null);
    setCoverCropOffset({ x: 0, y: 0 });
    setCoverEditorError("");
    setCoverEditorOpen(true);
  };

  const openCoverEditor = (file) => {
    if (!file) return;
    setCoverEditorFile(file);
    setCoverEditorZoom(1);
    setCoverOriginalCropRatio(null);
    setCoverCropOffset({ x: 0, y: 0 });
    setCoverEditorError("");
    setCoverEditorOpen(true);
  };

  const editCurrentCover = async () => {
    if (coverOriginalFile) {
      openCoverEditor(coverOriginalFile);
      return;
    }

    const coverUrl = previewUrl || (!form.removeCover && form.coverUrl);
    if (!coverUrl) return;
    setLoadingCoverForEdit(true);
    setError("");
    try {
      const response = await fetch(coverUrl);
      if (!response.ok) throw new Error(`server poster merespons ${response.status}.`);
      const blob = await response.blob();
      const extensionByType = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };
      const extension = extensionByType[blob.type];
      if (!extension) throw new Error("format poster lama tidak didukung. Unggah poster JPG, PNG, atau WebP.");
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error("ukuran poster lama lebih dari 5 MB. Unggah ulang versi yang lebih kecil.");
      }

      const file = new File([blob], `poster.${extension}`, { type: blob.type });
      setCoverOriginalFile(file);
      openCoverEditor(file);
    } catch (loadError) {
      setError(`Poster tidak dapat dibuka untuk diedit: ${loadError instanceof Error ? loadError.message : "kesalahan jaringan atau browser."}`);
    } finally {
      setLoadingCoverForEdit(false);
    }
  };

  const closeCoverEditor = () => {
    setCoverEditorOpen(false);
    setCoverEditorFile(null);
    setCoverEditorImageLoaded(false);
    setCoverEditorError("");
    coverCropDragRef.current = null;
  };

  const handleCoverCropPointerDown = (event) => {
    const canvas = coverCropCanvasRef.current;
    if (!canvas || !coverEditorImageLoaded) return;
    const bounds = canvas.getBoundingClientRect();
    coverCropDragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offset: coverCropOffset,
      scale: canvas.width / bounds.width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCoverCropPointerMove = (event) => {
    const drag = coverCropDragRef.current;
    const image = coverEditorImageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !image) return;
    const nextOffset = {
      x: drag.offset.x + (event.clientX - drag.clientX) * drag.scale,
      y: drag.offset.y + (event.clientY - drag.clientY) * drag.scale,
    };
    setCoverCropOffset(clampCoverCropOffset(nextOffset, image, coverEditorZoom, selectedCoverCropRatio));
  };

  const endCoverCropDrag = (event) => {
    if (coverCropDragRef.current?.pointerId !== event.pointerId) return;
    coverCropDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const changeCoverZoom = (event) => {
    const zoom = Number(event.target.value);
    const image = coverEditorImageRef.current;
    setCoverEditorZoom(zoom);
    if (image) setCoverCropOffset((current) => clampCoverCropOffset(current, image, zoom, selectedCoverCropRatio));
  };

  const changeCoverCropRatio = (ratio) => {
    const image = coverEditorImageRef.current;
    setCoverCropRatioLabel(ratio.label);
    if (image) {
      setCoverCropOffset((current) => clampCoverCropOffset(current, image, coverEditorZoom, ratio));
    } else {
      setCoverCropOffset({ x: 0, y: 0 });
    }
  };

  const resetCoverCrop = () => {
    setCoverEditorZoom(1);
    setCoverCropOffset({ x: 0, y: 0 });
  };

  const saveCoverCrop = async () => {
    const canvas = coverCropCanvasRef.current;
    const image = coverEditorImageRef.current;
    if (!canvas || !image || !coverEditorFile || !coverEditorImageLoaded) {
      setCoverEditorError("Tunggu gambar selesai dimuat sebelum menyimpan potongan.");
      return;
    }
    if (!drawCoverCrop(canvas, image, coverEditorZoom, coverCropOffset, selectedCoverCropRatio)) {
      setCoverEditorError("Editor gambar tidak dapat dibuka di browser ini.");
      return;
    }

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) {
        setCoverEditorError("Hasil potongan poster gagal dibuat. Coba lagi.");
        return;
      }
      const baseName = coverEditorFile.name.replace(/\.[^.]+$/, "") || "poster";
      const croppedFile = new File([blob], `${baseName}-crop.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      if (croppedFile.size > 5 * 1024 * 1024) {
        setCoverEditorError("Hasil poster melebihi 5 MB. Coba pilih gambar dengan resolusi lebih kecil.");
        return;
      }

      setCoverOriginalFile(coverEditorFile);
      updateForm((current) => ({
        ...current,
        coverFile: croppedFile,
        coverNeedsReselect: false,
        removeCover: false,
      }));
      setError("");
      closeCoverEditor();
    } catch (cropError) {
      setCoverEditorError(`Poster gagal dipotong: ${cropError instanceof Error ? cropError.message : "kesalahan browser."}`);
    }
  };

  const insertText = (fieldKey, fieldRef, insertedText) => {
    const field = fieldRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = String(form[fieldKey] || "");
    const nextValue = `${value.slice(0, start)}${insertedText}${value.slice(end)}`;
    updateForm((current) => ({ ...current, [fieldKey]: nextValue }));
    requestAnimationFrame(() => {
      field.focus();
      const cursor = start + insertedText.length;
      field.setSelectionRange(cursor, cursor);
    });
  };

  const formatText = (fieldKey, fieldRef, before, after = before) => {
    const field = fieldRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = String(form[fieldKey] || "");
    const selected = value.slice(start, end);
    const selectedText = selected || "teks";
    const replacement = `${before}${selectedText}${after}`;
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    updateForm((current) => ({ ...current, [fieldKey]: nextValue }));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    });
  };

  const formatList = (fieldKey, fieldRef, ordered = false) => {
    const field = fieldRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = String(form[fieldKey] || "");
    const selected = value.slice(start, end) || "Item daftar";
    const list = selected.split(/\r?\n/).map((line, index) => (
      `${ordered ? `${index + 1}.` : "-"} ${line}`
    )).join("\n");
    const nextValue = `${value.slice(0, start)}${list}${value.slice(end)}`;
    updateForm((current) => ({ ...current, [fieldKey]: nextValue }));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start, start + list.length);
    });
  };

  const renderRichToolbar = (fieldKey, fieldRef) => (
    <div className="competition-rich-tools">
      <div className="competition-rich-toolbar" aria-label="Pemformatan teks">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText(fieldKey, fieldRef, "**")} aria-label="Tebalkan">
          <Bold size={15} />
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText(fieldKey, fieldRef, "*")} aria-label="Miringkan">
          <Italic size={15} />
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText(fieldKey, fieldRef, "[[justify]]", "[[/justify]]")} aria-label="Rata kiri-kanan">
          <AlignJustify size={15} />
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatList(fieldKey, fieldRef)} aria-label="Buat daftar berpoin">
          <List size={15} />
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => formatList(fieldKey, fieldRef, true)} aria-label="Buat daftar bernomor">
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setEmojiPickerField((current) => current === fieldKey ? "" : fieldKey)}
          aria-label="Tambahkan emoji"
          aria-expanded={emojiPickerField === fieldKey}
        >
          <Smile size={15} />
        </button>
      </div>
      {emojiPickerField === fieldKey && (
        <div className="competition-emoji-picker" role="group" aria-label="Pilih emoji">
          {descriptionEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                insertText(fieldKey, fieldRef, `${emoji} `);
                setEmojiPickerField("");
              }}
              aria-label={`Tambahkan ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const submit = async (event) => {
    event.preventDefault();
    const saveAction = saveActionRef.current;
    saveActionRef.current = "submit";
    if (saveAction === "submit" || (saveAction === "archive" && isModerator)) {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setBusy(true);
    setError("");
    const payload = {
      ...form,
      saveAction,
      keywords: [...new Set([...form.keywords, normalizeKeywordTag(form.keywordInput)].filter(Boolean))],
      keywordInput: "",
      targetParticipants: [...form.targetParticipants],
      contactPeople: form.contactPeople.map((person) => ({
        ...person,
        phone: normalizePhoneNumber(person.phone, "+62"),
      })),
      registrationBatches: form.registrationBatches.map((batch) => ({
        ...batch,
        feeAmount: batch.feeType === "Berbayar" && batch.feeAmount
          ? Number(batch.feeAmount.replace(/\D/g, ""))
          : "",
      })),
    };

    try {
      const message = await onSubmit(payload);
      if (message) {
        setError(message);
        return;
      }
      if (persistenceKey) {
        try {
          window.localStorage.removeItem(persistenceKey);
          setStorageNotice("");
        } catch (storageError) {
          setStorageNotice(`Lomba tersimpan, tetapi draft lokal gagal dibersihkan: ${storageError instanceof Error ? storageError.message : "kesalahan penyimpanan."}`);
        }
      }
      onSuccess?.(saveAction);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Lomba gagal disimpan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="competition-form">
      <header className="competition-form-heading">
        <span className="eyebrow">{isModerator ? "PANEL MODERATOR" : isEditing ? "UBAH INFORMASI LOMBA" : "TAMBAHKAN LOMBA"}</span>
        <h2>{isEditing ? "Perbarui informasi lomba" : "Tambahkan lomba"}</h2>
        <p>Informasi yang lengkap membantu peserta memahami peluang dan cara mendaftar.</p>
        {isEditing && initialCompetition.status === "approved" && (
          <p className="competition-form-review-note">Perubahan pada lomba terbit akan dikirim ulang untuk ditinjau moderator.</p>
        )}
      </header>

      <form ref={formRef} onSubmit={submit} className="competition-form-body" noValidate>
        <nav className="competition-form-nav" aria-label="Bagian formulir lomba">
          {formSections.map(({ id, label }, index) => (
            <button
              type="button"
              key={id}
              aria-controls={id}
              aria-current={activeSection === id ? "location" : undefined}
              onClick={() => scrollToSection(id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        {storageNotice && <p className="competition-form-helper" role="status">
          {storageNotice}
          {form.coverNeedsReselect && " Poster yang belum tersimpan perlu dipilih ulang."}
        </p>}

        <section id="competition-section-general" data-form-section className="competition-form-section" aria-labelledby="competition-section-general-heading">
          <div className="competition-form-section-heading">
            <span>01</span>
            <div><h3 id="competition-section-general-heading">Informasi umum</h3><p>Informasi utama, klasifikasi, dan kontak lomba.</p></div>
          </div>
          <div className="competition-form-grid">
            <div className="competition-cover-picker">
              <div className="competition-cover-column">
                <div className="competition-cover-preview" style={{ aspectRatio: coverPreviewAspectRatio }}>
                  {previewUrl || (!form.removeCover && form.coverUrl)
                    ? (
                      <img
                        src={previewUrl || form.coverUrl}
                        alt="Pratinjau poster lomba"
                        onLoad={(event) => {
                          const { naturalWidth, naturalHeight } = event.currentTarget;
                          if (naturalWidth && naturalHeight) setCoverPreviewAspectRatio(`${naturalWidth} / ${naturalHeight}`);
                        }}
                      />
                    )
                    : <Camera size={24} />}
                </div>
                <div className="competition-cover-controls">
                  <label className="button button-outline button-small" htmlFor="competition-cover"><Upload size={15} /> Unggah poster <span className="required-mark">*</span></label>
                  <input id="competition-cover" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectCover} />
                  {(previewUrl || (!form.removeCover && form.coverUrl)) && (
                    <button className="button button-outline button-small" type="button" disabled={loadingCoverForEdit} onClick={editCurrentCover}>
                      <Crop size={15} /> {loadingCoverForEdit ? "Memuat poster..." : "Edit poster"}
                    </button>
                  )}
                  {(previewUrl || (!form.removeCover && form.coverUrl)) && (
                    <button
                      type="button"
                      className="competition-remove-cover"
                      aria-label="Hapus poster lomba"
                      onClick={() => {
                        setCoverOriginalFile(null);
                        setCoverPreviewAspectRatio("9 / 16");
                        updateForm((current) => ({ ...current, coverFile: null, coverNeedsReselect: false, removeCover: true }));
                      }}
                    >
                      <X size={15} />
                    </button>
                  )}
                  <p>Wajib · JPG, PNG, atau WebP · maksimal 5 MB · disarankan rasio 9:16.</p>
                </div>
              </div>
              <div className="competition-cover-fields">
                <label htmlFor="competition-title">Nama lomba <span className="required-mark">*</span>
                  <input id="competition-title" value={form.title} onChange={update("title")} maxLength={160} required />
                </label>
                <div className="competition-rich-editor competition-rich-editor-cover">
                  <label htmlFor="competition-description">Deskripsi Lomba <span className="required-mark">*</span></label>
                  {renderRichToolbar("description", descriptionRef)}
                  <textarea id="competition-description" ref={descriptionRef} rows="6" value={form.description} onChange={update("description")} maxLength={5000} required />
                </div>
              </div>
            </div>
            <fieldset className="competition-organizer-box competition-form-full">
              <legend>Informasi penyelenggara</legend>
              <div className="competition-organizer-grid">
                <label>Nama penyelenggara <span className="required-mark">*</span>
                  <div className="competition-organizer-autocomplete">
                    <input
                      value={form.organizer}
                      onFocus={() => setOrganizerSuggestionsOpen(true)}
                      onBlur={(event) => {
                        if (!event.currentTarget.closest(".competition-organizer-autocomplete")?.contains(event.relatedTarget)) {
                          setOrganizerSuggestionsOpen(false);
                        }
                      }}
                      onChange={(event) => {
                        update("organizer")(event);
                        setOrganizerSuggestionsOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && organizerSuggestionsOpen && organizerSuggestions.length) {
                          event.preventDefault();
                          selectOrganizer(organizerSuggestions[0].name);
                        }
                      }}
                      maxLength={160}
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={organizerSuggestionsOpen}
                      aria-controls="competition-organizer-suggestions"
                      required
                    />
                    {organizerSuggestionsOpen && (organizerSuggestions.length > 0 || showCustomOrganizer) && (
                      <div id="competition-organizer-suggestions" className="competition-autocomplete-list" role="listbox" aria-label="Rekomendasi penyelenggara">
                        {organizerSuggestions.map(({ name, count }) => (
                          <button type="button" role="option" aria-selected="false" key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => selectOrganizer(name)}>
                            <span>{name}</span><small>{count} pengguna</small>
                          </button>
                        ))}
                        {showCustomOrganizer && (
                          <button type="button" className="competition-autocomplete-create" onMouseDown={(event) => event.preventDefault()} onClick={() => selectOrganizer(form.organizer.trim())}>
                            Gunakan nama “{form.organizer.trim()}”
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </label>
                <label>Asal / jenis penyelenggara <span className="required-mark">*</span>
                  <select
                    value={form.organizerLevel}
                    onChange={(event) => {
                      const organizerLevel = event.target.value;
                      const governmentLevels = ["Pemerintah Daerah", "Kementerian Pendidikan Dasar", "Kemdikti"];
                      const organizerType = governmentLevels.includes(organizerLevel)
                        ? "Pemerintah"
                        : organizerLevel === "Perguruan Tinggi / Universitas"
                          ? "Universitas"
                          : organizerLevel === "Komunitas" ? "Komunitas" : "Lembaga umum";
                      updateForm((current) => ({ ...current, organizerLevel, organizerType }));
                    }}
                    required
                  >
                    <option value="">Pilih asal penyelenggara</option>
                    {form.organizerLevel && !organizerLevelOptions.includes(form.organizerLevel)
                      && <option value={form.organizerLevel}>{form.organizerLevel} (data tersimpan)</option>}
                    {organizerLevelOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>
            </fieldset>
            <label>Kategori lomba <span className="required-mark">*</span>
              <select value={form.competitionCategory} onChange={update("competitionCategory")} required>
                <option value="">Pilih kategori</option>
                {competitionCategoryOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <div className="competition-form-field">
              <label htmlFor="competition-type">Tipe lomba <span className="required-mark">*</span></label>
              <input
                id="competition-type"
                value={competitionTypeInputValue}
                onFocus={() => setTypeSuggestionsOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.closest(".competition-form-field")?.contains(event.relatedTarget)) {
                    setTypeSuggestionsOpen(false);
                  }
                }}
                onChange={(event) => {
                  const value = event.target.value;
                  const knownType = competitionTypeOptions.find((type) => (
                    type !== "Lainnya" && type.toLocaleLowerCase("id-ID") === value.trim().toLocaleLowerCase("id-ID")
                  ));
                  updateForm((current) => ({
                    ...current,
                    competitionType: knownType || (value.trim() ? "Lainnya" : ""),
                    customCompetitionType: knownType ? "" : value,
                  }));
                  setTypeSuggestionsOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && typeSuggestionsOpen && typeSuggestions.length) {
                    event.preventDefault();
                    selectCompetitionType(typeSuggestions[0]);
                  }
                }}
                maxLength={80}
                placeholder="Ketik atau pilih tipe lomba"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="competition-type-suggestions"
                required
              />
              <p className="competition-form-helper">Pilih rekomendasi atau ketik tipe lomba lainnya.</p>
              {typeSuggestionsOpen && (typeSuggestions.length > 0 || showCustomType) && (
                <div id="competition-type-suggestions" className="competition-autocomplete-list" role="listbox" aria-label="Rekomendasi tipe lomba">
                  {typeSuggestions.map((type) => (
                    <button type="button" role="option" aria-selected={false} key={type} onMouseDown={(event) => event.preventDefault()} onClick={() => selectCompetitionType(type)}>
                      <span>{type}</span>
                    </button>
                  ))}
                  {showCustomType && (
                    <button type="button" role="option" aria-selected={false} className="competition-autocomplete-create" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCompetitionType(competitionTypeInputValue)}>
                      Gunakan tipe “{competitionTypeInputValue.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="competition-form-field">
              <div className="competition-field-heading">
                <label htmlFor="competition-field">Bidang lomba <span className="required-mark">*</span></label>
              </div>
              <input
                id="competition-field"
                value={fieldInputValue}
                onFocus={() => setFieldSuggestionsOpen(true)}
                onBlur={(event) => {
                  if (!event.currentTarget.closest(".competition-form-field")?.contains(event.relatedTarget)) {
                    setFieldSuggestionsOpen(false);
                  }
                }}
                onChange={(event) => {
                  const value = event.target.value;
                  const builtInField = competitionFieldOptions.find((field) => (
                    field !== "Lainnya" && field.toLocaleLowerCase("id-ID") === value.trim().toLocaleLowerCase("id-ID")
                  ));
                  updateForm((current) => ({
                    ...current,
                    field: builtInField || "Lainnya",
                    customField: builtInField ? "" : value,
                  }));
                  setFieldSuggestionsOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && fieldSuggestionsOpen && fieldSuggestions.length) {
                    event.preventDefault();
                    selectCompetitionField(fieldSuggestions[0].field);
                  }
                }}
                maxLength={80}
                placeholder="Ketik bidang lomba"
                autoComplete="off"
                required
              />
              {fieldSuggestionsOpen && (fieldSuggestions.length > 0 || showCustomField) && (
                <div className="competition-autocomplete-list" role="listbox" aria-label="Rekomendasi bidang lomba">
                  {fieldSuggestions.map(({ field, count }) => (
                    <button type="button" role="option" aria-selected="false" key={field} onMouseDown={(event) => event.preventDefault()} onClick={() => selectCompetitionField(field)}>
                      <span>{field}</span><small>{count} pengguna</small>
                    </button>
                  ))}
                  {showCustomField && (
                    <button type="button" className="competition-autocomplete-create" onMouseDown={(event) => event.preventDefault()} onClick={() => selectCompetitionField(fieldInputValue.trim())}>
                      Gunakan bidang “{fieldInputValue.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>
            <label>Tingkat lomba <span className="required-mark">*</span>
              <select value={form.scope} onChange={updateCompetitionScope} required>
                <option value="">Pilih tingkat</option>
                {form.scope && !scopeOptions.includes(form.scope) && <option value={form.scope}>{form.scope} (data tersimpan)</option>}
                {scopeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Link pendaftaran <span className="required-mark">*</span>
              <input type="url" value={form.registrationUrl} onChange={update("registrationUrl")} placeholder="https://" required />
            </label>
            <section className="competition-contact-people competition-form-full" aria-label="Kontak penyelenggara">
              <div className="competition-repeat-heading">
                <div><strong>Kontak penyelenggara <span className="required-mark">*</span></strong><span>Isi nama dan pilih satu kanal kontak yang ingin digunakan.</span></div>
                <button className="button button-outline button-small" type="button" onClick={addContactPerson}>Tambah kontak</button>
              </div>
              {form.contactPeople.map((person, index) => (
                <fieldset className="competition-contact-person" key={`contact-${index}`}>
                  <legend>
                    Kontak {index + 1}
                    {form.contactPeople.length > 1 && <button type="button" className="competition-repeat-remove" aria-label={`Hapus kontak ${index + 1}`} onClick={() => removeContactPerson(index)}><X size={14} /></button>}
                  </legend>
                  <div className="competition-contact-grid">
                    <label>Nama <span className="required-mark">*</span>
                      <input value={person.name} onChange={(event) => updateContactPerson(index, "name", event.target.value)} maxLength={120} required />
                    </label>
                    <div className="competition-contact-platforms" role="group" aria-label={`Pilih kanal kontak untuk ${person.name || `kontak ${index + 1}`}`}>
                      {contactPlatforms.map(({ id, label, Icon }) => {
                        const active = person.contactMethods.includes(id);
                        return (
                          <button
                            className={`competition-contact-platform-toggle${active ? " is-active" : ""}`}
                            data-platform={id}
                            type="button"
                            aria-pressed={active}
                            key={id}
                            onClick={() => toggleContactMethod(index, id)}
                          >
                            <Icon size={16} aria-hidden="true" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {person.contactMethods.includes("whatsapp") && <label>Nomor WhatsApp <span className="required-mark">*</span>
                      <span className="competition-phone-input">
                        <span aria-hidden="true">+62</span>
                        <input type="tel" inputMode="numeric" value={person.phone} onChange={(event) => updateContactPerson(index, "phone", event.target.value)} maxLength={13} pattern="[2-9][0-9]{6,12}" title="Masukkan nomor Indonesia tanpa +62, misalnya 8123456789" placeholder="8123456789" required />
                      </span>
                    </label>}
                    {person.contactMethods.includes("instagram") && <>
                      <label>Username Instagram <span className="optional-mark">(opsional)</span>
                        <input value={person.instagramUsername} onChange={(event) => updateContactPerson(index, "instagramUsername", event.target.value)} maxLength={30} placeholder="@username" required={!person.instagramUrl} />
                      </label>
                      <label>Link Instagram <span className="optional-mark">(opsional)</span>
                        <input type="url" value={person.instagramUrl} onChange={(event) => updateContactPerson(index, "instagramUrl", event.target.value)} placeholder="https://instagram.com/username" />
                      </label>
                    </>}
                    {person.contactMethods.includes("gmail") && <label>Alamat Gmail <span className="required-mark">*</span>
                      <input type="email" value={person.email} onChange={(event) => updateContactPerson(index, "email", event.target.value)} maxLength={254} placeholder="nama@gmail.com" required />
                    </label>}
                    {person.contactMethods.includes("tiktok") && <>
                      <label>Username TikTok <span className="optional-mark">(opsional)</span>
                        <input value={person.tiktokUsername} onChange={(event) => updateContactPerson(index, "tiktokUsername", event.target.value)} maxLength={30} placeholder="@username" required={!person.tiktokUrl} />
                      </label>
                      <label>Link TikTok <span className="optional-mark">(opsional)</span>
                        <input type="url" value={person.tiktokUrl} onChange={(event) => updateContactPerson(index, "tiktokUrl", event.target.value)} placeholder="https://tiktok.com/@username" />
                      </label>
                    </>}
                    {person.contactMethods.includes("whatsapp") && <label>Link WhatsApp <span className="optional-mark">(opsional)</span>
                      <input type="url" value={person.whatsappUrl} onChange={(event) => updateContactPerson(index, "whatsappUrl", event.target.value)} placeholder="https://wa.me/628123456789" />
                    </label>}
                  </div>
                </fieldset>
              ))}
            </section>
            <div className="competition-form-full competition-keyword-field">
              <label htmlFor="competition-keyword-input">Tag lomba <span className="optional-mark">(opsional)</span></label>
              <div className="competition-keyword-entry">
                {form.keywords.map((tag) => (
                  <span className="competition-keyword-chip" key={tag}>
                    {tag}
                    <button type="button" aria-label={`Hapus tag ${tag}`} onClick={() => updateForm((current) => ({
                      ...current,
                      keywords: current.keywords.filter((keyword) => keyword !== tag),
                    }))}><X size={12} /></button>
                  </span>
                ))}
                <input
                  id="competition-keyword-input"
                  aria-label="Tambah tag lomba"
                  value={form.keywordInput}
                  maxLength={60}
                  onChange={update("keywordInput")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addKeywordTag();
                    } else if (event.key === "Backspace" && !form.keywordInput && form.keywords.length) {
                      updateForm((current) => ({ ...current, keywords: current.keywords.slice(0, -1) }));
                    }
                  }}
                  placeholder="Ketik tag, misalnya pramuka"
                />
              </div>
              <p className="competition-form-helper">Pilih rekomendasi atau ketik tag sendiri, lalu tekan Enter.</p>
              {(keywordSuggestions.length > 0 || showCustomKeyword) && (
                <div className="competition-keyword-suggestions" aria-label="Rekomendasi tag">
                    {keywordSuggestions.map(({ tag, count }) => (
                      <button type="button" key={tag} onMouseDown={(event) => event.preventDefault()} onClick={() => addKeywordTag(tag)}>
                        {tag}<small>{count} pengguna</small>
                      </button>
                  ))}
                  {showCustomKeyword && (
                    <button type="button" className="competition-keyword-create" onMouseDown={(event) => event.preventDefault()} onClick={() => addKeywordTag(form.keywordInput)}>
                      Tambahkan {normalizedKeywordInput}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="competition-section-technical" data-form-section className="competition-form-section" aria-labelledby="competition-section-technical-heading">
          <div className="competition-form-section-heading">
            <span>02</span>
            <div><h3 id="competition-section-technical-heading">Detail teknis kompetisi</h3><p>Peserta, jadwal, biaya, pelaksanaan, dan dokumen pendukung.</p></div>
          </div>
          <div className="competition-technical-box">
          <div className="competition-form-grid">
            <label>Jenis peserta <span className="required-mark">*</span>
              <select value={form.participantType} onChange={(event) => updateForm((current) => ({
                ...current,
                participantType: event.target.value,
                teamMemberRange: event.target.value === "Tim" ? current.teamMemberRange : "",
              }))} required>
                <option value="">Pilih jenis peserta</option>
                {participantTypeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Jumlah anggota tim{form.participantType === "Tim" && <span className="required-mark"> *</span>}
              <input
                value={form.teamMemberRange}
                onChange={update("teamMemberRange")}
                placeholder="Contoh: 5 atau 3-5"
                maxLength={9}
                disabled={form.participantType !== "Tim"}
                required={form.participantType === "Tim"}
              />
            </label>
            <fieldset className="competition-target-fieldset">
              <legend>Target peserta <span className="required-mark">*</span></legend>
              <div className="competition-target-options">
                {targetParticipantOptions.map((option) => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      checked={form.targetParticipants.includes(option)}
                      onChange={(event) => updateForm((current) => ({
                        ...current,
                        targetParticipants: event.target.checked
                          ? [...current.targetParticipants, option]
                          : current.targetParticipants.filter((target) => target !== option),
                      }))}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
            <section className="competition-repeat-section competition-form-full" aria-labelledby="registration-batches-heading">
              <div className="competition-repeat-heading">
                <div><strong id="registration-batches-heading">Batch pendaftaran <span className="required-mark">*</span></strong><span>Atur rentang tanggal dan biaya untuk tiap batch.</span></div>
                <button className="button button-outline button-small" type="button" onClick={addRegistrationBatch}>Tambah batch</button>
              </div>
              {form.registrationBatches.map((batch, index) => (
                <fieldset className="competition-registration-batch" key={`batch-${index}`}>
                  <legend>
                    Batch {index + 1}
                    {form.registrationBatches.length > 1 && <button type="button" className="competition-repeat-remove" aria-label={`Hapus batch ${index + 1}`} onClick={() => removeRegistrationBatch(index)}><X size={14} /></button>}
                  </legend>
                  <div className="competition-form-grid">
                    <label>Tanggal mulai <span className="required-mark">*</span>
                      <input type="date" value={batch.startsAt} onChange={(event) => updateRegistrationBatch(index, "startsAt", event.target.value)} required />
                    </label>
                    <label>Tanggal akhir / deadline <span className="required-mark">*</span>
                      <input type="date" value={batch.endsAt} onChange={(event) => updateRegistrationBatch(index, "endsAt", event.target.value)} min={batch.startsAt || undefined} required />
                    </label>
                    <label>Biaya pendaftaran <span className="required-mark">*</span>
                      <select value={batch.feeType} onChange={(event) => updateForm((current) => ({
                        ...current,
                        registrationBatches: current.registrationBatches.map((item, batchIndex) => (
                          batchIndex === index
                            ? { ...item, feeType: event.target.value, feeAmount: event.target.value === "Berbayar" ? item.feeAmount : "" }
                            : item
                        )),
                      }))}>
                        <option>Gratis</option>
                        <option>Berbayar</option>
                      </select>
                    </label>
                    {batch.feeType === "Berbayar" && <label>Nominal <span className="required-mark">*</span>
                      <span className="competition-currency-input"><span>Rp</span><input inputMode="numeric" value={batch.feeAmount} onChange={(event) => updateRegistrationBatch(index, "feeAmount", formatRupiahInput(event.target.value.slice(0, 20)))} placeholder="350.000" maxLength={20} required /></span>
                    </label>}
                  </div>
                </fieldset>
              ))}
            </section>
            <fieldset className="competition-event-box competition-form-full">
              <legend>Pelaksanaan <span className="optional-mark">(tanggal opsional)</span></legend>
              <div className="competition-form-grid">
                <label>Tanggal mulai pelaksanaan
                  <input type="date" value={form.eventStartDate} onChange={update("eventStartDate")} />
                </label>
                <label>Tanggal selesai pelaksanaan <span className="optional-mark">(opsional)</span>
                  <input type="date" value={form.eventEndDate} onChange={update("eventEndDate")} min={form.eventStartDate || undefined} />
                </label>
                <label>Mode pelaksanaan <span className="required-mark">*</span>
                  <select
                    value={form.mode}
                    onChange={(event) => {
                      const mode = event.target.value;
                      updateForm((current) => ({
                        ...current,
                        mode,
                        location: mode === "Online" && current.location === "Online" ? "" : current.location,
                      }));
                    }}
                    required
                  >
                    <option value="">Pilih mode</option>
                    {competitionModeOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                {form.scope === "Provinsi" && <label>Provinsi <span className="required-mark">*</span>
                  <select value={form.locationProvince} onChange={updateLocationProvince} required>
                    <option value="">Pilih provinsi</option>
                    {form.locationProvince && !provinceOptions.includes(form.locationProvince) && <option value={form.locationProvince}>{form.locationProvince} (data tersimpan)</option>}
                    {provinceOptions.map((province) => <option key={province}>{province}</option>)}
                  </select>
                </label>}
                {(form.scope === "Kabupaten/Kota" || form.scope === "Daerah") && <>
                    <label>Daerah / kabupaten / kota <span className="required-mark">*</span>
                      <input value={form.locationArea} onChange={updateLocationArea} maxLength={120} placeholder="Contoh: Jember" required />
                    </label>
                    <label>Provinsi <span className="required-mark">*</span>
                      <select value={form.locationProvince} onChange={updateLocationProvince} required>
                        <option value="">Pilih provinsi</option>
                        {form.locationProvince && !provinceOptions.includes(form.locationProvince) && <option value={form.locationProvince}>{form.locationProvince} (data tersimpan)</option>}
                        {provinceOptions.map((province) => <option key={province}>{province}</option>)}
                      </select>
                    </label>
                  </>}
                {(form.mode === "Offline" || form.mode === "Hybrid")
                  && form.scope !== "Provinsi" && form.scope !== "Kabupaten/Kota" && form.scope !== "Daerah" && <label>Lokasi <span className="required-mark">*</span>
                    <input value={form.location} onChange={update("location")} maxLength={160} placeholder="Kota atau alamat pelaksanaan" required />
                  </label>}
              </div>
            </fieldset>
            <fieldset className="competition-rich-fieldset competition-form-full">
              <legend>Persyaratan lomba <span className="optional-mark">(opsional)</span></legend>
              {renderRichToolbar("requirements", requirementsRef)}
              <textarea aria-label="Persyaratan lomba" ref={requirementsRef} rows="4" value={form.requirements} onChange={update("requirements")} maxLength={3000} />
            </fieldset>
            <fieldset className="competition-rich-fieldset competition-form-full">
              <legend>Hadiah / penghargaan <span className="optional-mark">(opsional)</span></legend>
              {renderRichToolbar("prize", prizeRef)}
              <textarea aria-label="Hadiah / penghargaan" ref={prizeRef} rows="4" value={form.prize} onChange={update("prize")} maxLength={1000} placeholder="Contoh: uang pembinaan, medali, sertifikat" />
            </fieldset>
            <label className="competition-form-full">Link Panduan / Juknis <span className="optional-mark">(opsional)</span>
              <input type="url" value={form.guidebookUrl} onChange={(event) => updateForm((current) => ({
                ...current,
                guidebookUrl: event.target.value,
                guidebookPath: event.target.value === current.guidebookUrl ? current.guidebookPath : "",
              }))} placeholder="https://" />
            </label>
          </div>
          </div>
        </section>

        {error && <p className="form-error competition-form-error" role="alert">{error}</p>}
        <div className="competition-form-actions">
          <button className="button button-quiet" type="button" onClick={onCancel}>Batal</button>
          <div className="competition-form-utility-actions">
            {canSaveAsDraft && <button className="button button-outline button-small" type="button" disabled={busy} onClick={() => submitWithAction("draft")}><Save size={15} /> Simpan draft</button>}
            {canArchiveFromForm && <button className="button button-outline button-small" type="button" disabled={busy} onClick={() => submitWithAction("archive")}><Archive size={15} /> Simpan ke arsip</button>}
          </div>
          <button ref={submitButtonRef} className="button button-primary" type="submit" disabled={busy}>
            {busy
              ? "Menyimpan..."
              : isModerator
                ? isEditing ? "Simpan perubahan" : "Terbitkan lomba"
                : isEditing && initialCompetition.status !== "draft"
                  ? "Kirim untuk ditinjau ulang"
                  : "Kirim untuk ditinjau"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </div>
        {coverEditorOpen && coverEditorUrl && (
          <div
            className="competition-cover-editor-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) closeCoverEditor();
            }}
          >
            <section className="competition-cover-editor" role="dialog" aria-modal="true" aria-labelledby="competition-cover-editor-title">
              <header className="competition-cover-editor-header">
                <div>
                  <h2 id="competition-cover-editor-title">Edit poster lomba</h2>
                  <p>Geser gambar untuk mengatur potongan, lalu sesuaikan zoom.</p>
                </div>
                <button className="competition-cover-editor-close" type="button" aria-label="Tutup editor poster" onClick={closeCoverEditor}>
                  <X size={18} />
                </button>
              </header>
              <div className="competition-cover-editor-body">
                <div
                  className="competition-cover-crop-stage"
                  style={{ aspectRatio: `${selectedCoverCropRatio.width} / ${selectedCoverCropRatio.height}` }}
                >
                  <img
                    ref={coverEditorImageRef}
                    className="competition-cover-editor-source"
                    src={coverEditorUrl}
                    alt=""
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget;
                      if (naturalWidth && naturalHeight) {
                        setCoverOriginalCropRatio({ label: "Asli", width: naturalWidth, height: naturalHeight });
                      }
                      setCoverEditorImageLoaded(true);
                    }}
                    onError={() => setCoverEditorError("Gambar tidak dapat dibaca. Coba pilih file gambar lain.")}
                  />
                  <canvas
                    ref={coverCropCanvasRef}
                    className="competition-cover-crop-canvas"
                    width={coverCropWidth}
                    height={coverCropCanvasHeight}
                    role="img"
                    aria-label="Pratinjau potongan poster. Geser gambar untuk mengatur area."
                    onPointerDown={handleCoverCropPointerDown}
                    onPointerMove={handleCoverCropPointerMove}
                    onPointerUp={endCoverCropDrag}
                    onPointerCancel={endCoverCropDrag}
                  />
                </div>
                <div className="competition-cover-editor-controls">
                  <fieldset className="competition-cover-ratio-picker">
                    <legend>Ukuran poster</legend>
                    <div>
                      {availableCoverCropRatios.map((ratio) => (
                        <button
                          key={ratio.label}
                          type="button"
                          aria-pressed={coverCropRatioLabel === ratio.label}
                          onClick={() => changeCoverCropRatio(ratio)}
                          disabled={!coverEditorImageLoaded}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label htmlFor="competition-cover-zoom">
                    <span><ZoomIn size={16} /> Zoom gambar</span>
                    <strong>{Math.round(coverEditorZoom * 100)}%</strong>
                  </label>
                  <input
                    id="competition-cover-zoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={coverEditorZoom}
                    onChange={changeCoverZoom}
                    disabled={!coverEditorImageLoaded}
                  />
                  <button className="button button-outline button-small" type="button" onClick={resetCoverCrop} disabled={!coverEditorImageLoaded}>
                    <RotateCcw size={14} /> Atur ulang
                  </button>
                  <p>Gunakan mouse atau sentuh lalu geser untuk memilih area poster.</p>
                  {coverEditorError && <p className="competition-cover-editor-error" role="alert">{coverEditorError}</p>}
                </div>
              </div>
              <footer className="competition-cover-editor-actions">
                <button className="button button-quiet" type="button" onClick={closeCoverEditor}>Batal</button>
                <button className="button button-primary" type="button" onClick={saveCoverCrop} disabled={!coverEditorImageLoaded}>
                  <Crop size={15} /> Simpan potongan
                </button>
              </footer>
            </section>
          </div>
        )}
      </form>
    </div>
  );
}
