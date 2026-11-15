import React, { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  Bold,
  Camera,
  Italic,
  List,
  ListOrdered,
  Save,
  Smile,
  Upload,
  X,
} from "lucide-react";
import {
  competitionCategoryOptions,
  competitionFieldOptions,
  competitionModeOptions,
  normalizePhoneNumber,
  organizerLevelOptions,
  participantTypeOptions,
  scopeOptions,
  targetParticipantOptions,
} from "./data.js";

const popularKeywordTags = ["#pramuka", "#olimpiade", "#esai", "#sains", "#teknologi", "#seni", "#debat", "#pelajar", "#gratis"];
const formSections = [
  { id: "competition-section-general", label: "Umum" },
  { id: "competition-section-technical", label: "Spesifik" },
];
const descriptionEmojis = ["🎉", "🏆", "📅", "✨", "📢", "🎁", "✅", "📍"];

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
  return {
    name: person.name || "",
    phone: phone.slice(0, 13),
    email: person.email || "",
    instagramUsername: person.instagramUsername || "",
    instagramUrl: person.instagramUrl || "",
  };
}

function getTeamMemberRange(minimum, maximum) {
  return minimum != null && minimum !== "" && maximum != null && maximum !== ""
    ? `${minimum}-${maximum}`
    : "";
}

