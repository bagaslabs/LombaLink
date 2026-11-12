import React, { useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  GraduationCap,
  Globe2,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { educationOptions, formatDate, organizerOptions, scopeOptions } from "./data.js";

export function Brand({ onClick }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="LombaLink, beranda">
      <span className="brand-mark"><Trophy size={18} strokeWidth={2.5} /></span>
      <span>Lomba<span className="brand-link">Link</span></span>
    </button>
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

export function Header({ account, navigate, onSubmit, onLogout, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("");

  const scrollToSection = (event, id) => {
    event.preventDefault();
    setActiveNav(id);
    navigate("/");
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }));
    setMenuOpen(false);
  };
  const goToPage = (path) => {
    setActiveNav(path);
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand onClick={() => navigate("/")} />
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi utama">
          <a href="/#cari" className={activeNav === "cari" ? "is-active" : ""} onClick={(event) => scrollToSection(event, "cari")}>Cari Lomba</a>
          <a href="/#rekomendasi" className={activeNav === "rekomendasi" ? "is-active" : ""} onClick={(event) => scrollToSection(event, "rekomendasi")}>Rekomendasi</a>
          <a href="/#tentang" className={activeNav === "tentang" ? "is-active" : ""} onClick={(event) => scrollToSection(event, "tentang")}>Tentang</a>
          {account?.role === "moderator" && <button className={`nav-link ${activeNav === "/admin" ? "is-active" : ""}`} onClick={() => goToPage("/admin")}>Panel Moderator</button>}
          {account && <button className={`nav-link ${activeNav === "/personalization" ? "is-active" : ""}`} onClick={() => goToPage("/personalization")}>Personalisasi</button>}
          {account && <button className={`nav-link ${activeNav === "/profile" ? "is-active" : ""}`} onClick={() => goToPage("/profile")}>Profil</button>}
          {account && <button className={`nav-link ${activeNav === "/settings" ? "is-active" : ""}`} onClick={() => goToPage("/settings")}>Pengaturan</button>}
          {account && <button className="nav-link mobile-logout" onClick={() => { onLogout(); setMenuOpen(false); }}>Keluar</button>}
        </nav>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          {account ? (
            <>
              {account.role !== "moderator" && <button className="button button-outline button-small" onClick={onSubmit}><Plus size={16} /> Pasang Lomba</button>}
              <button className="profile-chip" aria-label="Buka profil" onClick={() => goToPage("/profile")}>
                <span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : account.name.slice(0, 1).toUpperCase()}</span>
                <span className="profile-name">{account.name.split(" ")[0]}</span>
                {account.role === "moderator" && <ShieldCheck size={15} className="profile-shield" />}
              </button>
              <button className="icon-button logout-button" title="Keluar" onClick={onLogout}><LogOut size={17} /></button>
            </>
          ) : (
            <>
              <button className="button button-quiet button-small login-nav" data-guest-access onClick={() => navigate("/login")}>Masuk</button>
              <button className="button button-primary button-small" data-guest-access onClick={() => navigate("/register")}>Daftar gratis <ArrowRight size={15} /></button>
            </>
          )}
        </div>
        <button className="mobile-menu" data-guest-access onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

export function CompetitionCard({ item, onDetails }) {
  return (
    <article className="competition-card">
      <div className={`card-art ${item.color || "blue"}`}>
        <span className="card-category">{item.category}</span>
        <span className="card-art-icon"><Trophy size={25} /></span>
        {item.scope === "Internasional" && <span className="international-tag"><Globe2 size={12} /> Internasional</span>}
      </div>
      <div className="card-content">
        <div className="organizer-line"><Building2 size={14} /> {item.organizer}</div>
        <h3>{item.title}</h3>
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

export function CompetitionModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
        <span className="eyebrow"><Trophy size={14} /> INFORMASI LOMBA</span>
        <h2 id="detail-title">{item.title}</h2>
        <p className="detail-organizer"><Building2 size={16} /> {item.organizer}</p>
        <div className="detail-grid">
          <div><span>Jenjang</span><strong>{item.education}</strong></div>
          <div><span>Cakupan</span><strong>{item.scope}</strong></div>
          <div><span>Lokasi</span><strong>{item.location}</strong></div>
          <div><span>Batas pendaftaran</span><strong>{formatDate(item.deadline)}</strong></div>
          <div><span>Kategori</span><strong>{item.category}</strong></div>
          <div><span>Hadiah</span><strong>{item.prize}</strong></div>
        </div>
        <p className="detail-note">Pastikan kamu memeriksa informasi dan persyaratan resmi dari penyelenggara sebelum mendaftar.</p>
        <button className="button button-primary button-wide" onClick={onClose}>Mengerti <Check size={16} /></button>
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

export function SubmissionModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: "", organizer: "", education: "", scope: "", category: "", deadline: "", link: "", description: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.organizer.trim() || !form.education || !form.scope || !form.category.trim() || !form.deadline) {
      setError("Lengkapi semua informasi wajib sebelum mengirim.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const message = await onSubmit(form);
      if (message) {
        setError(message);
        return;
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Pengajuan lomba gagal dikirim.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="modal-card submission-modal" role="dialog" aria-modal="true" aria-labelledby="submission-title">
        <button className="modal-close" onClick={onClose} disabled={busy} aria-label="Tutup"><X size={19} /></button>
        <span className="eyebrow"><Plus size={14} /> BERBAGI KESEMPATAN</span>
        <h2 id="submission-title">Pasang informasi lomba</h2>
        <p className="modal-intro">Lomba yang kamu bagikan akan ditinjau moderator sebelum tampil untuk semua orang.</p>
        <form onSubmit={handleSubmit} className="submission-form">
          <label>Nama lomba <input value={form.title} onChange={update("title")} placeholder="Contoh: Kompetisi Inovasi Pelajar" /></label>
          <label>Penyelenggara <input value={form.organizer} onChange={update("organizer")} placeholder="Nama organisasi atau institusi" /></label>
          <div className="form-two-col">
            <label>Jenjang peserta <select value={form.education} onChange={update("education")}><option value="">Pilih jenjang</option>{educationOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Cakupan <select value={form.scope} onChange={update("scope")}><option value="">Pilih cakupan</option>{scopeOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="form-two-col">
            <label>Kategori <input value={form.category} onChange={update("category")} placeholder="Mis. Sains, Seni" /></label>
            <label>Batas pendaftaran <input type="date" value={form.deadline} onChange={update("deadline")} /></label>
          </div>
          <label>Tautan resmi (opsional) <input type="url" value={form.link} onChange={update("link")} placeholder="https://" /></label>
          <label>Deskripsi singkat (opsional) <textarea rows="3" value={form.description} onChange={update("description")} placeholder="Jelaskan lomba dan cara mengikutinya" /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="button button-primary button-wide" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="loading-icon" /> : <ArrowRight size={16} />}{busy ? "Mengirim..." : "Kirim untuk ditinjau"}</button>
        </form>
      </section>
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
        <p>{required ? "Masuk atau daftar gratis untuk menggunakan pencarian dan menjelajahi informasi lomba." : encourageShare ? "Masuk atau daftar sebagai anggota untuk mengirim informasi lomba dan membantu komunitas." : "Buat akun gratis untuk mencari lomba tanpa batas dan menyimpan kesempatan favoritmu."}</p>
        <button className="button button-primary button-wide" onClick={() => navigate(required ? "/login" : "/register")}>{required ? "Masuk dengan Google" : encourageShare ? "Daftar untuk berbagi" : "Buat akun gratis"} <ArrowRight size={16} /></button>
        <button className="prompt-login" onClick={() => navigate(required ? "/register" : "/login")}>{required ? "Belum punya akun?" : "Sudah punya akun?"} <strong>{required ? "Daftar gratis" : "Masuk"}</strong></button>
      </section>
    </div>
  );
}
