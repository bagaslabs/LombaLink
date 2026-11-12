import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  GraduationCap,
  Globe2,
  LayoutDashboard,
  LogOut,
  LoaderCircle,
  Mail,
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
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { getSupabaseClient } from "./supabase.js";

const STORAGE_KEYS = {
  guestSearches: "lombalink.guestSearches",
  moderation: "lombalink.moderation",
};

const initialCompetitions = [
  {
    id: "c1",
    title: "National Business Plan Competition 2027",
    organizer: "Universitas Indonesia",
    organizerType: "Universitas",
    category: "Bisnis",
    education: "Kuliah",
    scope: "Nasional",
    location: "Depok, Jawa Barat",
    deadline: "2027-01-18",
    prize: "Total hadiah Rp25 juta",
    mode: "Hybrid",
    color: "lavender",
    featured: true,
  },
  {
    id: "c2",
    title: "Kompetisi Sains Nasional",
    organizer: "Pusat Prestasi Nasional",
    organizerType: "Pemerintah",
    category: "Sains",
    education: "SMA",
    scope: "Nasional",
    location: "Jakarta",
    deadline: "2027-01-24",
    prize: "Medali & beasiswa",
    mode: "Offline",
    color: "mint",
    featured: true,
  },
  {
    id: "c3",
    title: "Digital Art for a Better Earth",
    organizer: "Ruang Kreatif Indonesia",
    organizerType: "Lembaga umum",
    category: "Seni",
    education: "Umum",
    scope: "Internasional",
    location: "Online",
    deadline: "2027-02-02",
    prize: "Total hadiah Rp12 juta",
    mode: "Online",
    color: "peach",
    featured: true,
  },
  {
    id: "c4",
    title: "Junior Coding Challenge",
    organizer: "Komunitas Kode Nusantara",
    organizerType: "Komunitas",
    category: "Teknologi",
    education: "SMP",
    scope: "Provinsi",
    location: "Bandung, Jawa Barat",
    deadline: "2027-02-10",
    prize: "Laptop & sertifikat",
    mode: "Hybrid",
    color: "blue",
    featured: false,
  },
  {
    id: "c5",
    title: "Indonesia Youth Essay Awards",
    organizer: "Forum Pendidikan Muda",
    organizerType: "Lembaga umum",
    category: "Menulis",
    education: "SMA",
    scope: "Nasional",
    location: "Online",
    deadline: "2027-02-16",
    prize: "Beasiswa & uang pembinaan",
    mode: "Online",
    color: "yellow",
    featured: false,
  },
  {
    id: "c6",
    title: "Liga Futsal Pelajar Kota",
    organizer: "Dinas Pemuda dan Olahraga",
    organizerType: "Pemerintah",
    category: "Olahraga",
    education: "SMA",
    scope: "Daerah",
    location: "Surabaya, Jawa Timur",
    deadline: "2027-02-22",
    prize: "Piala & uang pembinaan",
    mode: "Offline",
    color: "rose",
    featured: false,
  },
];

const initialModeration = [
  {
    id: "pending-1",
    title: "Festival Inovasi Pelajar 2027",
    organizer: "Yayasan Cipta Generasi",
    organizerType: "Lembaga umum",
    category: "Teknologi",
    education: "SMA",
    scope: "Nasional",
    location: "Online",
    deadline: "2027-03-10",
    prize: "Total hadiah Rp15 juta",
    submittedBy: "Nadia Putri",
    submittedAt: "10 Nov 2026",
    status: "pending",
  },
  {
    id: "pending-2",
    title: "Olimpiade Matematika Nusantara",
    organizer: "Himpunan Mahasiswa Matematika",
    organizerType: "Universitas",
    category: "Akademik",
    education: "SMP",
    scope: "Provinsi",
    location: "Yogyakarta",
    deadline: "2027-03-28",
    prize: "Medali & sertifikat",
    submittedBy: "Rizky Maulana",
    submittedAt: "09 Nov 2026",
    status: "pending",
  },
];

const educationOptions = ["SMP", "SMA", "Kuliah", "Umum"];
const scopeOptions = ["Daerah", "Provinsi", "Nasional", "Internasional"];
const organizerOptions = ["Pemerintah", "Universitas", "Lembaga umum", "Komunitas"];

