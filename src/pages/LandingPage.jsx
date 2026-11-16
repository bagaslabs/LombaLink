import React, { useLayoutEffect } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
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
        account={account}
        navigate={navigate}
        onRequireAccount={onRequireAccount}
        competitions={competitions}
        competitionsLoading={competitionsLoading}
        competitionsError={competitionsError}
        categoryOptions={categoryOptions}
        renderLayout={({ searchControls, searchResults }) => (
          <>
            <section className="hero-section landing-top-section">
              <div className="hero-grid">
                <div className="hero-copy">
                  <div className="hero-badge"><span className="badge-spark"><Sparkles size={13} /></span> Ruang tumbuh untuk setiap potensi</div>
                  <h1>Kesempatan hebat<br />dimulai dari <span>sini.</span></h1>
                  <p className="hero-description">Temukan kompetisi yang tepat untukmu. Dari ruang kelas hingga panggung dunia, semua peluang ada di satu tempat.</p>
                  <div className="hero-actions">
                    <button className="button button-primary" data-guest-access onClick={() => scrollToSection("cari")}>Cari lomba <ArrowRight size={16} /></button>
                    <button className="button button-outline" data-guest-access onClick={() => scrollToSection("rekomendasi")}>Lihat rekomendasi</button>
                  </div>
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
        <div className="banner-art"><div className="banner-ring"></div><div className="banner-star">✦</div><Trophy size={58} /></div>
        <div className="banner-copy">
          <span className="eyebrow">TENTANG LOMBALINK</span>
          <h2>Satu informasi bisa<br />membuka banyak jalan.</h2>
          <p>LombaLink membantu peserta menemukan peluang, sekaligus membantu penyelenggara membagikan lomba yang terpercaya.</p>
          {account?.role !== "participant" && <button className="button button-white" onClick={() => account ? onSubmit() : onRequireAccount(true)}>Tambah Lomba <ArrowRight size={16} /></button>}
        </div>
      </section>

      <section className="trust-section content-width grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="trust-intro col-span-2 lg:col-span-1"><span className="eyebrow">DIBANGUN BERSAMA</span><h2>Komunitas yang<br />saling membuka jalan.</h2><p>Setiap informasi melewati proses verifikasi agar kesempatan yang kamu temukan lebih terpercaya.</p></div>
        <div className="trust-item"><span className="trust-icon trust-blue"><ShieldCheck size={21} /></span><strong>Diverifikasi moderator</strong><p>Informasi ditinjau sebelum ditayangkan.</p></div>
        <div className="trust-item"><span className="trust-icon trust-purple"><UsersRound size={21} /></span><strong>Dari komunitas</strong><p>Peluang dibagikan oleh banyak orang.</p></div>
        <div className="trust-item"><span className="trust-icon trust-green"><Globe2 size={21} /></span><strong>Untuk semua</strong><p>Dari daerah hingga tingkat internasional.</p></div>
      </section>
    </main>
  );
}
