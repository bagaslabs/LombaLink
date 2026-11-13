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
  MapPin,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { educationOptions, formatDate, organizerOptions, scopeOptions } from "./data.js";

export function Brand({ onClick }) {
  return (
    <button className="brand" type="button" data-guest-access onClick={onClick} aria-label="LombaLink, beranda">
      <span className="brand-mark"><Trophy size={18} strokeWidth={2.5} /></span>
      <span>Lomba<span className="brand-link">Link</span></span>
    </button>
  );
}

export function SiteFooter({ navigate }) {
  return (
    <footer className="site-footer content-width">
      <Brand onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      <span>© 2026 LombaLink. Tumbuh bersama kesempatan.</span>
      <div>
        <button data-guest-access onClick={() => navigate("/login")}>Masuk</button>
        <button data-guest-access onClick={() => navigate("/register")}>Bergabung</button>
      </div>
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

export function CompetitionCard({ item, onDetails }) {
  return (
    <article className="competition-card">
      <div className={`card-art ${item.color || "blue"}`}>
        {item.coverUrl && <img className="card-cover-image" src={item.coverUrl} alt="" />}
        <span className="card-category">{item.category}</span>
        <span className="card-art-icon"><Trophy size={25} /></span>
        {item.scope === "Internasional" && <span className="international-tag"><Globe2 size={12} /> Internasional</span>}
      </div>
      <div className="card-content">
        <div className="organizer-line"><Building2 size={14} /> {item.organizer}</div>
        <h3>{item.title}</h3>
        {item.tagline && <p className="competition-card-tagline">{item.tagline}</p>}
        <div className="tag-row">
          <span className="soft-tag">{item.education}</span>
          <span className="soft-tag">{item.scope}</span>
          <span className="soft-tag">{item.mode || "Terbuka"}</span>
        </div>
        <div className="card-meta">
          <span><MapPin size={14} /> {item.location}</span>
          <span><CalendarDays size={14} /> Tutup {formatDate(item.deadline)}</span>
        </div>
        <div className="card-bottom">
          <span className="prize-label"><Sparkles size={14} /> {item.prize}</span>
          <button className="round-arrow" aria-label={`Lihat ${item.title}`} onClick={() => onDetails(item)}><ArrowRight size={17} /></button>
        </div>
      </div>
    </article>
  );
}

export function CompetitionModal({ item, onClose, onTrackEvent, moderationActions }) {
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    setTrackingError("");
    if (!item || !onTrackEvent) return undefined;

    let active = true;
    onTrackEvent(item.id, "view").then((message) => {
      if (active && message) setTrackingError(message);
    });
    return () => { active = false; };
  }, [item?.id, onTrackEvent]);

  if (!item) return null;
  const fees = Array.isArray(item.feeTiers) ? item.feeTiers : [];
  const batches = Array.isArray(item.registrationBatches) ? item.registrationBatches : [];
  const trackRegistration = () => {
    if (!onTrackEvent) return;
    onTrackEvent(item.id, "registration_click").then((message) => {
      if (message) setTrackingError(message);
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card detail-modal competition-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
        <span className="eyebrow"><Trophy size={14} /> INFORMASI LOMBA</span>
        {item.coverUrl && <img className="competition-detail-cover" src={item.coverUrl} alt={`Gambar ${item.title}`} />}
        <h2 id="detail-title">{item.title}</h2>
        {item.tagline && <p className="competition-detail-tagline">{item.tagline}</p>}
        <p className="detail-organizer"><Building2 size={16} /> {item.organizer}</p>
        {item.description && <p className="competition-detail-description">{item.description}</p>}
        <div className="detail-grid">
          <div><span>Jenjang</span><strong>{item.education}</strong></div>
          {item.audience && <div><span>Peserta</span><strong>{item.audience}</strong></div>}
          <div><span>Cakupan</span><strong>{item.scope}</strong></div>
          <div><span>Lokasi</span><strong>{item.location}</strong></div>
          <div><span>Batas pendaftaran</span><strong>{formatDate(item.deadline)}</strong></div>
          <div><span>Kategori</span><strong>{item.category}</strong></div>
          {item.competitionType && <div><span>Tipe lomba</span><strong>{item.competitionType}</strong></div>}
          {item.organizerLevel && <div><span>Tingkat penyelenggara</span><strong>{item.organizerLevel}</strong></div>}
          {item.eventStartDate && <div><span>Pelaksanaan</span><strong>{formatDate(item.eventStartDate)}{item.eventEndDate && ` - ${formatDate(item.eventEndDate)}`}</strong></div>}
        </div>
        {batches.length > 0 && <section className="competition-detail-section"><h3>Jadwal pendaftaran</h3><ul>{batches.map((batch, index) => <li key={`${batch.label}-${index}`}><strong>{batch.label}</strong><span>{formatDate(batch.startsAt)} – {formatDate(batch.endsAt)}</span></li>)}</ul></section>}
        {fees.length > 0 && <section className="competition-detail-section"><h3>Biaya pendaftaran</h3><ul>{fees.map((fee, index) => <li key={`${fee.label}-${index}`}><strong>{fee.label}</strong><span>Rp {Number(fee.amount).toLocaleString("id-ID")}</span></li>)}</ul></section>}
        {item.prize && item.prize !== "Informasi hadiah belum ditambahkan" && <section className="competition-detail-section"><h3>Hadiah</h3><p>{item.prize}</p></section>}
        {item.benefits && <section className="competition-detail-section"><h3>Benefit peserta</h3><p>{item.benefits}</p></section>}
        {item.keywords?.length > 0 && <div className="competition-detail-keywords">{item.keywords.map((keyword) => <span className="soft-tag" key={keyword}>{keyword}</span>)}</div>}
        {(item.contactPersonName || item.contactPersonEmail || item.contactPersonPhone) && <section className="competition-detail-section"><h3>Contact person</h3><p>{item.contactPersonName}</p>{item.contactPersonEmail && <a href={`mailto:${item.contactPersonEmail}`}>{item.contactPersonEmail}</a>}{item.contactPersonPhone && <a href={`tel:${item.contactPersonPhone}`}>{item.contactPersonPhone}</a>}</section>}
        <div className="competition-detail-links">
          {item.informationUrl && <a className="button button-outline" href={item.informationUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Info lomba</a>}
          {item.rulebookUrl && <a className="button button-outline" href={item.rulebookUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Guidebook</a>}
        </div>
        <p className="detail-note">Pastikan kamu memeriksa informasi dan persyaratan resmi dari penyelenggara sebelum mendaftar.</p>
        {trackingError && <p className="form-error" role="status">{trackingError}</p>}
        {moderationActions && item.status === "pending"
          ? <div className="competition-moderation-actions">
            <button className="button button-outline" type="button" disabled={moderationActions.busy} onClick={moderationActions.onReject}>Tolak</button>
            <button className="button button-primary" type="button" disabled={moderationActions.busy} onClick={moderationActions.onApprove}>Setujui & terbitkan</button>
          </div>
          : item.registrationUrl
            ? <a className="button button-primary button-wide" href={item.registrationUrl} target="_blank" rel="noreferrer" onClick={trackRegistration}>Daftar lomba <ExternalLink size={15} /></a>
            : <button className="button button-primary button-wide" onClick={onClose}>Mengerti <Check size={16} /></button>}
      </section>
    </div>
  );
}

export function SearchPanel({ filters, setFilters, onSearch, isLoggedIn, categoryOptions }) {
  const update = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });
  return (
    <div className="search-panel">
      <div className="search-main-row">
        <label className="search-keyword">
          <Search size={20} />
          <span className="sr-only">Kata kunci lomba</span>
          <input value={filters.keyword} onChange={update("keyword")} placeholder="Cari nama lomba, bidang, atau penyelenggara..." onKeyDown={(event) => event.key === "Enter" && onSearch()} />
        </label>
        <button className="button button-primary search-button" onClick={onSearch}><Search size={17} /> Cari lomba</button>
      </div>
      <div className="filter-row">
        <label className="filter-select"><GraduationCap size={16} /><span className="sr-only">Jenjang pendidikan</span>
          <select value={filters.education} onChange={update("education")}><option value="">Semua jenjang</option>{educationOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
        </label>
        <label className="filter-select"><Trophy size={15} /><span className="sr-only">Kategori lomba</span>
          <select value={filters.category} onChange={update("category")}><option value="">Semua kategori</option>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
        </label>
        <label className="filter-select"><Globe2 size={15} /><span className="sr-only">Cakupan lomba</span>
          <select value={filters.scope} onChange={update("scope")}><option value="">Semua cakupan</option>{scopeOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={14} />
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
        {!isLoggedIn && <span className="search-quota">Masuk untuk mencari lomba</span>}
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
        <h2 id="prompt-title">{required ? "Masuk untuk mencari lomba" : encourageShare ? "Punya akun LombaLink?" : "Pencarian gratis sudah habis"}</h2>
        <p>{required ? "Masuk atau daftar gratis untuk menggunakan pencarian dan menjelajahi informasi lomba." : encourageShare ? "Masuk atau daftar sebagai anggota untuk menambahkan lomba dan membantu komunitas." : "Buat akun gratis untuk mencari lomba tanpa batas dan menyimpan kesempatan favoritmu."}</p>
        <button className="button button-primary button-wide" onClick={() => navigate(required ? "/login" : "/register")}>{required ? "Masuk dengan Google" : encourageShare ? "Daftar untuk berbagi" : "Buat akun gratis"} <ArrowRight size={16} /></button>
        <button className="prompt-login" onClick={() => navigate(required ? "/register" : "/login")}>{required ? "Belum punya akun?" : "Sudah punya akun?"} <strong>{required ? "Daftar gratis" : "Masuk"}</strong></button>
      </section>
    </div>
  );
}
