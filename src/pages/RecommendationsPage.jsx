import React, { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { CompetitionCard } from "../components.jsx";
import { defaultPreferences } from "../data.js";

const interestGroups = [
  ["pemrograman", "programming", "coding", "koding", "hackathon", "hackaton", "software", "perangkat lunak", "developer", "aplikasi", "web", "informatika"],
  ["teknologi", "technology", "digital", "informatika", "pemrograman", "programming", "coding", "hackathon", "robotik", "robotika", "kecerdasan buatan", "artificial intelligence", "ai", "internet of things", "iot"],
  ["data science", "analisis data", "data", "statistika", "machine learning", "pembelajaran mesin", "kecerdasan buatan", "artificial intelligence", "ai"],
  ["keamanan siber", "cybersecurity", "cyber security", "keamanan jaringan", "kriptografi", "digital forensics"],
  ["game development", "game", "gim", "esport", "e sport", "e sports"],
  ["sains", "science", "fisika", "kimia", "biologi", "lingkungan", "robotik", "robotika"],
  ["matematika", "mathematics", "math", "olimpiade matematika", "statistika"],
  ["esai", "karya tulis", "menulis", "literasi", "jurnalistik", "paper", "artikel"],
  ["desain", "design", "kreativitas", "ilustrasi", "poster", "fotografi", "videografi", "animasi"],
  ["ui ux", "ui", "ux", "user interface", "user experience", "desain grafis", "ilustrasi", "poster", "animasi"],
  ["bisnis", "business", "ekonomi", "entrepreneurship", "kewirausahaan", "startup", "pitching"],
  ["seni", "budaya", "musik", "tari", "teater", "pertunjukan", "sastra"],
  ["olahraga", "sport", "atletik", "e-sport", "esport", "futsal", "basket", "sepak bola"],
  ["lingkungan", "energi terbarukan", "iklim", "konservasi", "keberlanjutan", "sustainability"],
  ["kesehatan", "kedokteran", "medis", "keperawatan", "farmasi", "bioteknologi"],
  ["pertanian", "pangan", "agrikultur", "agroteknologi", "peternakan", "perikanan"],
  ["arsitektur", "tata ruang", "perencanaan kota", "desain bangunan"],
  ["pendidikan", "edukasi", "pedagogi", "teaching", "learning"],
  ["bahasa", "sastra", "literatur", "linguistik", "puisi", "cerpen"],
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

function interestMatchScore(interest, item) {
  if (!interest) return 0;
  const interestText = normalizeText(interest);
  const itemFields = [item.category, item.competitionType, item.title, item.description, ...(item.keywords || [])]
    .map(normalizeText)
    .filter(Boolean);
  if (itemFields.some((field) => containsPhrase(field, interestText))) return 6;

  const group = interestGroups.find((terms) => terms.some((term) => containsPhrase(interestText, normalizeText(term))));
  if (group && itemFields.some((field) => group.some((term) => containsPhrase(field, normalizeText(term))))) return 5;

  const interestWords = interestText.split(" ").filter((word) => word.length > 3);
  return interestWords.length && itemFields.some((field) => interestWords.some((word) => field.includes(word))) ? 3 : 0;
}

function locationMatch(preferences, item) {
  const location = normalizeText(item.location);
  if (preferences.locationScope === "Nasional") return item.scope === "Nasional";
  if (preferences.locationScope === "Provinsi") {
    return item.scope === "Provinsi" && location.includes(normalizeText(preferences.province));
  }
  if (preferences.locationScope === "Kabupaten/Kota") {
    return ["Kabupaten/Kota", "Daerah"].includes(item.scope) && location.includes(normalizeText(preferences.city));
  }
  return false;
}

function recommendationScore(preferences, item) {
  let score = interestMatchScore(preferences.category, item);
  if (preferences.mode && item.mode === preferences.mode) score += 2;
  if (preferences.education && (item.targetParticipants?.includes(preferences.education) || item.education === preferences.education)) score += 2;
  if (preferences.feeType && item.feeType === preferences.feeType) score += 1;
  if (preferences.locationScope && locationMatch(preferences, item)) score += 2;
  return score;
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
  const hasPreferences = Object.values(preferences).some((value) => value.trim());
  const recommendations = useMemo(() => {
    if (!account || !hasPreferences) return [];
    const scoredCompetitions = competitions
      .map((item, index) => ({ item, index, score: recommendationScore(preferences, item) }))
      .filter(({ score }) => score > 0)
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
