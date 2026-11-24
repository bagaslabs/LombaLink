import React, { useMemo } from "react";
import { ArrowLeft, ArrowRight, GraduationCap, LayoutGrid, Trophy, UsersRound } from "lucide-react";
import { CompetitionDetails } from "../components.jsx";

export default function CompetitionDetailPage({
  item,
  competitions,
  account,
  navigate,
  onTrackEvent,
  onReport,
}) {
  const recommendations = useMemo(() => {
    const keywords = new Set(item.keywords || []);
    return competitions
      .filter((competition) => competition.id !== item.id)
      .map((competition, index) => ({
        competition,
        index,
        score: (competition.category === item.category ? 3 : 0)
          + (competition.education === item.education ? 2 : 0)
          + (competition.scope === item.scope ? 1 : 0)
          + (competition.keywords || []).filter((keyword) => keywords.has(keyword)).length,
      }))
      .sort((first, second) => second.score - first.score || first.index - second.index)
      .slice(0, 5)
      .map(({ competition }) => competition);
  }, [competitions, item]);

  const openCompetition = (competition) => navigate(`/kompetisi/${encodeURIComponent(competition.id)}`);

  return (
    <main className="competition-detail-page">
      <div className="competition-detail-layout">
        <aside className="competition-recommendations" aria-labelledby="competition-recommendations-heading">
          <div className="competition-recommendations-heading">
            <span className="eyebrow">JELAJAHI PELUANG</span>
            <h2 id="competition-recommendations-heading">Lomba <span>lainnya</span></h2>
            <p>Kesempatan lain yang mungkin cocok untukmu.</p>
          </div>
          {recommendations.length
            ? <div className="competition-recommendation-list">
              {recommendations.map((competition) => (
                <button className="competition-recommendation-card" key={competition.id} type="button" onClick={() => openCompetition(competition)}>
                  <span className="competition-recommendation-cover">
                    {competition.coverUrl ? <img src={competition.coverUrl} alt="" /> : <Trophy size={18} />}
                  </span>
                  <span className="competition-recommendation-copy">
                    <strong>{competition.title}</strong>
                    <span className="competition-recommendation-meta">
                      {competition.category && <span><GraduationCap size={17} />{competition.category}</span>}
                      {competition.education && <span className="competition-recommendation-audience"><UsersRound size={17} />{competition.education}</span>}
                    </span>
                  </span>
                  <span className="competition-recommendation-arrow"><ArrowRight size={20} /></span>
                </button>
              ))}
            </div>
            : <p className="competition-recommendation-empty">Belum ada lomba lainnya.</p>}
          <button className="button button-outline competition-recommendation-all" type="button" onClick={() => navigate("/cari")}>
            <LayoutGrid size={18} />
            Cari lomba lainnya
            <ArrowRight size={18} />
          </button>
        </aside>

        <article className="competition-detail-main" aria-labelledby="detail-title">
          <button className="button button-quiet competition-detail-back" type="button" onClick={() => navigate("/cari")}>
            <ArrowLeft size={15} /> Semua lomba
          </button>
          <CompetitionDetails
            item={item}
            onTrackEvent={onTrackEvent}
            onReport={onReport}
            isLoggedIn={Boolean(account)}
            onRequireLogin={() => navigate("/login")}
          />
        </article>
      </div>
    </main>
  );
}
