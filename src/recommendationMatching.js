const interestGroups = [
  ["pemrograman", "programming", "coding", "koding", "hackathon", "hackaton", "software", "perangkat lunak", "developer", "aplikasi", "web", "informatika", "ilmu komputer", "computer science", "rekayasa perangkat lunak", "software engineering", "algoritma", "algorithm", "competitive programming", "pemrograman kompetitif", "struktur data", "basis data", "database", "backend", "frontend", "full stack", "pengembangan web", "web development", "pengembangan aplikasi", "mobile development", "android", "ios", "javascript", "python", "java", "c++", "open source", "sistem informasi", "cloud computing", "komputasi awan"],
  ["teknologi", "technology", "digital", "informatika", "pemrograman", "programming", "coding", "hackathon", "robotik", "robotika", "kecerdasan buatan", "artificial intelligence", "ai", "internet of things", "iot", "transformasi digital", "teknologi informasi", "information technology", "it", "komputasi", "computing", "otomasi", "automation", "teknologi pendidikan", "edtech", "fintech", "healthtech", "smart city", "teknologi tepat guna", "inovasi teknologi", "digitalisasi", "jaringan komputer", "networking", "telekomunikasi", "embedded system", "sistem tertanam", "elektronika digital", "maker", "arduino", "raspberry pi"],
  ["data science", "analisis data", "data", "statistika", "machine learning", "pembelajaran mesin", "kecerdasan buatan", "artificial intelligence", "ai", "sains data", "data analytics", "analitik data", "big data", "data mining", "visualisasi data", "data visualization", "deep learning", "pembelajaran mendalam", "natural language processing", "nlp", "computer vision", "pemrosesan bahasa alami", "predictive analytics", "business intelligence", "business analytics", "kecerdasan bisnis", "model prediksi", "statistical modeling", "pemodelan statistik", "generative ai", "ai generatif", "large language model", "llm", "neural network", "jaringan saraf"],
  ["keamanan siber", "cybersecurity", "cyber security", "keamanan jaringan", "kriptografi", "digital forensics", "keamanan informasi", "information security", "infosec", "ethical hacking", "peretasan etis", "penetration testing", "pentest", "capture the flag", "ctf", "forensik digital", "digital forensik", "keamanan aplikasi", "application security", "network security", "security operation", "soc", "malware", "ransomware", "enkripsi", "privasi data", "perlindungan data", "bug bounty"],
  ["game development", "game", "gim", "esport", "e sport", "e sports", "pengembangan game", "pengembangan gim", "game design", "desain game", "game programming", "game art", "game jam", "mobile game", "video game", "permainan digital", "kompetisi gaming", "gaming", "turnamen gim", "game developer", "level design", "virtual reality", "vr", "augmented reality", "ar", "mixed reality", "xr"],
  ["sains", "science", "fisika", "kimia", "biologi", "lingkungan", "robotik", "robotika", "ilmu pengetahuan", "riset sains", "penelitian ilmiah", "olimpiade sains", "karya ilmiah", "eksperimen", "eksperimental", "metode ilmiah", "inovasi ilmiah", "astronomi", "geologi", "geografi", "mikrobiologi", "bioteknologi", "neurosains", "ilmu bumi", "earth science", "sains terapan", "applied science", "sains murni", "pure science"],
  ["matematika", "mathematics", "math", "olimpiade matematika", "statistika", "matematika terapan", "applied mathematics", "matematika diskrit", "aljabar", "algebra", "geometri", "geometry", "kalkulus", "calculus", "teori bilangan", "number theory", "kombinatorika", "combinatorics", "logika matematika", "mathematical logic", "peluang", "probabilitas", "probability", "pemodelan matematika", "mathematical modeling", "kuantitatif", "quantitative"],
  ["esai", "karya tulis", "menulis", "literasi", "jurnalistik", "paper", "artikel", "penulisan", "writing", "essay", "creative writing", "penulisan kreatif", "opini", "artikel ilmiah", "jurnal ilmiah", "makalah", "karya ilmiah", "penelitian", "research", "proposal penelitian", "review buku", "resensi", "cerpen", "cerita pendek", "novel", "puisi", "sastra tulis", "copywriting", "editorial", "publikasi"],
  ["desain", "design", "kreativitas", "ilustrasi", "poster", "fotografi", "videografi", "animasi", "desain grafis", "graphic design", "komunikasi visual", "desain komunikasi visual", "dkv", "branding", "identitas visual", "visual identity", "tipografi", "typography", "ilustrator", "digital art", "seni digital", "desain produk", "product design", "desain industri", "industrial design", "desain kemasan", "packaging design", "desain interior", "interior design", "fashion design", "desain busana", "motion graphic", "motion graphics", "3d modeling", "3d design", "rendering", "sketsa", "craft", "kerajinan"],
  ["ui ux", "ui", "ux", "user interface", "user experience", "desain grafis", "ilustrasi", "poster", "animasi", "desain antarmuka", "pengalaman pengguna", "antarmuka pengguna", "usability", "aksesibilitas digital", "digital accessibility", "interaction design", "desain interaksi", "wireframe", "prototyping", "prototype", "prototipe", "product experience", "human computer interaction", "hci", "service design", "desain layanan", "design thinking", "figma"],
  ["bisnis", "business", "ekonomi", "entrepreneurship", "kewirausahaan", "startup", "pitching", "business plan", "rencana bisnis", "model bisnis", "business model", "studi kelayakan", "feasibility study", "inovasi bisnis", "social enterprise", "bisnis sosial", "kompetisi bisnis", "business case", "case competition", "manajemen", "management", "strategi bisnis", "business strategy", "rantai pasok", "supply chain", "operasional", "operations", "perdagangan", "trade", "koperasi", "entrepreneur", "wirausaha"],
  ["seni", "budaya", "musik", "tari", "teater", "pertunjukan", "sastra", "seni rupa", "fine arts", "seni pertunjukan", "performing arts", "vokal", "menyanyi", "paduan suara", "choir", "instrumental", "alat musik", "komposisi musik", "music composition", "koreografi", "choreography", "tari tradisional", "tari modern", "drama", "akting", "acting", "film", "perfilman", "sinematografi", "cinematography", "video pendek", "short film", "film pendek", "animasi", "ilustrasi", "kaligrafi", "mural", "lukis", "melukis", "seni tradisi", "kebudayaan", "warisan budaya", "cultural heritage"],
  ["olahraga", "sport", "atletik", "e-sport", "esport", "futsal", "basket", "sepak bola", "football", "soccer", "badminton", "bulu tangkis", "voli", "volleyball", "renang", "swimming", "lari", "maraton", "pencak silat", "karate", "taekwondo", "judo", "panahan", "archery", "catur", "chess", "tenis", "tennis", "tenis meja", "table tennis", "pingpong", "senam", "gymnastics", "bela diri", "martial arts", "balap", "cycling", "bersepeda", "olahraga rekreasi", "sport science", "kepelatihan", "coaching", "kebugaran", "fitness"],
  ["lingkungan", "energi terbarukan", "iklim", "konservasi", "keberlanjutan", "sustainability", "perubahan iklim", "climate change", "pemanasan global", "global warming", "lingkungan hidup", "environment", "environmental science", "ilmu lingkungan", "ekologi", "ecology", "biodiversitas", "biodiversity", "keanekaragaman hayati", "pengelolaan sampah", "waste management", "daur ulang", "recycling", "ekonomi sirkular", "circular economy", "energi bersih", "clean energy", "energi surya", "solar energy", "energi angin", "wind energy", "energi hijau", "green technology", "sustainable development", "pembangunan berkelanjutan", "sdgs", "tujuan pembangunan berkelanjutan", "mitigasi bencana", "pengurangan emisi", "carbon footprint", "jejak karbon"],
  ["kesehatan", "kedokteran", "medis", "keperawatan", "farmasi", "bioteknologi", "health", "medical", "medicine", "nursing", "pharmacy", "kesehatan masyarakat", "public health", "gizi", "nutrition", "nutrisi", "kesehatan mental", "mental health", "psikologi klinis", "kesehatan digital", "digital health", "telemedicine", "epidemiologi", "epidemiology", "kesehatan lingkungan", "biomedis", "biomedical", "ilmu kesehatan", "medical science", "pertolongan pertama", "first aid", "kesehatan remaja", "reproductive health", "kesehatan reproduksi", "alat kesehatan", "medical device", "farmakologi", "pharmacology", "laboratorium medis", "clinical research"],
  ["pertanian", "pangan", "agrikultur", "agroteknologi", "peternakan", "perikanan", "agriculture", "agricultural", "agronomi", "agronomy", "hortikultura", "horticulture", "perkebunan", "kehutanan", "forestry", "budidaya tanaman", "tanaman pangan", "ketahanan pangan", "food security", "food technology", "teknologi pangan", "ilmu pangan", "food science", "peternakan", "livestock", "veteriner", "veterinary", "kedokteran hewan", "aquaculture", "akuakultur", "budidaya ikan", "perikanan", "fisheries", "pascapanen", "post harvest", "agribisnis", "agribusiness", "pertanian presisi", "precision agriculture", "hidroponik", "urban farming", "pertanian perkotaan", "pangan berkelanjutan"],
  ["arsitektur", "tata ruang", "perencanaan kota", "desain bangunan", "architecture", "arsitek", "architect", "urban planning", "urban design", "perencanaan wilayah", "planologi", "landscape architecture", "arsitektur lanskap", "desain interior", "interior architecture", "konstruksi", "construction", "bangunan", "building design", "permukiman", "housing", "smart city", "kota berkelanjutan", "sustainable city"],
  ["teknik", "engineering", "rekayasa", "teknik mesin", "mechanical engineering", "teknik elektro", "electrical engineering", "teknik sipil", "civil engineering", "teknik kimia", "chemical engineering", "teknik industri", "industrial engineering", "teknik komputer", "computer engineering", "teknik biomedis", "biomedical engineering", "mekatronika", "mechatronics", "otomotif", "automotive", "dirgantara", "aerospace", "teknik material", "materials engineering", "teknik lingkungan", "environmental engineering", "elektronika", "electronics", "desain rekayasa", "engineering design", "inovasi rekayasa", "teknologi manufaktur", "manufacturing", "cad", "prototipe", "prototyping"],
  ["pendidikan", "edukasi", "pedagogi", "teaching", "learning", "education", "educational", "pengajaran", "pembelajaran", "teknologi pendidikan", "education technology", "edtech", "media pembelajaran", "kurikulum", "curriculum", "inovasi pembelajaran", "literasi digital", "pendidikan inklusif", "inclusive education", "pendidikan anak", "pendidikan dasar", "pendidikan tinggi", "student research", "teacher innovation", "kompetensi guru"],
  ["bahasa", "sastra", "literatur", "linguistik", "puisi", "cerpen", "language", "literature", "linguistics", "bahasa indonesia", "bahasa inggris", "english", "arab", "mandarin", "jepang", "korea", "jerman", "prancis", "penerjemahan", "translation", "debat bahasa", "pidato bahasa", "speech", "storytelling", "mendongeng", "fonologi", "tata bahasa", "grammar", "literasi bahasa", "language learning", "bahasa daerah", "local language"],
  ["pramuka", "scout", "scouting", "kepramukaan", "kepanduan", "pionering", "sandi", "jelajah alam", "orientering", "keterampilan pramuka", "scout skill", "bina diri", "bina satuan"],
  ["kimia", "chemistry", "olimpiade kimia", "chemical", "kimia analitik", "analytical chemistry", "kimia organik", "organic chemistry", "kimia anorganik", "inorganic chemistry", "kimia fisik", "physical chemistry", "biokimia", "biochemistry", "kimia material", "material chemistry", "sintesis", "chemical synthesis", "katalis", "catalysis", "polimer", "polymer science", "kimia lingkungan", "green chemistry", "kimia hijau"],
  ["biologi", "biology", "olimpiade biologi", "biologi molekuler", "molecular biology", "genetika", "genetics", "mikrobiologi", "microbiology", "zoologi", "zoology", "botani", "botany", "ekologi", "ecology", "evolusi", "evolution", "biologi laut", "marine biology", "bioteknologi", "biotechnology", "bioinformatika", "bioinformatics", "biologi sel", "cell biology", "neurosains", "neuroscience", "anatomi", "anatomy", "fisiologi", "physiology"],
  ["fisika", "physics", "olimpiade fisika", "fisika terapan", "applied physics", "mekanika", "mechanics", "termodinamika", "thermodynamics", "optika", "optics", "elektromagnetik", "electromagnetism", "fisika kuantum", "quantum physics", "astrofisika", "astrophysics", "akustik", "acoustics", "fisika material", "material physics", "instrumentasi", "instrumentation"],
  ["astronomi", "astronomy", "astronomi dan astrofisika", "antariksa", "space science", "ilmu antariksa", "observasi langit", "tata surya", "planet", "eksplorasi ruang angkasa", "space exploration", "roket", "rocket science", "satelit", "satellite", "astrofotografi", "astrophotography"],
  ["esai", "debat", "debate", "public speaking", "pidato", "speech competition", "orasi", "retorika", "rhetoric", "model united nations", "mun", "diplomasi", "diplomacy", "negosiasi", "negotiation", "parlemen remaja", "forum diskusi", "diskusi publik", "storytelling", "presentasi", "presenting", "komunikasi", "communication", "master of ceremony", "mc", "speech and debate"],
  ["sosiologi", "sociology", "antropologi", "anthropology", "psikologi", "psychology", "sejarah", "history", "filsafat", "philosophy", "humaniora", "humanities", "ilmu sosial", "social science", "hubungan internasional", "international relations", "gender studies", "studi gender", "kajian budaya", "cultural studies", "etnografi", "ethnography", "kemanusiaan", "humanitarian", "masyarakat", "community studies", "perilaku manusia", "human behavior"],
  ["hukum", "law", "legal", "peradilan", "justice", "hak asasi manusia", "human rights", "ham", "konstitusi", "constitution", "perundang undangan", "regulasi", "regulation", "kebijakan publik", "public policy", "pemerintahan", "government", "tata kelola", "governance", "demokrasi", "democracy", "kewarganegaraan", "civics", "civic education", "anti korupsi", "antikorupsi", "integritas publik", "administrasi publik", "public administration"],
  ["keuangan", "finance", "financial", "akuntansi", "accounting", "investasi", "investment", "pasar modal", "capital market", "saham", "stock market", "perbankan", "banking", "asuransi", "insurance", "pajak", "tax", "perpajakan", "literasi keuangan", "financial literacy", "manajemen keuangan", "financial management", "ekonomi makro", "macroeconomics", "ekonomi mikro", "microeconomics", "ekonomi pembangunan", "development economics", "ekonomi digital", "digital economy", "ekonomi syariah", "islamic finance", "fintech", "financial technology"],
  ["pemasaran", "marketing", "digital marketing", "pemasaran digital", "periklanan", "advertising", "iklan", "public relations", "hubungan masyarakat", "humas", "komunikasi pemasaran", "marketing communication", "brand strategy", "strategi merek", "content creator", "konten kreator", "social media", "media sosial", "kampanye kreatif", "creative campaign", "copywriting", "market research", "riset pasar", "promosi", "branding", "brand activation"],
  ["pariwisata", "tourism", "travel", "perjalanan", "hospitality", "perhotelan", "hotel management", "manajemen hotel", "kuliner", "culinary", "memasak", "cooking", "gastronomi", "gastronomy", "food innovation", "inovasi pangan", "kewirausahaan kuliner", "hospitality management", "destinasi wisata", "wisata berkelanjutan", "sustainable tourism", "ekowisata", "ecotourism", "event management", "manajemen acara"],
  ["relawan", "volunteer", "volunteering", "pengabdian masyarakat", "community service", "pemberdayaan masyarakat", "community development", "inovasi sosial", "social innovation", "dampak sosial", "social impact", "kesejahteraan sosial", "social welfare", "filantropi", "philanthropy", "inklusi sosial", "social inclusion", "disabilitas", "disability inclusion", "kesukarelawanan", "pembangunan komunitas", "community empowerment"],
  ["kelautan", "marine", "ilmu kelautan", "oceanography", "oseanografi", "biologi laut", "marine science", "konservasi laut", "marine conservation", "terumbu karang", "coral reef", "ekosistem pesisir", "coastal ecosystem", "perikanan", "fisheries", "blue economy", "ekonomi biru", "sumber daya laut", "maritim", "maritime", "hutan", "forest", "kehutanan", "forestry", "konservasi hutan", "wildlife", "satwa liar", "konservasi satwa", "wildlife conservation"],
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

export function matchesTargetParticipant(preference, item) {
  if (!preference) return true;
  const preferred = normalizeRecommendationText(preference);
  const targets = (Array.isArray(item.targetParticipants) ? item.targetParticipants : [])
    .map(normalizeRecommendationText)
    .filter(Boolean);
  if (targets.length) return targets.some((target) => target === preferred || target.includes(preferred) || preferred.includes(target));

  const legacyEducation = normalizeRecommendationText(item.education);
  return Boolean(legacyEducation && (legacyEducation === preferred || legacyEducation.includes(preferred) || preferred.includes(legacyEducation)));
}
