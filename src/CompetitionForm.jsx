import React, { useEffect, useRef, useState } from "react";
import { Archive, ArrowRight, Camera, Plus, Save, Trash2, Upload, X } from "lucide-react";
import {
  competitionModeOptions,
  competitionTypeOptions,
  educationOptions,
  organizerLevelOptions,
  organizerOptions,
  scopeOptions,
} from "./data.js";

const emptyBatch = () => ({ label: "", startsAt: "", endsAt: "" });
const emptyFeeTier = () => ({ label: "", amount: "" });
const popularKeywordTags = ["#pramuka", "#olimpiade", "#esai", "#sains", "#teknologi", "#seni", "#debat", "#pelajar", "#gratis"];
const formSections = [
  { id: "competition-section-information", label: "Informasi Lomba" },
  { id: "competition-section-schedule", label: "Jadwal & Biaya" },
  { id: "competition-section-organizer", label: "Penyelenggara" },
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
  return {
    title: competition?.title || "",
    tagline: competition?.tagline || "",
    description: competition?.description || "",
    audience: competition?.audience || "",
    education: competition?.education || "",
    category: competition?.category || "",
    keywords: Array.isArray(competition?.keywords)
      ? [...new Set(competition.keywords.map(normalizeKeywordTag).filter(Boolean))]
      : [],
    keywordInput: "",
    scope: competition?.scope || "",
    competitionType: competition?.competitionType || "",
    mode: competition?.mode || "",
    location: competition?.location || "",
    organizer: competition?.organizer || "",
    organizerType: competition?.organizerType || "",
    organizerLevel: competition?.organizerLevel || "",
    contactPersonName: competition?.contactPersonName || "",
    contactPersonEmail: competition?.contactPersonEmail || "",
    contactPersonPhone: competition?.contactPersonPhone || "",
    feeTiers: competition?.feeTiers?.length ? competition.feeTiers : [],
    prize: competition?.prize === "Informasi hadiah belum ditambahkan" ? "" : competition?.prize || "",
    registrationBatches: competition?.registrationBatches?.length
      ? competition.registrationBatches
      : [{ label: "Pendaftaran", startsAt: "", endsAt: competition?.deadline || "" }],
    eventStartDate: competition?.eventStartDate || "",
    eventEndDate: competition?.eventEndDate || "",
    registrationUrl: competition?.registrationUrl || "",
    informationUrl: competition?.informationUrl || "",
    rulebookUrl: competition?.rulebookUrl || "",
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

    return {
      form: {
        ...initialForm,
        ...savedForm,
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

  const updateRow = (key, index, field, value) => {
    updateForm((current) => ({
      ...current,
      [key]: current[key].map((item, rowIndex) => rowIndex === index ? { ...item, [field]: value } : item),
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
    if (!form.title.trim() || !form.description.trim() || !form.audience.trim()
      || !form.education || !form.scope || !form.category.trim()
      || !form.competitionType || !form.mode
      || (form.mode !== "Online" && !form.location.trim())) {
      return "Lengkapi nama, deskripsi, bidang, peserta, cakupan, tipe, mode, dan lokasi lomba.";
    }

    if (!form.registrationBatches.length) return "Tambahkan minimal satu batch pendaftaran.";
    if (form.registrationBatches.some((batch) => (
      !batch.label.trim() || !batch.startsAt || !batch.endsAt || batch.endsAt < batch.startsAt
    ))) {
      return "Lengkapi nama dan rentang tanggal setiap batch pendaftaran.";
    }
    if (form.feeTiers.some((fee) => (
      !fee.label.trim() || fee.amount === "" || !Number.isFinite(Number(fee.amount)) || Number(fee.amount) < 0
    ))) {
      return "Isi kategori dan biaya dengan benar, atau hapus baris biaya yang kosong.";
    }
    if (form.eventStartDate && form.eventEndDate && form.eventEndDate < form.eventStartDate) {
      return "Tanggal akhir pelaksanaan tidak boleh sebelum tanggal mulai.";
    }
    if (![form.registrationUrl, form.informationUrl, form.rulebookUrl].every(isValidUrl)) {
      return "Gunakan tautan yang diawali http:// atau https://.";
    }
    if (!form.organizer.trim() || !form.organizerType || !form.organizerLevel || !form.contactPersonName.trim()) {
      return "Lengkapi nama, jenis, tingkat penyelenggara, dan contact person.";
    }
    if (!form.contactPersonEmail.trim() && !form.contactPersonPhone.trim()) {
      return "Isi minimal email atau nomor telepon contact person.";
    }
    if (form.contactPersonEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactPersonEmail.trim())) {
      return "Format email contact person belum valid.";
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
      if (!isValidUrl(form.registrationUrl) || !isValidUrl(form.informationUrl) || !isValidUrl(form.rulebookUrl)) {
        setError("Gunakan tautan yang diawali http:// atau https://.");
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
      feeTiers: form.feeTiers
        .filter((fee) => fee.label.trim() && fee.amount !== "")
        .map((fee) => ({ label: fee.label.trim(), amount: Number(fee.amount) })),
      registrationBatches: form.registrationBatches.map((batch) => ({
        label: batch.label.trim(),
        startsAt: batch.startsAt,
        endsAt: batch.endsAt,
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
        {storageNotice && <p className="competition-form-helper" role="status">{storageNotice}{form.coverNeedsReselect && " Gambar yang belum tersimpan perlu dipilih ulang."}</p>}

        <section id="competition-section-information" data-form-section className="competition-form-section" aria-labelledby="competition-section-information-heading">
          <div className="competition-form-section-heading">
            <span>01</span>
            <div><h3 id="competition-section-information-heading">Informasi lomba</h3><p>Kenalkan lomba dan siapa saja yang bisa mengikuti.</p></div>
          </div>
          <div className="competition-form-grid">
            <div className="competition-cover-picker">
              <div className="competition-cover-preview">
                {previewUrl || (!form.removeCover && form.coverUrl)
                  ? <img src={previewUrl || form.coverUrl} alt="Pratinjau gambar lomba" />
                  : <Camera size={24} />}
              </div>
              <div>
                <label className="button button-outline button-small" htmlFor="competition-cover"><Upload size={15} /> Tambahkan gambar</label>
                <input id="competition-cover" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectCover} />
                <p>Poster vertikal rasio 2:3 · contoh 1080 × 1620 px · JPG, PNG, atau WebP · maksimal 5 MB · opsional</p>
              </div>
              {(previewUrl || (!form.removeCover && form.coverUrl)) && (
                <button
                  type="button"
                  className="competition-remove-cover"
                  aria-label="Hapus gambar lomba"
                  onClick={() => updateForm((current) => ({ ...current, coverFile: null, coverNeedsReselect: false, removeCover: true }))}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <label className="competition-form-full">Nama lomba <span className="required-mark">*</span>
              <input value={form.title} onChange={update("title")} maxLength={160} required />
            </label>
            <label className="competition-form-full">Tagline <span className="optional-mark">(opsional)</span>
              <input value={form.tagline} onChange={update("tagline")} maxLength={180} placeholder="Kalimat singkat yang menggambarkan lomba" />
            </label>
            <label className="competition-form-full">Deskripsi <span className="required-mark">*</span>
              <textarea rows="5" value={form.description} onChange={update("description")} maxLength={5000} required />
            </label>
            <label>Bidang lomba <span className="required-mark">*</span>
              <input value={form.category} onChange={update("category")} maxLength={80} placeholder="Contoh: Sains, teknologi, seni" required />
            </label>
            <label>Tipe lomba <span className="required-mark">*</span>
              <select value={form.competitionType} onChange={update("competitionType")} required>
                <option value="">Pilih tipe lomba</option>
                {competitionTypeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
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
            <label>Untuk siapa <span className="required-mark">*</span>
              <textarea rows="3" value={form.audience} onChange={update("audience")} maxLength={500} placeholder="Contoh: siswa SMA/SMK sederajat" required />
            </label>
            <label>Jenjang <span className="required-mark">*</span>
              <select value={form.education} onChange={update("education")} required>
                <option value="">Pilih jenjang</option>
                {educationOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Tingkat lomba <span className="required-mark">*</span>
              <select value={form.scope} onChange={update("scope")} required>
                <option value="">Pilih tingkat</option>
                {scopeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Mode lomba <span className="required-mark">*</span>
              <select value={form.mode} onChange={update("mode")} required>
                <option value="">Pilih mode</option>
                {competitionModeOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            {form.mode !== "Online" && <label>Lokasi <span className="required-mark">*</span>
              <input value={form.location} onChange={update("location")} maxLength={160} placeholder="Kota atau alamat pelaksanaan" required />
            </label>}
          </div>
        </section>

        <section id="competition-section-schedule" data-form-section className="competition-form-section" aria-labelledby="competition-section-schedule-heading">
          <div className="competition-form-section-heading">
            <span>02</span>
            <div><h3 id="competition-section-schedule-heading">Jadwal & biaya</h3><p>Atur pendaftaran, biaya, pelaksanaan, dan tautan informasi.</p></div>
          </div>
          <div className="competition-form-grid">
            <div className="competition-repeat-section competition-form-full">
              <div className="competition-repeat-heading">
                <div><strong>Batch pendaftaran <span className="required-mark">*</span></strong><span>Wajib minimal satu batch; batas akhir lomba mengikuti batch terakhir.</span></div>
                <button className="button button-outline button-small" type="button" onClick={() => updateForm((current) => ({ ...current, registrationBatches: [...current.registrationBatches, emptyBatch()] }))}><Plus size={14} /> Tambah batch</button>
              </div>
              {form.registrationBatches.map((batch, index) => (
                <div className="competition-repeat-row" key={`batch-${index}`}>
                  <label>Nama batch <span className="required-mark">*</span><input value={batch.label} onChange={(event) => updateRow("registrationBatches", index, "label", event.target.value)} placeholder={`Batch ${index + 1}`} required /></label>
                  <label>Mulai <span className="required-mark">*</span><input type="date" value={batch.startsAt} onChange={(event) => updateRow("registrationBatches", index, "startsAt", event.target.value)} required /></label>
                  <label>Akhir <span className="required-mark">*</span><input type="date" value={batch.endsAt} onChange={(event) => updateRow("registrationBatches", index, "endsAt", event.target.value)} required /></label>
                  {form.registrationBatches.length > 1 && <button className="competition-repeat-remove" type="button" aria-label={`Hapus batch ${index + 1}`} onClick={() => updateForm((current) => ({ ...current, registrationBatches: current.registrationBatches.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} /></button>}
                </div>
              ))}
            </div>
            <div className="competition-repeat-section competition-form-full">
              <div className="competition-repeat-heading">
                <div><strong>Biaya pendaftaran</strong><span>Opsional; bisa dibedakan per kategori peserta atau batch.</span></div>
                <button className="button button-outline button-small" type="button" onClick={() => updateForm((current) => ({ ...current, feeTiers: [...current.feeTiers, emptyFeeTier()] }))}><Plus size={14} /> Tambah biaya</button>
              </div>
              {form.feeTiers.length ? form.feeTiers.map((fee, index) => (
                <div className="competition-repeat-row fee-row" key={`fee-${index}`}>
                  <label>Kategori / keterangan <input value={fee.label} onChange={(event) => updateRow("feeTiers", index, "label", event.target.value)} placeholder="Contoh: Kategori A" /></label>
                  <label>Biaya (Rp) <input type="number" min="0" step="1000" value={fee.amount} onChange={(event) => updateRow("feeTiers", index, "amount", event.target.value)} placeholder="0" /></label>
                  <button className="competition-repeat-remove" type="button" aria-label={`Hapus biaya ${index + 1}`} onClick={() => updateForm((current) => ({ ...current, feeTiers: current.feeTiers.filter((_, rowIndex) => rowIndex !== index) }))}><Trash2 size={15} /></button>
                </div>
              )) : <p className="competition-form-muted">Belum ada biaya. Peserta akan menganggap pendaftaran gratis jika informasi ini kosong.</p>}
            </div>
            <label>Tanggal pelaksanaan mulai <span className="optional-mark">(opsional)</span>
              <input type="date" value={form.eventStartDate} onChange={update("eventStartDate")} />
            </label>
            <label>Tanggal pelaksanaan akhir <span className="optional-mark">(opsional)</span>
              <input type="date" value={form.eventEndDate} onChange={update("eventEndDate")} min={form.eventStartDate || undefined} />
            </label>
            <label>Link pendaftaran <span className="optional-mark">(opsional)</span>
              <input type="url" value={form.registrationUrl} onChange={update("registrationUrl")} placeholder="https://" />
            </label>
            <label>Link info lebih lanjut <span className="optional-mark">(opsional)</span>
              <input type="url" value={form.informationUrl} onChange={update("informationUrl")} placeholder="https://" />
            </label>
            <label className="competition-form-full">Guidebook / juknis / rulebook <span className="optional-mark">(opsional)</span>
              <input type="url" value={form.rulebookUrl} onChange={update("rulebookUrl")} placeholder="https://" />
            </label>
          </div>
        </section>

        <section id="competition-section-organizer" data-form-section className="competition-form-section" aria-labelledby="competition-section-organizer-heading">
          <div className="competition-form-section-heading">
            <span>03</span>
            <div><h3 id="competition-section-organizer-heading">Penyelenggara</h3><p>Lengkapi identitas dan kontak penyelenggara serta benefit peserta.</p></div>
          </div>
          <div className="competition-form-grid">
            <label>Nama penyelenggara <span className="required-mark">*</span>
              <input value={form.organizer} onChange={update("organizer")} maxLength={160} required />
            </label>
            <label>Jenis penyelenggara <span className="required-mark">*</span>
              <select value={form.organizerType} onChange={update("organizerType")} required>
                <option value="">Pilih jenis penyelenggara</option>
                {organizerOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Tingkat penyelenggara <span className="required-mark">*</span>
              <select value={form.organizerLevel} onChange={update("organizerLevel")} required>
                <option value="">Pilih tingkat penyelenggara</option>
                {organizerLevelOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>Contact person <span className="required-mark">*</span>
              <input value={form.contactPersonName} onChange={update("contactPersonName")} maxLength={120} required />
            </label>
            <label>Email contact person <span className="optional-mark">(opsional)</span>
              <input type="email" value={form.contactPersonEmail} onChange={update("contactPersonEmail")} maxLength={160} />
            </label>
            <label>Telepon / WhatsApp <span className="optional-mark">(opsional)</span>
              <input type="tel" value={form.contactPersonPhone} onChange={update("contactPersonPhone")} maxLength={40} />
            </label>
            <p className="competition-form-helper competition-form-full">Wajib isi minimal satu kontak: email atau nomor telepon / WhatsApp.</p>
            <label className="competition-form-full">Hadiah <span className="optional-mark">(opsional)</span>
              <textarea rows="3" value={form.prize} onChange={update("prize")} maxLength={1000} placeholder="Contoh: uang pembinaan, medali, sertifikat" />
            </label>
            <label className="competition-form-full">Benefit peserta <span className="optional-mark">(opsional)</span>
              <textarea rows="3" value={form.benefits} onChange={update("benefits")} maxLength={1000} placeholder="Contoh: sertifikat, mentoring, publikasi karya" />
            </label>
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