function readStoredJson(key, fallback) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : fallback;
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem("lombalink.theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function accountFromUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Pengguna",
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || "",
    email: user.email || "",
    phone: user.user_metadata?.phone || "",
    region: user.user_metadata?.region || "",
    institution: user.user_metadata?.institution || "",
    role: user.app_metadata?.role === "moderator" ? "moderator" : "user",
  };
}

function googleOAuthErrorMessage(message) {
  const normalized = message.toLowerCase();
  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google OAuth belum aktif di Supabase. Aktifkan Google di Authentication → Sign In / Providers, isi Client ID dan Client Secret dari Google Cloud, lalu izinkan URL callback Supabase di Google Cloud serta URL aplikasi di Authentication → URL Configuration.";
  }
  return message;
}

function isProfileComplete(account) {
  return Boolean(account?.fullName?.trim() && account?.phone?.trim() && account?.region?.trim());
}

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextRoute) => {
    if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, "", nextRoute);
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return [route, navigate];
}

function Brand({ onClick }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="LombaLink, beranda">
      <span className="brand-mark"><Trophy size={18} strokeWidth={2.5} /></span>
      <span>Lomba<span className="brand-link">Link</span></span>
    </button>
  );
}

function ThemeToggle({ theme, onToggleTheme }) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
      type="button"
      aria-label={`Aktifkan tema ${nextTheme}`}
      title={`Aktifkan tema ${nextTheme}`}
      onClick={onToggleTheme}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function Header({ account, navigate, onSubmit, onLogout, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand onClick={() => navigate("/")} />
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi utama">
          <a href="/#cari" onClick={(event) => { event.preventDefault(); navigate("/"); document.getElementById("cari")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>Cari Lomba</a>
          <a href="/#tentang" onClick={(event) => { event.preventDefault(); navigate("/"); document.getElementById("tentang")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); }}>Tentang</a>
          {account?.role === "moderator" && <button className="nav-link" onClick={() => { navigate("/admin"); setMenuOpen(false); }}>Panel Moderator</button>}
          {account && <button className="nav-link" onClick={() => { navigate("/profile"); setMenuOpen(false); }}>Profil &amp; pengaturan</button>}
          {account && <button className="nav-link mobile-logout" onClick={() => { onLogout(); setMenuOpen(false); }}>Keluar</button>}
        </nav>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          {account ? (
            <>
              {account.role !== "moderator" && <button className="button button-outline button-small" onClick={onSubmit}><Plus size={16} /> Pasang Lomba</button>}
              <button className="profile-chip" aria-label="Pengaturan profil" onClick={() => navigate("/profile")}>
                <span className="avatar">{account.name.slice(0, 1).toUpperCase()}</span>
                <span className="profile-name">{account.name.split(" ")[0]}</span>
                {account.role === "moderator" && <ShieldCheck size={15} className="profile-shield" />}
              </button>
              <button className="icon-button logout-button" title="Keluar" onClick={onLogout}><LogOut size={17} /></button>
            </>
          ) : (
            <>
              <button className="button button-quiet button-small login-nav" onClick={() => navigate("/login")}>Masuk</button>
              <button className="button button-primary button-small" onClick={() => navigate("/register")}>Daftar gratis <ArrowRight size={15} /></button>
            </>
          )}
        </div>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function CompetitionCard({ item, onDetails }) {
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

function formatDate(dateString) {
  if (!dateString) return "Segera";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date);
}

function CompetitionModal({ item, onClose }) {
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

function SearchPanel({ filters, setFilters, onSearch, remaining, isLoggedIn, categoryOptions }) {
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
        {!isLoggedIn && <span className="search-quota">{remaining} pencarian gratis tersisa</span>}
      </div>
    </div>
  );
}

function SubmissionModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ title: "", organizer: "", education: "", scope: "", category: "", deadline: "", link: "", description: "" });
  const [error, setError] = useState("");
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.organizer.trim() || !form.education || !form.scope || !form.category.trim() || !form.deadline) {
      setError("Lengkapi semua informasi wajib sebelum mengirim.");
      return;
    }
    onSubmit(form);
    onClose();
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card submission-modal" role="dialog" aria-modal="true" aria-labelledby="submission-title">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
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
          <button className="button button-primary button-wide" type="submit">Kirim untuk ditinjau <ArrowRight size={16} /></button>
        </form>
      </section>
    </div>
  );
}

