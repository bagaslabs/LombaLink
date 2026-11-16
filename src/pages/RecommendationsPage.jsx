import React, { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { CompetitionCard } from "../components.jsx";
import { defaultPreferences } from "../data.js";

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
  const hasPreferences = Object.values(preferences).some((value) => value.trim());
  const recommendations = useMemo(() => {
    if (!account || !hasPreferences) return [];
    return competitions.filter((item) => (
      (!preferences.category || item.category === preferences.category)
      && (!preferences.mode || item.mode === preferences.mode)
      && (!preferences.education || item.targetParticipants?.includes(preferences.education) || item.education === preferences.education)
      && (!preferences.feeType || item.feeType === preferences.feeType)
      && (!preferences.locationScope || (preferences.locationScope === "Nasional"
        ? item.scope === "Nasional"
        : item.scope !== "Nasional"
          && [preferences.city, preferences.province].filter(Boolean).every((place) => (
            String(item.location || "").toLocaleLowerCase("id-ID").includes(place.toLocaleLowerCase("id-ID"))
          ))))
    ));
  }, [account, competitions, hasPreferences, preferences]);

  let results;
  if (competitionsLoading) {
    results = <div className="empty-results" role="status"><span><Sparkles size={23} /></span><h3>Memuat rekomendasi</h3><p>Mengambil informasi lomba yang tersedia.</p></div>;
  } else if (competitionsError) {
    results = <div className="empty-results" role="alert"><span><Sparkles size={23} /></span><h3>Rekomendasi tidak dapat dimuat</h3><p>{competitionsError}</p></div>;
  } else if (!account) {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Rekomendasi untukmu</h3><p>Masuk dan atur minatmu agar kami bisa mencarikan lomba yang sesuai.</p><button className="button button-primary" onClick={() => onRequireAccount(false, true)}>Masuk atau daftar <ArrowRight size={15} /></button></div>;
  } else if (!hasPreferences) {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Atur minat lombamu</h3><p>Pilih bidang, mode, lokasi, jenjang, atau biaya yang kamu inginkan untuk mendapatkan rekomendasi.</p><button className="button button-primary" onClick={() => navigate("/personalization")}>Atur personalisasi <ArrowRight size={15} /></button></div>;
  } else if (recommendations.length) {
    results = <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{recommendations.map((item) => <CompetitionCard key={item.id} item={item} onDetails={() => navigate(`/kompetisi/${encodeURIComponent(item.id)}`)} />)}</div>;
  } else {
    results = <div className="empty-results"><span><Sparkles size={23} /></span><h3>Belum ada rekomendasi yang cocok</h3><p>Coba sesuaikan minatmu atau lihat semua lomba.</p><button className="button button-outline" onClick={onShowAllCompetitions}>Cari semua lomba <ArrowRight size={15} /></button></div>;
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