function parseTeamMemberRange(value) {
  const match = String(value || "").match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
  if (!match) return null;
  return { minimum: Number(match[1]), maximum: Number(match[2]) };
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
    location: competition?.location || "",
    organizer: competition?.organizer || "",
    organizerType: competition?.organizerType || "",
    organizerLevel: competition?.organizerLevel || "",
    contactPeople,
    teamMemberRange: competition?.teamMemberRange || getTeamMemberRange(competition?.teamMinMembers, competition?.teamMaxMembers),
    legacyCompetitionType: competition?.competitionType || "",
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
  const [activeSection, setActiveSection] = useState(formSections[0].id);
  const [emojiPickerField, setEmojiPickerField] = useState("");
  const formRef = useRef(null);
  const descriptionRef = useRef(null);
  const requirementsRef = useRef(null);
  const prizeRef = useRef(null);
  const formStateRef = useRef(form);
  const submitButtonRef = useRef(null);
  const saveActionRef = useRef("submit");
  const isModerator = mode === "moderator";
  const isEditing = Boolean(initialCompetition?.id);
  const canSaveAsDraft = !isModerator && (!isEditing || initialCompetition.status === "draft");
  const canArchiveFromForm = !isEditing || initialCompetition.status === "draft";
  const normalizedKeywordInput = normalizeKeywordTag(form.keywordInput);
  const keywordSuggestions = [...new Set([...suggestedKeywords.map(normalizeKeywordTag), ...popularKeywordTags])]
    .filter((tag) => tag && !form.keywords.includes(tag))
    .filter((tag) => !normalizedKeywordInput || tag.includes(normalizedKeywordInput.slice(1)))
    .slice(0, 7);
  const showCustomKeyword = normalizedKeywordInput
    && !form.keywords.includes(normalizedKeywordInput)
    && !keywordSuggestions.includes(normalizedKeywordInput);

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

  const validateForm = () => {
    if (!form.title.trim() || !form.description.trim() || !form.organizer.trim()
      || !form.organizerLevel || !form.competitionCategory || !form.field
      || (form.field === "Lainnya" && !form.customField.trim())
      || !form.scope || !form.registrationUrl.trim()
      || !form.contactPeople.length) {
      return "Lengkapi nama, deskripsi, penyelenggara, kategori, bidang, tingkat, link pendaftaran, dan kontak.";
    }
    if (!form.contactPeople.every((person) => person.name.trim() && isValidIndonesianPhone(person.phone))) {
      return "Setiap kontak wajib memiliki nama dan nomor telepon yang valid.";
    }
    if (form.contactPeople.some((person) => (
      (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
      || (person.instagramUrl && !isValidUrl(person.instagramUrl))
    ))) {
      return "Periksa kembali format email dan tautan Instagram.";
    }
    if (!form.participantType || !form.targetParticipants.length || !form.mode) {
      return "Pilih jenis peserta, minimal satu target peserta, dan mode pelaksanaan.";
    }
    if (form.participantType === "Tim" && (
      !parseTeamMemberRange(form.teamMemberRange)
      || parseTeamMemberRange(form.teamMemberRange).minimum < 1
      || parseTeamMemberRange(form.teamMemberRange).maximum < parseTeamMemberRange(form.teamMemberRange).minimum
    )) {
      return "Isi rentang jumlah anggota tim dengan benar, contoh 3-5.";
    }
    if (form.mode !== "Online" && !form.location.trim()) {
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
    updateForm((current) => ({ ...current, coverFile: file, coverNeedsReselect: false, removeCover: false }));
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
                <div className="competition-cover-preview">
                  {previewUrl || (!form.removeCover && form.coverUrl)
                    ? <img src={previewUrl || form.coverUrl} alt="Pratinjau poster lomba" />
                    : <Camera size={24} />}
                </div>
                <div className="competition-cover-controls">
                  <label className="button button-outline button-small" htmlFor="competition-cover"><Upload size={15} /> Unggah poster <span className="required-mark">*</span></label>
                  <input id="competition-cover" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectCover} />
                  {(previewUrl || (!form.removeCover && form.coverUrl)) && (
                    <button
                      type="button"
                      className="competition-remove-cover"
                      aria-label="Hapus poster lomba"
                      onClick={() => updateForm((current) => ({ ...current, coverFile: null, coverNeedsReselect: false, removeCover: true }))}
                    >
                      <X size={15} />
                    </button>
                  )}
                  <p>Wajib · JPG, PNG, atau WebP · maksimal 5 MB · disarankan poster A4 vertikal.</p>
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
                  <input value={form.organizer} onChange={update("organizer")} maxLength={160} required />
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
              <div className="competition-field-heading">
                <label htmlFor="competition-field">{form.field === "Lainnya" ? "Bidang lomba lainnya" : "Bidang lomba"} <span className="required-mark">*</span></label>
                {form.field === "Lainnya" && <button
                  className="button button-outline button-small"
                  type="button"
                  onClick={() => updateForm((current) => ({ ...current, field: "", customField: "" }))}
                >
                  <List size={14} /> Pilih dari daftar
                </button>}
              </div>
              {form.field === "Lainnya" ? (
                <input
                  id="competition-field"
                  value={form.customField}
                  onChange={update("customField")}
                  maxLength={80}
                  placeholder="Ketik bidang lomba lainnya"
                  required
                />
              ) : (
                <select
                  id="competition-field"
                  value={form.field}
                  onChange={(event) => updateForm((current) => ({
                    ...current,
                    field: event.target.value,
                    customField: event.target.value === "Lainnya" ? current.customField : "",
                  }))}
                  required
                >
                  <option value="">Pilih bidang</option>
                  {competitionFieldOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              )}
            </div>
            <label>Tingkat lomba <span className="required-mark">*</span>
              <select value={form.scope} onChange={update("scope")} required>
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
                <div><strong>Kontak penyelenggara <span className="required-mark">*</span></strong><span>Isi nama dan nomor telepon untuk setiap kontak.</span></div>
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
                    <label>Nomor telepon / WhatsApp <span className="required-mark">*</span>
                      <span className="competition-phone-input">
                        <span aria-hidden="true">+62</span>
                        <input type="tel" inputMode="numeric" value={person.phone} onChange={(event) => updateContactPerson(index, "phone", event.target.value)} maxLength={13} pattern="[2-9][0-9]{6,12}" title="Masukkan nomor Indonesia tanpa +62, misalnya 8123456789" placeholder="8123456789" required />
                      </span>
                    </label>
                    <label>Instagram username <span className="optional-mark">(opsional)</span>
                      <input value={person.instagramUsername} onChange={(event) => updateContactPerson(index, "instagramUsername", event.target.value)} maxLength={30} placeholder="@username" />
                    </label>
                    <label>Link Instagram <span className="optional-mark">(opsional)</span>
                      <input type="url" value={person.instagramUrl} onChange={(event) => updateContactPerson(index, "instagramUrl", event.target.value)} placeholder="https://instagram.com/username" />
                    </label>
                    <label>Email / Gmail <span className="optional-mark">(opsional)</span>
                      <input type="email" value={person.email} onChange={(event) => updateContactPerson(index, "email", event.target.value)} maxLength={254} placeholder="nama@gmail.com" />
                    </label>
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
                  {keywordSuggestions.map((tag) => (
                    <button type="button" key={tag} onMouseDown={(event) => event.preventDefault()} onClick={() => addKeywordTag(tag)}>{tag}</button>
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
            <label>Rentang jumlah anggota{form.participantType === "Tim" && <span className="required-mark"> *</span>}
              <input
                value={form.teamMemberRange}
                onChange={update("teamMemberRange")}
                placeholder="Contoh: 3-5"
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
                {(form.mode === "Offline" || form.mode === "Hybrid") && <label>Lokasi <span className="required-mark">*</span>
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
            {busy ? "Menyimpan..." : isModerator ? "Terbitkan lomba" : isEditing && initialCompetition.status !== "draft" ? "Kirim perubahan" : "Kirim untuk ditinjau"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </div>
      </form>
    </div>
  );
}
