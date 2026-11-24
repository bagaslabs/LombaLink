import React, { useLayoutEffect } from "react";
import trophyFavicon from "../../logo/favicon.png";
import recommendationTrophy from "../assets/recommendation-trophy-transparent.png";
import {
  ArrowRight,
  Gamepad2,
  GraduationCap,
  Image as ImageIcon,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import SearchPage from "./SearchPage.jsx";
import RecommendationsPage from "./RecommendationsPage.jsx";
import { scrollToPageSection } from "../data.js";

export default function LandingPage({
  account,
  navigate,
  onSubmit,
  onRequireAccount,
  competitions,
  competitionsLoading,
  competitionsError,
  categoryOptions,
  initialSection,
  initialScrollBehavior = "instant",
}) {
  useLayoutEffect(() => {
    if (!initialSection) return undefined;
    scrollToPageSection(initialSection, initialScrollBehavior);
    return undefined;
  }, [initialSection, initialScrollBehavior]);

  const scrollToSection = (sectionId) => {
    scrollToPageSection(sectionId);
  };

  return (
    <main>
      <SearchPage
        navigate={navigate}
        competitions={competitions}
        competitionsLoading={competitionsLoading}
        competitionsError={competitionsError}
        categoryOptions={categoryOptions}
        renderLayout={({ searchControls, searchResults }) => (
          <>
            <section className="hero-section landing-top-section">
              <div className="hero-grid">
                <div className="hero-copy">
                  <div className="hero-badge"><span className="badge-spark"><Sparkles size={13} /></span> Platform Informasi Lomba Terpercaya</div>
                  <h1>Kesempatan hebat<br />dimulai dari <span>sini.</span></h1>
                  <p className="hero-description">Temukan kompetisi yang tepat untukmu. Dari ruang kelas hingga panggung dunia, semua peluang ada di satu tempat.</p>
                  <div className="hero-actions">
                    <button className="button button-primary" data-guest-access onClick={() => scrollToSection("cari")}><Search size={16} /> Cari Lomba Sekarang <ArrowRight size={16} /></button>
                    <button className="button button-outline" data-guest-access onClick={() => scrollToSection("rekomendasi")}><Sparkles size={16} /> Lihat Rekomendasi</button>
                  </div>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="visual-orbit orbit-one"></div><div className="visual-orbit orbit-two"></div>
                  <div className="visual-star star-one">✦</div><div className="visual-star star-two">✦</div>
                  <div className="hero-trophy"><img src={trophyFavicon} alt="" /></div>
                  <div className="floating-card floating-card-academic"><span className="floating-icon icon-cyan"><GraduationCap size={18} /></span><span><strong>Akademik</strong><small>Olimpiade, Esai, KTI, dll.</small></span></div>
                  <div className="floating-card floating-card-non-academic"><span className="floating-icon icon-blue"><Gamepad2 size={18} /></span><span><strong>Non Akademik</strong><small>Seni, Olahraga, Teknologi, dll.</small></span></div>
                  <div className="floating-card floating-card-personalization"><span className="floating-icon icon-orange"><Sparkles size={18} /></span><span><strong>Personalisasi Lomba</strong><small>Rekomendasi sesuai minatmu</small></span></div>
                  <span className="visual-caption">Grow beyond limits</span>
                </div>
              </div>
              {searchControls}
            </section>
            {searchResults}
          </>
        )}
      />
      <RecommendationsPage
        account={account}
        navigate={navigate}
        onRequireAccount={onRequireAccount}
        competitions={competitions}
        competitionsLoading={competitionsLoading}
        competitionsError={competitionsError}
        onShowAllCompetitions={() => scrollToSection("cari")}
      />

      <section className="community-banner content-width" id="tentang">
        <div className="banner-art" aria-hidden="true">
          <div className="banner-ring"></div>
          <div className="banner-star">✦</div>
          <img className="banner-trophy-illustration" src={recommendationTrophy} alt="" />
        </div>
        <div className="banner-copy">
          <span className="eyebrow">TENTANG LOMBALINK</span>
          <h2>Satu informasi bisa<br />membuka <span className="community-highlight">banyak jalan.</span></h2>
          <p>LombaLink membantu peserta menemukan peluang, sekaligus membantu penyelenggara membagikan lomba yang terpercaya.</p>
          {account?.role !== "participant" && <button className="button button-white" onClick={() => account ? onSubmit() : onRequireAccount(true)}>Tambah Lomba <ArrowRight size={16} /></button>}
        </div>
        <div className="banner-opportunity-art" aria-hidden="true">
          <div className="banner-opportunity-card banner-opportunity-card-left"><span><ImageIcon size={18} /></span><i /><i className="short" /></div>
          <div className="banner-opportunity-card banner-opportunity-card-right"><span><ImageIcon size={18} /></span><i /><i className="short" /></div>
          <div className="banner-opportunity-card banner-opportunity-card-front"><span><ImageIcon size={20} /></span><i /><i className="short" /><b><Trophy size={13} /></b></div>
          <Sparkles className="banner-opportunity-spark" size={22} />
        </div>
      </section>

      <section className="trust-section content-width grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="trust-intro col-span-2 lg:col-span-1"><span className="eyebrow">DIBANGUN BERSAMA</span><h2>Komunitas yang<br />saling <span className="community-highlight">membuka jalan.</span></h2><p>Setiap informasi melewati proses verifikasi agar kesempatan yang kamu temukan lebih terpercaya.</p></div>
        <div className="trust-item">
          <span className="trust-icon trust-purple"><UsersRound size={21} /></span>
          <div className="trust-copy"><strong>Dari komunitas</strong><p>Peluang dibagikan oleh banyak orang.</p></div>
        </div>
        <div className="trust-item">
          <span className="trust-icon trust-blue"><ShieldCheck size={21} /></span>
          <div className="trust-copy"><strong>Diverifikasi moderator</strong><p>Informasi ditinjau sebelum ditayangkan.</p></div>
        </div>
        <div className="trust-item">
          <span className="trust-icon trust-green"><Layers3 size={21} /></span>
          <div className="trust-copy"><strong>Untuk semua</strong><p>Dari daerah hingga tingkat internasional.</p></div>
        </div>
      </section>
    </main>
  );
}
