import React, { useEffect, useRef, useState } from "react";
import { Archive, ArrowRight, Bold, Camera, Italic, List, Save, Upload, X } from "lucide-react";
import {
  competitionCategoryOptions,
  competitionFieldOptions,
  competitionModeOptions,
  participantTypeOptions,
  scopeOptions,
  targetParticipantOptions,
} from "./data.js";

const popularKeywordTags = ["#pramuka", "#olimpiade", "#esai", "#sains", "#teknologi", "#seni", "#debat", "#pelajar", "#gratis"];
const formSections = [
  { id: "competition-section-general", label: "Umum" },
  { id: "competition-section-technical", label: "Spesifik" },
];

function normalizeKeywordTag(value) {
  const tag = String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .toLocaleLowerCase("id-ID");
  return tag ? `#${tag}` : "";
}

function toForm(competition) {
  const legacyTargets = {
    SMP: ["SMP / MTs"],
    SMA: ["SMA / SMK / MA"],
    Kuliah: ["Mahasiswa"],
    Umum: ["Umum"],
  };
  const feeTiers = Array.isArray(competition?.feeTiers) ? competition.feeTiers : [];
  const firstBatch = competition?.registrationBatches?.[0];
  return {
    title: competition?.title || "",
    tagline: competition?.tagline || "",
    description: competition?.description || "",
    competitionCategory: competition?.competitionCategory || "",
    field: competition?.category || "",
    keywords: Array.isArray(competition?.keywords)
      ? [...new Set(competition.keywords.map(normalizeKeywordTag).filter(Boolean))]
      : [],
    keywordInput: "",
    scope: competition?.scope || "",
    participantType: competition?.participantType || "",
    targetParticipants: Array.isArray(competition?.targetParticipants) && competition.targetParticipants.length
      ? competition.targetParticipants
      : legacyTargets[competition?.education] || [],
    mode: competition?.mode || "",
    location: competition?.location || "",
    organizer: competition?.organizer || "",
    organizerType: competition?.organizerType || "",
    organizerLevel: competition?.organizerLevel || "",
    contact: competition?.contact || competition?.contactPersonPhone || "",
    contactPersonName: competition?.contactPersonName || "",
    contactPersonEmail: competition?.contactPersonEmail || "",
    legacyCompetitionType: competition?.competitionType || "",
    feeType: competition?.feeType || (feeTiers.length ? "Berbayar" : "Gratis"),
    feeAmount: competition?.feeAmount || (feeTiers[0]?.amount != null ? String(feeTiers[0].amount) : ""),
    legacyRegistrationBatches: Array.isArray(competition?.registrationBatches) ? competition.registrationBatches : [],
    legacyRegistrationOpensAt: firstBatch?.startsAt || "",
    legacyRegistrationDeadline: competition?.deadline || firstBatch?.endsAt || "",
    registrationOpensAt: firstBatch?.startsAt || "",
    registrationDeadline: competition?.deadline || firstBatch?.endsAt || "",
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
    guidebookFile: null,
    guidebookNeedsReselect: false,
    removeGuidebook: false,
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
    const savedBatches = Array.isArray(savedForm.registrationBatches) ? savedForm.registrationBatches : [];
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
    const legacyDeadline = savedBatches.reduce(
      (latest, batch) => batch.endsAt > latest ? batch.endsAt : latest,
      "",
    );

    return {
      form: {
        ...initialForm,
        ...savedForm,
        competitionCategory: savedForm.competitionCategory ?? "",
        field: savedForm.field ?? savedForm.category ?? "",
        participantType: savedForm.participantType ?? "",
        targetParticipants,
        contact: savedForm.contact ?? savedForm.contactPersonPhone ?? "",
        feeType: savedForm.feeType ?? (savedFeeTiers.length ? "Berbayar" : "Gratis"),
        feeAmount: savedForm.feeAmount ?? (savedFeeTiers[0]?.amount != null ? String(savedFeeTiers[0].amount) : ""),
        legacyRegistrationBatches: savedForm.legacyRegistrationBatches ?? savedBatches,
        legacyRegistrationOpensAt: savedForm.legacyRegistrationOpensAt ?? savedBatches[0]?.startsAt ?? "",
        legacyRegistrationDeadline: savedForm.legacyRegistrationDeadline ?? legacyDeadline,
        registrationOpensAt: savedForm.registrationOpensAt ?? savedBatches[0]?.startsAt ?? "",
        registrationDeadline: savedForm.registrationDeadline ?? legacyDeadline,
        keywords: [...new Set(savedKeywords.map(normalizeKeywordTag).filter(Boolean))],
        coverFile: null,
        coverNeedsReselect: Boolean(savedForm.coverNeedsReselect),
        guidebookFile: null,
        guidebookNeedsReselect: Boolean(savedForm.guidebookNeedsReselect),
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
  const formRef = useRef(null);
  const descriptionRef = useRef(null);
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
        const { coverFile, guidebookFile, ...savedForm } = formStateRef.current;
        window.localStorage.setItem(persistenceKey, JSON.stringify({
          ...savedForm,
          coverNeedsReselect: Boolean(coverFile) || savedForm.coverNeedsReselect,
          guidebookNeedsReselect: Boolean(guidebookFile) || savedForm.guidebookNeedsReselect,
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
      || !form.competitionCategory || !form.field || !form.scope || !form.registrationUrl.trim()
      || !form.contact.trim()) {
      return "Lengkapi nama, deskripsi, penyelenggara, kategori, bidang, tingkat, link pendaftaran, dan kontak.";
    }
    if (!form.participantType || !form.targetParticipants.length || !form.mode) {
      return "Pilih jenis peserta, minimal satu target peserta, dan mode pelaksanaan.";
    }
    if (form.mode !== "Online" && !form.location.trim()) {
      return "Lokasi wajib diisi untuk lomba Offline atau Hybrid.";
    }
    if (!form.registrationOpensAt || !form.registrationDeadline) {
      return "Tanggal pembukaan dan deadline pendaftaran wajib diisi.";
    }
    if (form.registrationDeadline < form.registrationOpensAt) {
      return "Deadline pendaftaran tidak boleh sebelum tanggal pembukaan.";
    }
    if (!isValidUrl(form.registrationUrl)) {
      return "Link pendaftaran harus diawali http:// atau https://.";
    }
    if (form.feeType === "Berbayar" && (
      form.feeAmount === "" || !Number.isFinite(Number(form.feeAmount)) || Number(form.feeAmount) < 0
    )) {
      return "Isi nominal biaya pendaftaran dengan angka nol atau lebih.";
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

  const selectGuidebook = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Panduan lomba harus berupa file PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file panduan maksimal 5 MB.");
      return;
    }
    setError("");
    updateForm((current) => ({
      ...current,
      guidebookFile: file,
      guidebookNeedsReselect: false,
      removeGuidebook: false,
    }));
  };

  const formatDescription = (before, after = before) => {
    const field = descriptionRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = form.description.slice(start, end);
    const nextDescription = `${form.description.slice(0, start)}${before}${selected || "teks"}${after}${form.description.slice(end)}`;
    updateForm((current) => ({ ...current, description: nextDescription }));
    requestAnimationFrame(() => {
      field.focus();
      const selectionStart = start + before.length;
      field.setSelectionRange(selectionStart, selectionStart + (selected || "teks").length);
    });
  };

  const formatDescriptionList = () => {
    const field = descriptionRef.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = form.description.slice(start, end) || "Item daftar";
    const list = selected.split("\n").map((line) => `- ${line}`).join("\n");
    const nextDescription = `${form.description.slice(0, start)}${list}${form.description.slice(end)}`;
    updateForm((current) => ({ ...current, description: nextDescription }));
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start, start + list.length);
    });
  };

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
      feeAmount: form.feeType === "Berbayar" ? Number(form.feeAmount) : "",
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
          {(form.coverNeedsReselect || form.guidebookNeedsReselect) && " File yang belum tersimpan perlu dipilih ulang."}
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
                <label htmlFor="competition-tagline">Deskripsi singkat / tagline <span className="optional-mark">(opsional)</span>
                  <input id="competition-tagline" value={form.tagline} onChange={update("tagline")} maxLength={180} placeholder="Kalimat singkat yang menggambarkan lomba" />
                </label>
              </div>
            </div>
            <label className="competition-form-full">Nama penyelenggara <span className="required-mark">*</span>
              <input value={form.organizer} onChange={update("organizer")} maxLength={160} required />
            </label>
            <div className="competition-rich-editor competition-form-full">
              <label htmlFor="competition-description">Deskripsi lomba <span className="required-mark">*</span></label>
              <div className="competition-rich-toolbar" aria-label="Format deskripsi">
                <button type="button" aria-label="Tebalkan teks terpilih" title="Tebal" onClick={() => formatDescription("**")}><Bold size={15} /></button>
                <button type="button" aria-label="Miringkan teks terpilih" title="Miring" onClick={() => formatDescription("*")}><Italic size={15} /></button>
                <button type="button" aria-label="Buat daftar" title="Daftar" onClick={formatDescriptionList}><List size={15} /></button>
                <span>Pilih teks lalu gunakan format. Baris baru dan daftar akan ditampilkan di detail lomba.</span>
              </div>
              <textarea id="competition-description" ref={descriptionRef} rows="6" value={form.description} onChange={update("description")} maxLength={5000} required />
            </div>
            <label>Kategori lomba <span className="required-mark">*</span>
              <select value={form.competitionCategory} onChange={update("competitionCategory")} required>
                <option value="">Pilih kategori</option>
                {competitionCategoryOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Bidang lomba <span className="required-mark">*</span>
              <select value={form.field} onChange={update("field")} required>
                <option value="">Pilih bidang</option>
                {form.field && !competitionFieldOptions.includes(form.field) && <option value={form.field}>{form.field} (data tersimpan)</option>}
                {competitionFieldOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
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
            <label>Kontak penyelenggara / WhatsApp <span className="required-mark">*</span>
              <input value={form.contact} onChange={update("contact")} maxLength={160} placeholder="Nomor WhatsApp atau kontak yang bisa dihubungi" required />
            </label>
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
          <div className="competition-form-grid">
            <label>Jenis peserta <span className="required-mark">*</span>
              <select value={form.participantType} onChange={update("participantType")} required>
                <option value="">Pilih jenis peserta</option>
                {participantTypeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
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
            <label>Biaya pendaftaran <span className="required-mark">*</span>
              <select value={form.feeType} onChange={update("feeType")} required>
                <option value="">Pilih biaya</option>
                <option>Gratis</option>
                <option>Berbayar</option>
              </select>
            </label>
            {form.feeType === "Berbayar" && <label>Nominal biaya (Rp) <span className="required-mark">*</span>
              <input type="number" min="0" step="1000" value={form.feeAmount} onChange={update("feeAmount")} placeholder="Contoh: 50000" required />
            </label>}
            <label>Tanggal pembukaan pendaftaran <span className="required-mark">*</span>
              <input type="date" value={form.registrationOpensAt} onChange={update("registrationOpensAt")} required />
            </label>
            <label>Deadline pendaftaran <span className="required-mark">*</span>
              <input type="date" value={form.registrationDeadline} onChange={update("registrationDeadline")} min={form.registrationOpensAt || undefined} required />
            </label>
            <label>Tanggal pelaksanaan <span className="optional-mark">(opsional)</span>
              <input type="date" value={form.eventStartDate} onChange={update("eventStartDate")} />
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
            <label>Persyaratan lomba <span className="optional-mark">(opsional)</span>
              <textarea rows="4" value={form.requirements} onChange={update("requirements")} maxLength={3000} />
            </label>
            <label>Hadiah / penghargaan <span className="optional-mark">(opsional)</span>
              <textarea rows="4" value={form.prize} onChange={update("prize")} maxLength={1000} placeholder="Contoh: uang pembinaan, medali, sertifikat" />
            </label>
            <div className="competition-guidebook-field competition-form-full">
              <label htmlFor="competition-guidebook">Panduan lomba / Juknis <span className="optional-mark">(opsional)</span></label>
              <div className="competition-guidebook-controls">
                <label className="button button-outline button-small" htmlFor="competition-guidebook"><Upload size={15} /> Unggah PDF</label>
                <input id="competition-guidebook" className="sr-only" type="file" accept="application/pdf,.pdf" onChange={selectGuidebook} />
                {(form.guidebookFile || (!form.removeGuidebook && form.guidebookUrl)) && (
                  <>
                    <span>{form.guidebookFile?.name || "Panduan tersimpan"}</span>
                    <button
                      type="button"
                      className="competition-remove-cover"
                      aria-label="Hapus panduan lomba"
                      onClick={() => updateForm((current) => ({
                        ...current,
                        guidebookFile: null,
                        guidebookNeedsReselect: false,
                        removeGuidebook: true,
                      }))}
                    ><X size={15} /></button>
                  </>
                )}
              </div>
              <p className="competition-form-helper">Format PDF, maksimal 5 MB.</p>
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
