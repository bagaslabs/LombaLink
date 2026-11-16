import React, { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { CompetitionCard } from "../components.jsx";
import { defaultPreferences } from "../data.js";
import { hasRegistrationAvailable, matchesCompetitionLevel, recommendationTopicScore } from "../recommendationMatching.js";

function matchesPreferences(preferences, item) {
  const categories = Array.isArray(preferences.categories)
    ? preferences.categories
    : preferences.category ? [preferences.category] : [];
  if (categories.length && !categories.some((category) => recommendationTopicScore(category, item) > 0)) return false;
  return matchesCompetitionLevel(preferences.level || preferences.locationScope || "", item);
}

function recommendationScore(preferences, item) {
  const categories = Array.isArray(preferences.categories)
    ? preferences.categories
    : preferences.category ? [preferences.category] : [];
  const topicScore = categories.reduce((score, category) => score + recommendationTopicScore(category, item), 0);
  return topicScore + (preferences.level || preferences.locationScope ? 2 : 0);
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
  const preferences = account?.preferences || defaultPreferences;
  const hasPreferences = Boolean((preferences.categories || []).length || preferences.category?.trim() || preferences.level || preferences.locationScope);
  const recommendations = useMemo(() => {
    if (!account || !hasPreferences) return [];
    const scoredCompetitions = competitions
      .filter((item) => hasRegistrationAvailable(item) && matchesPreferences(preferences, item))
      .map((item, index) => ({ item, index, score: recommendationScore(preferences, item) }))
      .sort((left, right) => right.score - left.score || left.index - right.index);
    return scoredCompetitions.map(({ item }) => item);
  }, [account, competitions, hasPreferences, preferences]);

  let results;
  if (competitionsLoading) {
    results = <div className="empty-results" role="status"><span><Sparkles size={23} /></span><h3>Memuat rekomendasi</h3><p>Mengambil informasi lomba yang tersedia.</p></div>;
  } else if (competitionsError) {
    results = <div className="empty-results" role="alert"><span><Sparkles size={23} /></span><h3>Rekomendasi tidak dapat dimuat</h3><p>{competitionsError}</p></div>;
  } else if (!account) {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Rekomendasi untukmu</h3><p>Masuk dan atur minatmu agar kami bisa mencarikan lomba yang sesuai.</p><button className="button button-primary" onClick={() => onRequireAccount(false, true)}>Masuk atau daftar <ArrowRight size={15} /></button></div>;
  } else if (!hasPreferences) {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Atur minat lombamu</h3><p>Pilih satu atau beberapa bidang minat dan tingkatan lomba untuk mendapatkan rekomendasi.</p><button className="button button-primary" onClick={() => navigate("/personalization")}>Atur personalisasi <ArrowRight size={15} /></button></div>;
  } else if (recommendations.length) {
    results = <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{recommendations.map((item) => <CompetitionCard key={item.id} item={item} onDetails={() => navigate(`/kompetisi/${encodeURIComponent(item.id)}`)} />)}</div>;
  } else {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Belum ada rekomendasi yang cocok</h3><p>Belum ada lomba yang sesuai preferensimu dan pendaftarannya masih tersedia. Coba sesuaikan personalisasi atau lihat semua lomba.</p><button className="button button-outline" onClick={onShowAllCompetitions}>Cari semua lomba <ArrowRight size={15} /></button></div>;
  }

  return (
    <section className="discovery-page content-width" id="rekomendasi" aria-labelledby="recommendations-heading">
      <header className="discovery-heading">
        <span className="eyebrow">SESUAI MINATMU</span>
        <h2 id="recommendations-heading">Rekomendasi lomba</h2>
        <p>Temukan kesempatan yang paling sesuai dengan preferensi pilihanmu.</p>
      </header>
      <section className="discovery-results">
        {account && hasPreferences && !competitionsLoading && !competitionsError && <p className="discovery-result-count">{recommendations.length} rekomendasi untukmu.</p>}
        {results}
      </section>
    </section>
  );
}
