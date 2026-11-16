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
  ["pramuka", "scout", "scouting", "kepramukaan"],
];

export function normalizeRecommendationText(value) {
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

export function recommendationTopicScore(interest, item) {
  if (!interest) return 0;
  const interestText = normalizeRecommendationText(interest);
  const itemFields = [item.category, item.competitionType, item.title, item.description, ...(item.keywords || [])]
    .map(normalizeRecommendationText)
    .filter(Boolean);
  if (itemFields.some((field) => containsPhrase(field, interestText))) return 6;

  const group = interestGroups.find((terms) => terms.some((term) => containsPhrase(interestText, normalizeRecommendationText(term))));
  if (group && itemFields.some((field) => group.some((term) => containsPhrase(field, normalizeRecommendationText(term))))) return 5;

  const interestWords = interestText.split(" ").filter((word) => word.length > 3);
  if (interestWords.length < 2) return 0;
  const matchingWords = interestWords.filter((word) => itemFields.some((field) => containsPhrase(field, word)));
  return matchingWords.length >= Math.ceil(interestWords.length / 2) ? 3 : 0;
}

export function hasRegistrationAvailable(item, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const batches = Array.isArray(item.registrationBatches) ? item.registrationBatches : [];
  if (batches.length) {
    return batches.some((batch) => /^\d{4}-\d{2}-\d{2}$/.test(batch.endsAt || "") && batch.endsAt >= today);
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(item.deadline || "") && item.deadline >= today;
}

const competitionLevelRank = {
  "kabupaten kota": 1,
  daerah: 1,
  provinsi: 2,
  nasional: 3,
  internasional: 4,
};

export function matchesCompetitionLevel(preference, item) {
  if (!preference) return true;
  const preferredRank = competitionLevelRank[normalizeRecommendationText(preference)];
  const competitionRank = competitionLevelRank[normalizeRecommendationText(item.scope)];
  return Boolean(preferredRank && competitionRank && competitionRank >= preferredRank);
}
