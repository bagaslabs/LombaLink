import React, { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Globe2,
  GraduationCap,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Brand, CompetitionCard, CompetitionModal, SearchPanel } from "../components.jsx";
import { defaultPreferences } from "../data.js";

export default function LandingPage({ account, navigate, onSubmit, onRequireAccount, competitions, competitionsLoading, competitionsError }) {
  const [filters, setFilters] = useState({ keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" });
  const [hasSearched, setHasSearched] = useState(false);
  const [detail, setDetail] = useState(null);
  const categoryOptions = useMemo(() => [...new Set(competitions.map((item) => item.category))].sort(), [competitions]);
  const preferences = account?.preferences || defaultPreferences;
  const hasPreferences = Object.values(preferences).some((value) => value.trim());
  const filtered = useMemo(() => competitions.filter((item) => {
    const searchText = `${item.title} ${item.organizer} ${item.category} ${item.location}`.toLowerCase();
    return (!filters.keyword || searchText.includes(filters.keyword.toLowerCase().trim()))
      && (!filters.education || item.education === filters.education)
      && (!filters.category || item.category === filters.category)
      && (!filters.scope || item.scope === filters.scope)
      && (!filters.organizerType || item.organizerType === filters.organizerType)
      && (!filters.location || item.location.toLowerCase().includes(filters.location.toLowerCase().trim()));
  }), [competitions, filters]);
  const recommendations = useMemo(() => {
    if (!hasPreferences) return [];
    return competitions.filter((item) => (
      (!preferences.category || item.category === preferences.category)
      && (!preferences.education || item.education === preferences.education)
      && (!preferences.scope || item.scope === preferences.scope)
      && (!preferences.organizerType || item.organizerType === preferences.organizerType)
      && (!preferences.location || item.location.toLowerCase().includes(preferences.location.toLowerCase().trim()))
    ));
  }, [competitions, hasPreferences, preferences]);

  const search = () => {
    if (!account) {
      onRequireAccount(false, true);
      return;
    }
    setHasSearched(true);
    document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const quickCategories = [
    { title: "Sains & Akademik", icon: <GraduationCap size={20} />, description: "Ilmu dan olimpiade", tone: "category-blue" },
    { title: "Bisnis & Inovasi", icon: <ArrowDownRight size={20} />, description: "Ide dan usaha", tone: "category-lilac" },
    { title: "Seni & Kreatif", icon: <Sparkles size={20} />, description: "Desain dan karya", tone: "category-peach" },
    { title: "Teknologi", icon: <Globe2 size={20} />, description: "Digital dan inovasi", tone: "category-green" },
  ];
  const shownCompetitions = hasSearched ? filtered : recommendations;
  const competitionResults = competitionsLoading
    ? <div className="empty-results" role="status"><span><Search size={23} /></span><h3>Memuat data lomba</h3><p>Mengambil informasi yang tersedia dari database.</p></div>
    : competitionsError
      ? <div className="empty-results" role="alert"><span><Search size={23} /></span><h3>Data lomba tidak dapat dimuat</h3><p>{competitionsError}</p></div>
      : shownCompetitions.length
        ? <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{shownCompetitions.map((item) => <CompetitionCard key={item.id} item={item} onDetails={setDetail} />)}</div>
        : <div className="empty-results">
          <span><Search size={23} /></span>
          <h3>{hasSearched ? "Belum ada lomba yang cocok" : hasPreferences ? "Belum ada rekomendasi yang cocok" : "Belum ada lomba terverifikasi"}</h3>
          <p>{hasSearched ? "Coba ubah kata kunci atau filter pencarianmu." : hasPreferences ? "Belum ada lomba terverifikasi yang sesuai dengan preferensimu." : "Informasi lomba yang telah diverifikasi moderator akan tampil di sini."}</p>
          {hasSearched ? <button className="button button-outline" onClick={() => setFilters({ keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" })}>Hapus semua filter</button> : account && <button className="button button-primary" onClick={() => navigate("/personalization")}>Atur personalisasi <ArrowRight size={15} /></button>}
        </div>;

  return (
    <>
      <main>
        <section className="hero-section" id="cari">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-badge"><span className="badge-spark"><Sparkles size={13} /></span> Ruang tumbuh untuk setiap potensi</div>
              <h1>Kesempatan hebat<br />dimulai dari <span>sini.</span></h1>
              <p className="hero-description">Temukan kompetisi yang tepat untukmu. Dari ruang kelas hingga panggung dunia, semua peluang ada di satu tempat.</p>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="visual-orbit orbit-one"></div><div className="visual-orbit orbit-two"></div>
              <div className="visual-star star-one">✦</div><div className="visual-star star-two">✦</div>
              <div className="hero-trophy"><Trophy size={72} strokeWidth={1.6} /></div>
              <div className="floating-card floating-card-top"><span className="floating-icon icon-purple"><ShieldCheck size={18} /></span><span><strong>Verifikasi moderator</strong><small>Informasi ditinjau sebelum terbit</small></span><BadgeCheck size={16} className="verified" /></div>
              <div className="floating-card floating-card-bottom"><span className="floating-icon icon-orange"><Sparkles size={18} /></span><span><strong>Personalisasi</strong><small>Temukan lomba sesuai minatmu</small></span></div>
              <span className="visual-caption">Grow beyond limits</span>
            </div>
          </div>
          <div className="search-shell">
            <SearchPanel filters={filters} setFilters={setFilters} onSearch={search} isLoggedIn={Boolean(account)} categoryOptions={categoryOptions} />
          </div>
        </section>

        <section className="category-section content-width">
          <div className="section-heading compact-heading">
            <div><span className="eyebrow">JELAJAHI PELUANG</span><h2>Mulai dari yang kamu suka</h2></div>
            <button className="text-button" onClick={() => { setFilters({ keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" }); setHasSearched(true); document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" }); }}>Lihat semua <ArrowRight size={15} /></button>
          </div>
          <div className="category-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
            {quickCategories.map((category) => <button key={category.title} className="category-tile" onClick={() => { setFilters({ ...filters, keyword: category.title.split(" ")[0] }); setHasSearched(true); document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className={`category-icon ${category.tone}`}>{category.icon}</span><span className="category-text"><strong>{category.title}</strong><small>{category.description}</small></span><ArrowRight className="category-arrow" size={17} />
            </button>)}
          </div>
        </section>

        <section className="competition-section content-width" id="rekomendasi">
          <div className="section-heading">
            <div><span className="eyebrow">{hasSearched ? "HASIL PENCARIAN" : "REKOMENDASI UNTUKMU"}</span><h2>{hasSearched ? "Lomba yang sesuai" : "Peluang sesuai minatmu"}</h2><p>{hasSearched ? `${filtered.length} lomba ditemukan dari filter pilihanmu.` : hasPreferences ? "Disesuaikan dengan preferensi lomba yang kamu pilih." : "Atur minatmu agar rekomendasi lomba lebih relevan."}</p></div>
            <button className="button button-outline desktop-filter-button" onClick={() => document.getElementById("cari")?.scrollIntoView({ behavior: "smooth" })}><SlidersHorizontal size={16} /> Ubah filter</button>
          </div>
          {competitionResults}
          {!hasSearched && competitions.length > 0 && <div className="more-opportunities"><span>Ingin melihat semua peluang?</span><button className="text-button" onClick={() => { setHasSearched(true); document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "smooth" }); }}>Jelajahi semua lomba <ArrowRight size={15} /></button></div>}
        </section>

        <section className="community-banner content-width" id="tentang">
          <div className="banner-art"><div className="banner-ring"></div><div className="banner-star">✦</div><Trophy size={58} /></div>
          <div className="banner-copy"><span className="eyebrow">KAMU PUNYA INFORMASI?</span><h2>Satu informasi bisa<br />membuka banyak jalan.</h2><p>Bagikan lomba yang kamu tahu. Bantu lebih banyak orang menemukan kesempatan terbaiknya.</p>
            <button className="button button-white" onClick={() => account ? onSubmit() : onRequireAccount(true)}>Bagikan informasi lomba <ArrowRight size={16} /></button>
          </div>
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
