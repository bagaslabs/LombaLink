import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Award, ChevronLeft, ChevronRight, Sparkles, Trophy, UserRoundPlus } from "lucide-react";
import { CompetitionCard } from "../components.jsx";
import { defaultPreferences } from "../data.js";
import { hasRegistrationAvailable, matchesCompetitionLevel, matchesTargetParticipant, recommendationTopicScore } from "../recommendationMatching.js";
import recommendationTrophy from "../assets/recommendation-trophy-transparent.png";

const recommendationsPerPage = 4;

function matchesPreferences(preferences, item) {
  const categories = Array.isArray(preferences.categories)
    ? preferences.categories
    : preferences.category ? [preferences.category] : [];
  if (categories.length && !categories.some((category) => recommendationTopicScore(category, item) > 0)) return false;
  return matchesCompetitionLevel(preferences.level || preferences.locationScope || "", item)
    && matchesTargetParticipant(preferences.targetParticipant || "", item);
}

function recommendationScore(preferences, item) {
  const categories = Array.isArray(preferences.categories)
    ? preferences.categories
    : preferences.category ? [preferences.category] : [];
  const topicScore = categories.reduce((score, category) => score + recommendationTopicScore(category, item), 0);
  return topicScore
    + (preferences.level || preferences.locationScope ? 2 : 0)
    + (preferences.targetParticipant ? 1 : 0);
}

export default function RecommendationsPage({
  account,
  navigate,
  onRequireAccount,
  competitions,
  competitionsLoading,
  competitionsError,
  onShowAllCompetitions,
}) {
  const [page, setPage] = useState(() => Math.max(1, Number(window.history.state?.lombalinkRecommendationsPage) || 1));
  const preferences = account?.preferences || defaultPreferences;
  const hasPreferences = Boolean((preferences.categories || []).length || preferences.category?.trim() || preferences.level || preferences.locationScope || preferences.targetParticipant);
  const recommendations = useMemo(() => {
    if (!account || !hasPreferences) return [];
    const scoredCompetitions = competitions
      .filter((item) => hasRegistrationAvailable(item) && matchesPreferences(preferences, item))
      .map((item, index) => ({ item, index, score: recommendationScore(preferences, item) }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    return scoredCompetitions.map(({ item }) => item);
  }, [account, competitions, hasPreferences, preferences]);
  const pageCount = Math.ceil(recommendations.length / recommendationsPerPage);
  const visibleRecommendations = recommendations.slice(
    (page - 1) * recommendationsPerPage,
    page * recommendationsPerPage,
  );

  useEffect(() => {
    if (competitionsLoading) return;
    setPage((currentPage) => Math.min(currentPage, Math.max(pageCount, 1)));
  }, [competitionsLoading, pageCount]);

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, lombalinkRecommendationsPage: page }, "", window.location.href);
  }, [page]);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.history.replaceState({ ...window.history.state, lombalinkRecommendationsPage: nextPage }, "", window.location.href);
    document.getElementById("rekomendasi")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  let results;
  if (competitionsLoading) {
    results = <div className="empty-results" role="status"><span><Sparkles size={23} /></span><h3>Memuat rekomendasi</h3><p>Mengambil informasi lomba yang tersedia.</p></div>;
  } else if (competitionsError) {
    results = <div className="empty-results" role="alert"><span><Sparkles size={23} /></span><h3>Rekomendasi tidak dapat dimuat</h3><p>{competitionsError}</p></div>;
  } else if (!account) {
    results = (
      <div className="recommendations-guest-prompt">
        <Award className="recommendations-guest-decoration recommendations-guest-decoration-left" size={76} aria-hidden="true" />
        <Trophy className="recommendations-guest-decoration recommendations-guest-decoration-right" size={112} aria-hidden="true" />
        <div className="recommendations-guest-content">
          <div className="recommendations-trophy-art" aria-hidden="true">
            <img src={recommendationTrophy} alt="" />
          </div>
          <h3>Rekomendasi untukmu</h3>
          <p>Masuk atau daftar sekarang untuk mendapatkan rekomendasi lomba yang sesuai dengan minat, jenjang, dan profilmu.</p>
          <button className="recommendations-login-button" type="button" onClick={() => onRequireAccount(true)}>
            <UserRoundPlus size={21} />
            <span>Masuk atau Daftar</span>
            <ArrowRight size={22} />
          </button>
        </div>
      </div>
    );
  } else if (!hasPreferences) {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Atur minat lombamu</h3><p>Pilih satu atau beberapa bidang minat dan tingkatan lomba untuk mendapatkan rekomendasi.</p><button className="button button-primary" onClick={() => navigate("/personalization")}>Atur personalisasi <ArrowRight size={15} /></button></div>;
  } else if (recommendations.length) {
    results = <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{visibleRecommendations.map((item) => <CompetitionCard key={item.id} item={item} onDetails={() => navigate(`/kompetisi/${encodeURIComponent(item.id)}`)} />)}</div>;
  } else {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Belum ada rekomendasi yang cocok</h3><p>Belum ada lomba yang sesuai preferensimu dan pendaftarannya masih tersedia. Coba sesuaikan personalisasi atau lihat semua lomba.</p><button className="button button-outline" onClick={onShowAllCompetitions}>Cari semua lomba <ArrowRight size={15} /></button></div>;
  }

  return (
    <section className="discovery-page content-width" id="rekomendasi" aria-labelledby="recommendations-heading">
      <header className="discovery-heading">
        <span className="eyebrow recommendations-kicker">PILIHAN LOMBA</span>
        <h2 id="recommendations-heading">Rekomendasi <span>Lomba</span><Sparkles className="recommendations-title-spark" size={25} aria-hidden="true" /></h2>
        <p>Temukan kompetisi yang paling sesuai dengan minat dan profilmu.</p>
      </header>
      <section className="discovery-results">
        {account && hasPreferences && !competitionsLoading && !competitionsError && <p className="discovery-result-count">{recommendations.length} rekomendasi untukmu.</p>}
        {results}
        {account && hasPreferences && !competitionsLoading && !competitionsError && pageCount > 1 && (
          <nav className="search-pagination" aria-label="Halaman rekomendasi lomba">
            <span>Menampilkan {(page - 1) * recommendationsPerPage + 1}–{Math.min(page * recommendationsPerPage, recommendations.length)} dari {recommendations.length} lomba</span>
            <div className="search-pagination-controls">
              <button className="button button-outline button-small" type="button" aria-label="Rekomendasi sebelumnya" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                <ChevronLeft size={16} /> Sebelumnya
              </button>
              <span className="search-pagination-current">{page} / {pageCount}</span>
              <button className="button button-outline button-small" type="button" aria-label="Rekomendasi berikutnya" disabled={page === pageCount} onClick={() => goToPage(page + 1)}>
                Berikutnya <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}
      </section>
    </section>
  );
}
