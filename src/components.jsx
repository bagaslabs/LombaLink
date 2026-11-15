import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  GraduationCap,
  Globe2,
  ExternalLink,
  FileText,
  Flag,
  MapPin,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { formatDate, organizerOptions, scopeOptions, targetParticipantOptions } from "./data.js";
import { reportReasons } from "./reporting.js";

export function Brand({ onClick }) {
  return (
    <button className="brand" type="button" data-guest-access onClick={onClick} aria-label="LombaLink, beranda">
      <span className="brand-mark"><Trophy size={18} strokeWidth={2.5} /></span>
      <span>Lomba<span className="brand-link">Link</span></span>
    </button>
  );
}

export function SiteFooter({ navigate, account }) {
  return (
    <footer className="site-footer content-width">
      <Brand onClick={() => {
        if (window.location.pathname === "/" && !window.location.search) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          navigate("/");
        }
      }} />
      <span>© 2026 LombaLink. Tumbuh bersama kesempatan.</span>
      {!account && <div>
        <button data-guest-access onClick={() => navigate("/login")}>Masuk</button>
        <button data-guest-access onClick={() => navigate("/register")}>Bergabung</button>
      </div>}
    </footer>
  );
}

export function ThemeToggle({ theme, onToggleTheme }) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
      type="button"
      data-guest-access
      aria-label={`Aktifkan tema ${nextTheme}`}
      title={`Aktifkan tema ${nextTheme}`}
      onClick={onToggleTheme}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function getNearestRegistrationBatch(item) {
  const batches = Array.isArray(item.registrationBatches) ? item.registrationBatches : [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return batches
    .filter((batch) => typeof batch.endsAt === "string" && batch.endsAt >= today)
    .sort((first, second) => (first.startsAt || first.endsAt).localeCompare(second.startsAt || second.endsAt))[0] || null;
}

export function CompetitionCard({ item, onDetails }) {
  const nearestBatch = getNearestRegistrationBatch(item);
  const batchDates = nearestBatch
    ? `${formatDate(nearestBatch.startsAt)}${nearestBatch.endsAt !== nearestBatch.startsAt ? ` - ${formatDate(nearestBatch.endsAt)}` : ""}`
    : `Tutup ${formatDate(item.deadline)}`;
  const registrationDate = nearestBatch?.label
    ? `${nearestBatch.label} · ${batchDates}`
    : batchDates;

  return (
    <article className="competition-card">
      <div className={`card-art ${item.color || "blue"}${item.coverUrl ? " has-cover" : ""}`}>
        {item.coverUrl && <img className="card-cover-image" src={item.coverUrl} alt="" />}
        {!item.coverUrl && <span className="card-art-icon"><Trophy size={25} /></span>}
      </div>
      <div className="card-content">
        <h3>{item.title}</h3>
        <div className="competition-card-info">
          <div className="competition-card-registration">
            <CalendarDays size={14} />
            <span><small>Pendaftaran terdekat</small><strong>{registrationDate}</strong></span>
          </div>
          {(item.audience || item.education) && (
            <div className="competition-card-audience">
              <small>Untuk siapa</small>
              <strong>{item.audience || item.education}</strong>
            </div>
          )}
        </div>
        {item.tagline && <p className="competition-card-tagline">{item.tagline}</p>}
        <div className="card-bottom">
          <button className="competition-card-details-button" type="button" onClick={() => onDetails(item)}>
            Detail selengkapnya <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function renderDescriptionInline(value, keyPrefix) {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function CompetitionDescription({ value }) {
  const content = [];
  let listItems = [];
  let listType = "";
  const flushList = () => {
    if (!listItems.length) return;
    const ListTag = listType === "ordered" ? "ol" : "ul";
    content.push(<ListTag key={`list-${content.length}`}>{listItems}</ListTag>);
    listItems = [];
    listType = "";
  };

  String(value || "").split(/\r?\n/).forEach((line, index) => {
    const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    const listItem = unorderedItem || orderedItem;
    if (listItem) {
      const nextListType = orderedItem ? "ordered" : "unordered";
      if (listItems.length && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(<li key={`item-${index}`}>{renderDescriptionInline(listItem[1], `inline-${index}`)}</li>);
      return;
    }
    flushList();
    if (line.trim()) {
      content.push(<p key={`paragraph-${index}`}>{renderDescriptionInline(line, `inline-${index}`)}</p>);
    }
  });
  flushList();
  return <div className="competition-description-content">{content}</div>;
}

export function CompetitionDetails({ item, onClose, onTrackEvent, onReport, isLoggedIn, onRequireLogin, moderationActions }) {
  const [trackingError, setTrackingError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0].value);
  const [reportDescription, setReportDescription] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportNotice, setReportNotice] = useState("");

  useEffect(() => {
    setTrackingError("");
    if (!item || !onTrackEvent) return undefined;

    let active = true;
    onTrackEvent(item.id, "view").then((message) => {
      if (active && message) setTrackingError(message);
    });
    return () => { active = false; };
  }, [item?.id, onTrackEvent]);

  useEffect(() => {
    setReportOpen(false);
    setReportReason(reportReasons[0].value);
    setReportDescription("");
    setReportError("");
    setReportNotice("");
  }, [item?.id]);

  if (!item) return null;
  const fees = Array.isArray(item.feeTiers) ? item.feeTiers : [];
  const batches = Array.isArray(item.registrationBatches) ? item.registrationBatches : [];
  const contacts = Array.isArray(item.contactPeople) && item.contactPeople.length
    ? item.contactPeople
    : item.contactPersonName || item.contactPersonPhone || item.contactPersonEmail || item.contact
      ? [{
        name: item.contactPersonName || "",
        phone: item.contactPersonPhone || item.contact || "",
        email: item.contactPersonEmail || "",
        instagramUsername: "",
        instagramUrl: "",
      }]
      : [];
  const targetParticipants = Array.isArray(item.targetParticipants) && item.targetParticipants.length
    ? item.targetParticipants.join(", ")
    : item.audience || item.education;
  const trackRegistration = () => {
    if (!onTrackEvent) return;
    onTrackEvent(item.id, "registration_click").then((message) => {
      if (message) setTrackingError(message);
    });
  };
  const submitReport = async (event) => {
    event.preventDefault();
    setReportBusy(true);
    setReportError("");
    try {
      const message = await onReport({
        competitionId: item.id,
        reason: reportReason,
        description: reportDescription.trim(),
      });
      if (message) {
        setReportError(message);
        return;
      }
      setReportOpen(false);
      setReportDescription("");
      setReportNotice("Laporan terkirim. Terima kasih sudah membantu menjaga informasi LombaLink.");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Laporan gagal dikirim.");
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="competition-detail-content">
        {onClose && <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>}
        <span className="eyebrow"><Trophy size={14} /> INFORMASI LOMBA</span>
        {item.coverUrl && <img className="competition-detail-cover" src={item.coverUrl} alt={`Gambar ${item.title}`} />}
        <h2 id="detail-title">{item.title}</h2>
        <p className="detail-organizer"><Building2 size={16} /> {item.organizer}</p>
        {item.description && <div className="competition-detail-description"><CompetitionDescription value={item.description} /></div>}
        <div className="detail-grid">
          {item.competitionCategory && <div><span>Kategori</span><strong>{item.competitionCategory}</strong></div>}
          {item.category && <div><span>Bidang</span><strong>{item.category}</strong></div>}
          {item.participantType && <div><span>Jenis peserta</span><strong>{item.participantType}{item.participantType === "Tim" && item.teamMinMembers && item.teamMaxMembers ? ` · ${item.teamMinMembers}–${item.teamMaxMembers} anggota` : ""}</strong></div>}
          {targetParticipants && <div><span>Target peserta</span><strong>{targetParticipants}</strong></div>}
          <div><span>Cakupan</span><strong>{item.scope}</strong></div>
          <div><span>Mode</span><strong>{item.mode}</strong></div>
          <div><span>Lokasi</span><strong>{item.location}</strong></div>
          <div><span>Batas pendaftaran</span><strong>{formatDate(item.deadline)}</strong></div>
          {item.eventStartDate && <div><span>Pelaksanaan</span><strong>{formatDate(item.eventStartDate)}{item.eventEndDate && ` - ${formatDate(item.eventEndDate)}`}</strong></div>}
        </div>
        {batches.length > 0 && <section className="competition-detail-section"><h3>Batch pendaftaran</h3><ul>{batches.map((batch, index) => {
          const legacyFee = fees[index];
          const feeType = batch.feeType || (legacyFee ? "Berbayar" : item.feeType);
          const feeAmount = batch.feeType ? batch.feeAmount : legacyFee?.amount ?? item.feeAmount;
          return <li key={`${batch.label}-${index}`}><div><strong>{batch.label || `Batch ${index + 1}`}</strong><span>{formatDate(batch.startsAt)} – {formatDate(batch.endsAt)}</span></div><strong>{feeType === "Berbayar" && feeAmount != null && feeAmount !== "" ? `Rp ${Number(feeAmount).toLocaleString("id-ID")}` : feeType === "Gratis" ? "Gratis" : "Biaya belum ditentukan"}</strong></li>;
        })}</ul></section>}
        {batches.length === 0 && (item.feeType || fees.length > 0) && <section className="competition-detail-section"><h3>Biaya pendaftaran</h3>
          {item.feeType === "Berbayar" && item.feeAmount != null && item.feeAmount !== ""
            ? <p>Rp {Number(item.feeAmount).toLocaleString("id-ID")}</p>
            : item.feeType === "Gratis"
              ? <p>Gratis</p>
              : fees.length > 0
                ? <ul>{fees.map((fee, index) => <li key={`${fee.label}-${index}`}><strong>{fee.label}</strong><span>Rp {Number(fee.amount).toLocaleString("id-ID")}</span></li>)}</ul>
                : <p>Nominal belum ditentukan</p>}
        </section>}
        {item.requirements && <section className="competition-detail-section"><h3>Persyaratan</h3><CompetitionDescription value={item.requirements} /></section>}
        {item.prize && item.prize !== "Informasi hadiah belum ditambahkan" && <section className="competition-detail-section"><h3>Hadiah</h3><CompetitionDescription value={item.prize} /></section>}
        {item.keywords?.length > 0 && <div className="competition-detail-keywords">{item.keywords.map((keyword) => <span className="soft-tag" key={keyword}>{keyword}</span>)}</div>}
        {contacts.length > 0 && <section className="competition-detail-section"><h3>Kontak penyelenggara</h3><div className="competition-detail-contacts">{contacts.map((contact, index) => <div className="competition-detail-contact" key={`${contact.name || "kontak"}-${index}`}>
          {contact.name && <strong>{contact.name}</strong>}
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact.instagramUsername && <span>Instagram: @{contact.instagramUsername.replace(/^@+/, "")}</span>}
          {contact.instagramUrl && <a href={contact.instagramUrl} target="_blank" rel="noreferrer">Buka Instagram</a>}
        </div>)}</div></section>}
        <div className="competition-detail-links">
          {item.informationUrl && <a className="button button-outline" href={item.informationUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Info lomba</a>}
          {item.rulebookUrl && <a className="button button-outline" href={item.rulebookUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Panduan / Juknis</a>}
        </div>
        <p className="detail-note">Pastikan kamu memeriksa informasi dan persyaratan resmi dari penyelenggara sebelum mendaftar.</p>
        {trackingError && <p className="form-error" role="status">{trackingError}</p>}
        {onReport && !moderationActions && <section className="competition-report-section">
          {!reportNotice && (!isLoggedIn
            ? <button className="button button-outline" type="button" onClick={onRequireLogin}><Flag size={15} /> Masuk untuk melaporkan</button>
            : <button className="competition-report-toggle" type="button" aria-expanded={reportOpen} onClick={() => { setReportOpen((current) => !current); setReportError(""); }}><Flag size={15} /> Laporkan informasi ini</button>)}
          {reportNotice && <p className="report-success" role="status">{reportNotice}</p>}
          {reportOpen && <form className="competition-report-form" onSubmit={submitReport}>
            <label>Alasan laporan
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} required>
                {reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
            <label>Jelaskan masalahnya
              <textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="Tuliskan detail agar moderator dapat memeriksanya." required />
            </label>
            {reportError && <p className="form-error" role="alert">{reportError}</p>}
            <div className="competition-report-actions">
              <button className="button button-outline" type="button" onClick={() => setReportOpen(false)} disabled={reportBusy}>Batal</button>
              <button className="button button-primary" type="submit" disabled={reportBusy}>{reportBusy ? "Mengirim..." : "Kirim laporan"}</button>
            </div>
            <small>Satu laporan aktif per akun untuk setiap lomba.</small>
          </form>}
        </section>}
        {moderationActions && item.status === "pending"
          ? <div className="competition-moderation-actions">
            <button className="button button-outline" type="button" disabled={moderationActions.busy} onClick={moderationActions.onReject}>Tolak</button>
            <button className="button button-primary" type="button" disabled={moderationActions.busy} onClick={moderationActions.onApprove}>Setujui & terbitkan</button>
          </div>
          : item.registrationUrl
            ? <a className="button button-primary button-wide" href={item.registrationUrl} target="_blank" rel="noreferrer" onClick={trackRegistration}>Daftar lomba <ExternalLink size={15} /></a>
            : onClose && <button className="button button-primary button-wide" onClick={onClose}>Mengerti <Check size={16} /></button>}
    </div>
  );
}

export function CompetitionModal({ item, onClose, ...detailsProps }) {
  if (!item) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card detail-modal competition-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <CompetitionDetails item={item} onClose={onClose} {...detailsProps} />
      </section>
    </div>
  );
}

export function SearchPanel({ filters, setFilters, onSearch, onRequireAccount, isLoggedIn, categoryOptions }) {
  const update = (key) => (event) => {
    const value = event.target.value;
    if (!isLoggedIn && value) {
      onRequireAccount(false, true);
      return;
    }
    setFilters({ ...filters, [key]: value });
  };
  const search = () => {
    if (!isLoggedIn) {
      onRequireAccount(false, true);
      return;
    }
    onSearch();
  };

  return (
    <div className="search-panel">
      <div className="search-main-row">
        <label className="search-keyword">
          <Search size={20} />
          <span className="sr-only">Kata kunci lomba</span>
          <input value={filters.keyword} onChange={update("keyword")} placeholder="Cari nama lomba, bidang, atau penyelenggara..." onKeyDown={(event) => event.key === "Enter" && search()} />
        </label>
        <button className="button button-primary search-button" onClick={search}><Search size={17} /> Cari lomba</button>
      </div>
      <div className="filter-row">
        <label className="filter-select"><GraduationCap size={16} /><span className="sr-only">Target peserta</span>
          <select value={filters.education} onChange={update("education")}><option value="">Semua target peserta</option>{targetParticipantOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
        </label>
        <label className="filter-select"><Trophy size={15} /><span className="sr-only">Kategori lomba</span>
          <select value={filters.category} onChange={update("category")}><option value="">Semua kategori</option>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
        </label>
        <label className="filter-select"><Globe2 size={15} /><span className="sr-only">Cakupan lomba</span>
          <select value={filters.scope} onChange={update("scope")}><option value="">Semua cakupan</option><option value="Daerah">Daerah (data lama)</option>{scopeOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
        </label>
        <label className="filter-select"><Building2 size={15} /><span className="sr-only">Jenis penyelenggara</span>
          <select value={filters.organizerType} onChange={update("organizerType")}><option value="">Semua penyelenggara</option>{organizerOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
        </label>
        <label className="filter-select location-filter"><MapPin size={15} /><span className="sr-only">Daerah atau provinsi</span>
          <input value={filters.location} onChange={update("location")} placeholder="Daerah / provinsi" />
        </label>
      </div>
      <div className="search-hint">
        <span><SlidersHorizontal size={13} /> Atur filter untuk menemukan lomba yang cocok</span>
      </div>
    </div>
  );
}

export function AccountPrompt({ onClose, navigate, encourageShare, required }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => !required && event.target === event.currentTarget && onClose()}>
      <section className="modal-card prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-title">
        {!required && <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>}
        <span className="prompt-icon"><Sparkles size={23} /></span>
        <span className="eyebrow">{required ? "AKSES ANGGOTA" : encourageShare ? "BERBAGI PELUANG" : "LANJUTKAN PERJALANANMU"}</span>
        <h2 id="prompt-title">{required ? "Daftar untuk mencari lomba" : encourageShare ? "Punya akun LombaLink?" : "Pencarian gratis sudah habis"}</h2>
        <p>{required ? "Buat akun gratis untuk menggunakan pencarian dan filter lomba." : encourageShare ? "Masuk atau daftar sebagai anggota untuk menambahkan lomba dan membantu komunitas." : "Buat akun gratis untuk mencari lomba tanpa batas dan menyimpan kesempatan favoritmu."}</p>
        <button className="button button-primary button-wide" onClick={() => navigate("/register")}>{required ? "Daftar gratis" : encourageShare ? "Daftar untuk berbagi" : "Buat akun gratis"} <ArrowRight size={16} /></button>
        <button className="prompt-login" onClick={() => navigate("/login")}>Sudah punya akun? <strong>Masuk</strong></button>
      </section>
    </div>
  );
}