function LandingPage({ account, navigate, onSubmit, onRequireAccount, guestSearches, competitions }) {
  const [filters, setFilters] = useState({ keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" });
  const [hasSearched, setHasSearched] = useState(false);
  const [detail, setDetail] = useState(null);
  const categoryOptions = useMemo(() => [...new Set(competitions.map((item) => item.category))].sort(), [competitions]);
  const filtered = useMemo(() => competitions.filter((item) => {
    const searchText = `${item.title} ${item.organizer} ${item.category} ${item.location}`.toLowerCase();
    return (!filters.keyword || searchText.includes(filters.keyword.toLowerCase().trim()))
      && (!filters.education || item.education === filters.education)
      && (!filters.category || item.category === filters.category)
      && (!filters.scope || item.scope === filters.scope)
      && (!filters.organizerType || item.organizerType === filters.organizerType)
      && (!filters.location || item.location.toLowerCase().includes(filters.location.toLowerCase().trim()));
  }), [competitions, filters]);
  const remaining = Math.max(0, 3 - guestSearches);

  const search = () => {
    if (!account && guestSearches >= 3) {
      onRequireAccount();
      return;
    }
    setHasSearched(true);
    if (!account) {
      const next = guestSearches + 1;
      localStorage.setItem(STORAGE_KEYS.guestSearches, String(next));
      window.dispatchEvent(new CustomEvent("lombalink:search-count", { detail: next }));
    }
    document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const quickCategories = [
    { title: "Sains & Akademik", icon: <GraduationCap size={20} />, count: "120+ lomba", tone: "category-blue" },
    { title: "Bisnis & Inovasi", icon: <ArrowDownRight size={20} />, count: "86+ lomba", tone: "category-lilac" },
    { title: "Seni & Kreatif", icon: <Sparkles size={20} />, count: "64+ lomba", tone: "category-peach" },
    { title: "Teknologi", icon: <Globe2 size={20} />, count: "52+ lomba", tone: "category-green" },
  ];

  return (
    <>
      <main>
        <section className="hero-section" id="cari">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-badge"><span className="badge-spark"><Sparkles size={13} /></span> Ruang tumbuh untuk setiap potensi</div>
              <h1>Kesempatan hebat<br />dimulai dari <span>sini.</span></h1>
              <p className="hero-description">Temukan kompetisi yang tepat untukmu. Dari ruang kelas hingga panggung dunia, semua peluang ada di satu tempat.</p>
              <div className="hero-proof"><span className="proof-avatars"><i>R</i><i>A</i><i>D</i></span><span><strong>12.000+</strong> pencari kesempatan sudah bergabung</span></div>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one"></div><div className="visual-orbit orbit-two"></div>
              <div className="visual-star star-one">✦</div><div className="visual-star star-two">✦</div>
              <div className="hero-trophy"><Trophy size={72} strokeWidth={1.6} /></div>
              <div className="floating-card floating-card-top"><span className="floating-icon icon-purple"><GraduationCap size={18} /></span><span><strong>Olimpiade Sains</strong><small>Untuk SMA · Nasional</small></span><BadgeCheck size={16} className="verified" /></div>
              <div className="floating-card floating-card-bottom"><span className="floating-icon icon-orange"><Sparkles size={18} /></span><span><strong>Hadiah menarik!</strong><small>Kesempatan baru menantimu</small></span></div>
              <span className="visual-caption">Grow beyond limits</span>
            </div>
          </div>
          <div className="search-shell">
            <SearchPanel filters={filters} setFilters={setFilters} onSearch={search} remaining={remaining} isLoggedIn={Boolean(account)} categoryOptions={categoryOptions} />
          </div>
        </section>

        <section className="category-section content-width">
          <div className="section-heading compact-heading">
            <div><span className="eyebrow">JELAJAHI PELUANG</span><h2>Mulai dari yang kamu suka</h2></div>
            <button className="text-button" onClick={() => { setFilters({ keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" }); setHasSearched(true); document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth" }); }}>Lihat semua <ArrowRight size={15} /></button>
          </div>
          <div className="category-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickCategories.map((category) => <button key={category.title} className="category-tile" onClick={() => { setFilters({ ...filters, keyword: category.title.split(" ")[0] }); setHasSearched(true); document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className={`category-icon ${category.tone}`}>{category.icon}</span><span className="category-text"><strong>{category.title}</strong><small>{category.count}</small></span><ArrowRight className="category-arrow" size={17} />
            </button>)}
          </div>
        </section>

        <section className="competition-section content-width" id="hasil">
          <div className="section-heading">
            <div><span className="eyebrow">{hasSearched ? "HASIL PENCARIAN" : "PILIHAN UNTUKMU"}</span><h2>{hasSearched ? "Lomba yang sesuai" : "Kesempatan pilihan minggu ini"}</h2><p>{hasSearched ? `${filtered.length} lomba ditemukan dari filter pilihanmu.` : "Kesempatan baru untuk belajar, berkarya, dan melangkah lebih jauh."}</p></div>
            <button className="button button-outline desktop-filter-button" onClick={() => document.getElementById("cari")?.scrollIntoView({ behavior: "smooth" })}><SlidersHorizontal size={16} /> Ubah filter</button>
          </div>
          {filtered.length ? <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{(hasSearched ? filtered : filtered.filter((item) => item.featured)).map((item) => <CompetitionCard key={item.id} item={item} onDetails={setDetail} />)}</div> : <div className="empty-results"><span><Search size={23} /></span><h3>Belum ada lomba yang cocok</h3><p>Coba ubah kata kunci atau filter pencarianmu.</p><button className="button button-outline" onClick={() => setFilters({ keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" })}>Hapus semua filter</button></div>}
          {!hasSearched && <div className="more-opportunities"><span>Selalu ada kesempatan baru untukmu.</span><button className="text-button" onClick={() => { setHasSearched(true); document.getElementById("hasil")?.scrollIntoView({ behavior: "smooth" }); }}>Jelajahi semua lomba <ArrowRight size={15} /></button></div>}
        </section>

        <section className="community-banner content-width" id="tentang">
          <div className="banner-art"><div className="banner-ring"></div><div className="banner-star">✦</div><Trophy size={58} /></div>
          <div className="banner-copy"><span className="eyebrow">KAMU PUNYA INFORMASI?</span><h2>Satu informasi bisa<br />membuka banyak jalan.</h2><p>Bagikan lomba yang kamu tahu. Bantu lebih banyak orang menemukan kesempatan terbaiknya.</p>
            <button className="button button-white" onClick={() => account ? onSubmit() : onRequireAccount(true)}>Bagikan informasi lomba <ArrowRight size={16} /></button>
          </div>
          <div className="banner-stat"><strong>2.4k+</strong><span>kesempatan telah dibagikan oleh komunitas</span></div>
        </section>

        <section className="trust-section content-width grid grid-cols-2 gap-6 lg:grid-cols-4">
          <div className="trust-intro col-span-2 lg:col-span-1"><span className="eyebrow">DIBANGUN BERSAMA</span><h2>Komunitas yang<br />saling membuka jalan.</h2><p>Setiap informasi melewati proses verifikasi agar kesempatan yang kamu temukan lebih terpercaya.</p></div>
          <div className="trust-item"><span className="trust-icon trust-blue"><ShieldCheck size={21} /></span><strong>Diverifikasi moderator</strong><p>Informasi ditinjau sebelum ditayangkan.</p></div>
          <div className="trust-item"><span className="trust-icon trust-purple"><UsersRound size={21} /></span><strong>Dari komunitas</strong><p>Peluang dibagikan oleh banyak orang.</p></div>
          <div className="trust-item"><span className="trust-icon trust-green"><Globe2 size={21} /></span><strong>Untuk semua</strong><p>Dari daerah hingga tingkat internasional.</p></div>
        </section>
      </main>
      <footer className="site-footer content-width"><Brand onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} /><span>© 2026 LombaLink. Tumbuh bersama kesempatan.</span><div><button onClick={() => navigate("/login")}>Masuk</button><button onClick={() => navigate("/register")}>Bergabung</button></div></footer>
      <CompetitionModal item={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function AuthPage({ mode, navigate, onGoogleSignIn, authConfigured, authError, theme, onToggleTheme }) {
  const isRegister = mode === "register";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const startGoogleSignIn = async () => {
    setError("");
    setBusy(true);
    const message = await onGoogleSignIn();
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="mx-auto mb-4 flex w-full max-w-[1180px] items-center justify-between gap-4">
        <button className="auth-back" onClick={() => navigate("/")}><ArrowLeft size={17} /> Kembali ke beranda</button>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <div className="auth-layout">
        <section className="auth-aside">
          <Brand onClick={() => navigate("/")} />
          <div className="auth-aside-copy"><span className="eyebrow">SATU LANGKAH LEBIH DEKAT</span><h1>{isRegister ? <>Buka ruang<br />untuk <span>bertumbuh.</span></> : <>Kesempatan<br />menunggumu<br /><span>di depan.</span></>}</h1><p>{isRegister ? "Bergabung dengan komunitas yang saling berbagi peluang dan inspirasi." : "Masuk untuk menemukan peluang baru dan menyimpan perjalananmu."}</p></div>
          <div className="auth-aside-bottom"><span className="auth-aside-icon"><Trophy size={25} /></span><span>Setiap pencapaian besar<br />dimulai dari sebuah kesempatan.</span></div>
          <div className="auth-decoration decoration-one"></div><div className="auth-decoration decoration-two"></div>
        </section>
        <section className="auth-form-side">
          <div className="auth-form-wrap">
            <span className="eyebrow">{isRegister ? "MULAI PERJALANANMU" : "SENANG MELIHATMU KEMBALI"}</span>
            <h2>{isRegister ? "Daftar dengan Google" : "Masuk dengan Google"}</h2>
            <p className="auth-subtitle">{isRegister ? "Gunakan akun Google untuk bergabung dengan komunitas LombaLink." : "Masuk dengan akun Google untuk melanjutkan perjalananmu."}</p>
            <div className="auth-form grid gap-4">
              <button className="button google-auth-button button-wide" onClick={startGoogleSignIn} disabled={!authConfigured || busy}>
                {busy ? <LoaderCircle size={18} className="loading-icon" /> : <span className="google-mark" aria-hidden="true">G</span>}
                {busy ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
                {!busy && <ArrowRight size={16} />}
              </button>
              <p className="auth-demo-note"><ShieldCheck size={14} /> LombaLink tidak menyimpan kata sandi Google kamu.</p>
              {error && <p className="form-error" role="alert">{error}</p>}
              {authError && <p className="form-error" role="alert">{authError}</p>}
              {!authConfigured && <p className="auth-setup-warning" role="alert">Google sign-in belum dikonfigurasi. Periksa URL dan publishable key Supabase di environment proyek.</p>}
            </div>
            <p className="auth-switch">{isRegister ? "Sudah punya akun?" : "Belum punya akun?"} <button onClick={() => navigate(isRegister ? "/login" : "/register")}>{isRegister ? "Masuk" : "Daftar gratis"}</button></p>
            {isRegister && <p className="auth-terms">Dengan mendaftar, kamu menyetujui ketentuan penggunaan LombaLink.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfilePage({ account, onSave, onCancel, pendingPost, theme, onToggleTheme }) {
  const [form, setForm] = useState({
    fullName: account.fullName || "",
    phone: account.phone || "",
    region: account.region || "",
    institution: account.institution || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim() || !form.region.trim()) {
      setError("Nama lengkap, nomor HP, dan provinsi/kota wajib diisi.");
      return;
    }
    setError("");
    setBusy(true);
    const message = await onSave({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      region: form.region.trim(),
      institution: form.institution.trim(),
    });
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="profile-page">
      <div className="mx-auto mb-4 flex w-full max-w-[620px] items-center justify-between gap-4">
        <button className="auth-back" onClick={onCancel}><ArrowLeft size={17} /> Kembali ke beranda</button>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <section className="profile-card">
        <div className="profile-card-heading">
          <span className="profile-settings-icon"><UserRound size={22} /></span>
          <span className="eyebrow">PENGATURAN AKUN</span>
          <h1>Lengkapi profilmu</h1>
          <p>Profil yang lengkap membantu komunitas mengetahui siapa yang membagikan informasi lomba.</p>
        </div>
        {pendingPost && <div className="profile-requirement"><ShieldCheck size={17} /><span>Lengkapi data wajib di bawah sebelum mengajukan lomba.</span></div>}
        <form className="profile-form grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label>Nama lengkap <span className="required-mark">*</span><input autoComplete="name" value={form.fullName} onChange={update("fullName")} placeholder="Nama sesuai identitas" required /></label>
          <label>Nomor HP <span className="required-mark">*</span><input type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} placeholder="Contoh: 081234567890" required /></label>
          <label>Provinsi / kota <span className="required-mark">*</span><input autoComplete="address-level1" value={form.region} onChange={update("region")} placeholder="Contoh: Bandung, Jawa Barat" required /></label>
          <label>Lembaga <span className="optional-mark">(opsional)</span><input autoComplete="organization" value={form.institution} onChange={update("institution")} placeholder="Sekolah, kampus, atau organisasi" /></label>
          {error && <p className="form-error sm:col-span-2" role="alert">{error}</p>}
          <button className="button button-primary button-wide auth-submit sm:col-span-2" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="loading-icon" /> : null}
            {busy ? "Menyimpan profil..." : "Simpan profil"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>
        <p className="profile-account-email"><Mail size={14} /> Masuk dengan {account.email}</p>
      </section>
    </main>
  );
}

function AdminPage({ navigate, moderation, setModeration, theme, onToggleTheme }) {
  const [tab, setTab] = useState("pending");
  const pending = moderation.filter((item) => item.status === "pending");
  const visible = moderation.filter((item) => tab === "all" || item.status === tab);
  const updateStatus = (id, status) => setModeration(moderation.map((item) => item.id === id ? { ...item, status } : item));

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Brand onClick={() => navigate("/")} />
        <div className="sidebar-label">WORKSPACE</div>
        <button className="sidebar-item active"><LayoutDashboard size={17} /> Ringkasan</button>
        <button className="sidebar-item" onClick={() => setTab("pending")}><Clock3 size={17} /> Verifikasi <span className="sidebar-count">{pending.length}</span></button>
        <button className="sidebar-item" onClick={() => setTab("approved")}><CheckCircle2 size={17} /> Lomba terbit</button>
        <div className="sidebar-label sidebar-label-bottom">AKUN</div>
        <button className="sidebar-item" onClick={() => navigate("/")}><ArrowLeft size={17} /> Kembali ke situs</button>
        <div className="sidebar-user"><span className="avatar moderator-avatar">M</span><span><strong>Moderator</strong><small>Pengelola LombaLink</small></span><ShieldCheck size={15} /></div>
      </aside>
      <section className="admin-main">
        <div className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> <strong>Ringkasan</strong></div><div className="admin-top-actions"><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /><span className="admin-live"><i></i> Semua sistem berjalan</span><button className="admin-user-pill"><span className="avatar moderator-avatar">M</span> Moderator</button></div></div>
        <div className="admin-content">
          <div className="admin-welcome"><div><span className="eyebrow">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("id-ID")}</span><h1>Ruang kendali moderator</h1><p>Tinjau informasi baru dan bantu komunitas menemukan peluang yang terpercaya.</p></div><button className="button button-primary" onClick={() => navigate("/")}><ArrowLeft size={16} /> Lihat situs</button></div>
          <div className="admin-stats grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            <div className="admin-stat"><span className="stat-icon stat-purple"><Trophy size={19} /></span><span className="stat-label">Total lomba</span><strong>{128 + moderation.filter((item) => item.status === "approved").length}</strong><small><span className="positive">+12%</span> dari bulan lalu</small></div>
            <div className="admin-stat"><span className="stat-icon stat-yellow"><Clock3 size={19} /></span><span className="stat-label">Menunggu verifikasi</span><strong>{pending.length}</strong><small>Perlu ditinjau moderator</small></div>
            <div className="admin-stat"><span className="stat-icon stat-green"><UsersRound size={19} /></span><span className="stat-label">Kontributor aktif</span><strong>2.4k</strong><small><span className="positive">+8%</span> dari bulan lalu</small></div>
            <div className="admin-stat"><span className="stat-icon stat-blue"><Globe2 size={19} /></span><span className="stat-label">Lomba bulan ini</span><strong>36</strong><small>Di 12 kategori</small></div>
          </div>
          <div className="admin-table-card">
            <div className="table-heading"><div><h2>Pengajuan lomba</h2><p>Periksa kelengkapan informasi sebelum dipublikasikan.</p></div><button className="button button-outline button-small"><SlidersHorizontal size={15} /> Filter</button></div>
            <div className="table-tabs"><button className={tab === "pending" ? "selected" : ""} onClick={() => setTab("pending")}>Menunggu <span>{pending.length}</span></button><button className={tab === "approved" ? "selected" : ""} onClick={() => setTab("approved")}>Disetujui</button><button className={tab === "rejected" ? "selected" : ""} onClick={() => setTab("rejected")}>Ditolak</button><button className={tab === "all" ? "selected" : ""} onClick={() => setTab("all")}>Semua</button></div>
            <div className="submission-list">
              {visible.length ? visible.map((item) => <article className="submission-row" key={item.id}>
                <span className="submission-logo"><Trophy size={20} /></span>
                <div className="submission-info"><strong>{item.title}</strong><span>{item.organizer} <i>·</i> {item.category} <i>·</i> {item.education}</span><small>Diajukan oleh {item.submittedBy || "Anggota LombaLink"} · {item.submittedAt || "Baru saja"}</small></div>
                <span className={`status-pill status-${item.status}`}>{item.status === "pending" ? <><i></i> Menunggu</> : item.status === "approved" ? <><Check size={12} /> Disetujui</> : "Ditolak"}</span>
                {item.status === "pending" ? <div className="submission-actions"><button title="Tolak pengajuan" className="reject-action" onClick={() => updateStatus(item.id, "rejected")}><X size={16} /></button><button title="Setujui dan publikasikan" className="approve-action" onClick={() => updateStatus(item.id, "approved")}><Check size={16} /></button></div> : <span className="reviewed-label">Ditinjau</span>}
              </article>) : <div className="admin-empty"><CheckCircle2 size={22} /><strong>Tidak ada pengajuan di sini</strong><span>Semua pengajuan pada tab ini sudah ditangani.</span></div>}
            </div>
            <div className="table-footer"><span>Menampilkan {visible.length} pengajuan</span><button onClick={() => setTab("all")}>Lihat semua pengajuan <ArrowRight size={14} /></button></div>
          </div>
          <div className="admin-tip"><span><Sparkles size={17} /></span><p><strong>Tips moderasi:</strong> Pastikan tautan pendaftaran aktif dan informasi batas waktu terlihat jelas sebelum menyetujui lomba.</p></div>
        </div>
      </section>
    </main>
  );
}

function AccountPrompt({ onClose, navigate, encourageShare }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-title">
        <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>
        <span className="prompt-icon"><Sparkles size={23} /></span>
        <span className="eyebrow">{encourageShare ? "BERBAGI PELUANG" : "LANJUTKAN PERJALANANMU"}</span>
        <h2 id="prompt-title">{encourageShare ? "Punya akun LombaLink?" : "Pencarian gratis sudah habis"}</h2>
        <p>{encourageShare ? "Masuk atau daftar sebagai anggota untuk mengirim informasi lomba dan membantu komunitas." : "Buat akun gratis untuk mencari lomba tanpa batas dan menyimpan kesempatan favoritmu."}</p>
        <button className="button button-primary button-wide" onClick={() => navigate("/register")}>{encourageShare ? "Daftar untuk berbagi" : "Buat akun gratis"} <ArrowRight size={16} /></button>
        <button className="prompt-login" onClick={() => navigate("/login")}>Sudah punya akun? <strong>Masuk</strong></button>
      </section>
    </div>
  );
}

export default function App() {
  const [route, navigate] = useRoute();
  const [theme, setTheme] = useState(getInitialTheme);
  const [account, setAccount] = useState(null);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [guestSearches, setGuestSearches] = useState(() => Number(localStorage.getItem(STORAGE_KEYS.guestSearches) || 0));
  const [moderation, setModeration] = useState(() => readStoredJson(STORAGE_KEYS.moderation, initialModeration));
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [encourageShare, setEncourageShare] = useState(false);
  const [postAfterProfile, setPostAfterProfile] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lombalink.theme", theme);
  }, [theme]);

  useEffect(() => localStorage.setItem(STORAGE_KEYS.moderation, JSON.stringify(moderation)), [moderation]);
  useEffect(() => {
    let active = true;
    let subscription;

    getSupabaseClient().then((client) => {
      if (!active) return;
      setSupabaseClient(client);
      if (!client) {
        setAuthReady(true);
        return;
      }

      const { data: { subscription: authSubscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        setAccount(accountFromUser(session?.user));
        setAuthReady(true);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setAuthError("");
      });
      subscription = authSubscription;

      return client.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setAccount(accountFromUser(data.session?.user));
        setAuthReady(true);
      });
    }).catch((error) => {
      if (!active) return;
      setAuthError(error instanceof Error ? error.message : "Sesi tidak dapat dimuat.");
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const updateCount = (event) => setGuestSearches(event.detail);
    window.addEventListener("lombalink:search-count", updateCount);
    return () => window.removeEventListener("lombalink:search-count", updateCount);
  }, []);

  const signInWithGoogle = async () => {
    if (!supabaseClient) return "Google sign-in belum siap. Periksa konfigurasi Supabase.";
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,
          redirectTo: window.location.origin,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        return googleOAuthErrorMessage(error.message);
      }

      if (!data.url) return "Supabase tidak memberikan URL untuk memulai login Google.";
      const response = await fetch(data.url, { redirect: "manual" });
      if (response.status >= 400) {
        const body = await response.text();
        let providerMessage = "";
        try {
          const payload = JSON.parse(body);
          providerMessage = payload.msg || payload.message || "";
        } catch (parseError) {
          if (!(parseError instanceof SyntaxError)) throw parseError;
        }
        return googleOAuthErrorMessage(providerMessage || `Permintaan login Google gagal (${response.status}).`);
      }

      window.location.assign(data.url);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Gagal menghubungkan ke Google.";
    }
  };

  const logout = async () => {
    if (!supabaseClient) return;
    setAuthError("");
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        setAuthError(error.message);
        return;
      }
      navigate("/");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Gagal keluar dari akun.");
    }
  };

  const saveProfile = async (profile) => {
    if (!supabaseClient) return "Supabase belum dikonfigurasi.";
    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        data: {
          full_name: profile.fullName,
          phone: profile.phone,
          region: profile.region,
          institution: profile.institution,
        },
      });
      if (error) return error.message;
      if (!data.user) return "Profil tidak dapat dimuat setelah disimpan.";

      const nextAccount = accountFromUser(data.user);
      setAccount(nextAccount);
      setAuthError("");
      if (postAfterProfile) {
        setPostAfterProfile(false);
        navigate("/");
        setSubmissionOpen(true);
      } else {
        navigate("/");
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Profil gagal disimpan.";
    }
  };

  const openAccountPrompt = (share = false) => {
    setEncourageShare(share);
    setPromptOpen(true);
  };
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  const requestSubmission = () => {
    if (!account) {
      openAccountPrompt(true);
      return;
    }
    if (!isProfileComplete(account)) {
      setPostAfterProfile(true);
      navigate("/profile");
      return;
    }
    setSubmissionOpen(true);
  };

  const submitCompetition = (form) => {
    const entry = {
      ...form,
      id: `user-${Date.now()}`,
      organizerType: "Lembaga umum",
      location: "Online",
      prize: "Informasi hadiah belum ditambahkan",
      submittedBy: account?.fullName || account?.name || "Anggota LombaLink",
      submittedAt: "Baru saja",
      status: "pending",
    };
    setModeration((current) => [...current, entry]);
  };

  const competitions = useMemo(
    () => [...initialCompetitions, ...moderation.filter((item) => item.status === "approved")],
    [moderation],
  );

  if (!authReady) {
    return <main className="auth-loading" role="status"><LoaderCircle size={20} className="loading-icon" /> Memuat sesi akun...</main>;
  }

  if (route === "/login" || route === "/register") {
    return <AuthPage mode={route.slice(1)} navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError={authError} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (route === "/profile") {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk dengan Google untuk mengatur profil." theme={theme} onToggleTheme={toggleTheme} />;
    }
    return <ProfilePage account={account} onSave={saveProfile} onCancel={() => { setPostAfterProfile(false); navigate("/"); }} pendingPost={postAfterProfile} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (route === "/admin") {
    if (account?.role !== "moderator") {
      return <main className="access-denied"><div className="fixed right-5 top-5 z-20"><ThemeToggle theme={theme} onToggleTheme={toggleTheme} /></div><span className="access-icon"><ShieldCheck size={26} /></span><h1>Halaman moderator</h1><p>Masuk dengan akun moderator untuk mengakses panel verifikasi.</p><button className="button button-primary" onClick={() => navigate("/login")}>Masuk sebagai moderator <ArrowRight size={16} /></button><button className="access-back" onClick={() => navigate("/")}>Kembali ke beranda</button></main>;
    }
    return <AdminPage navigate={navigate} moderation={moderation} setModeration={setModeration} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <>
      <Header account={account} navigate={navigate} onSubmit={requestSubmission} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} />
      {authError && <div className="auth-error-banner" role="alert">{authError}<button onClick={() => setAuthError("")}>Tutup</button></div>}
      <LandingPage account={account} navigate={navigate} onSubmit={requestSubmission} onRequireAccount={openAccountPrompt} guestSearches={guestSearches} competitions={competitions} />
      {submissionOpen && <SubmissionModal onClose={() => setSubmissionOpen(false)} onSubmit={submitCompetition} />}
      {promptOpen && <AccountPrompt onClose={() => setPromptOpen(false)} navigate={navigate} encourageShare={encourageShare} />}
    </>
  );
}
