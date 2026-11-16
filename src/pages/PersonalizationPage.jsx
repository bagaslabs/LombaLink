import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "../components.jsx";
import { competitionFieldOptions, defaultPreferences, scopeOptions } from "../data.js";
import { hasRegistrationAvailable, matchesCompetitionLevel, recommendationTopicScore } from "../recommendationMatching.js";

const recommendationTopics = [
  "Pemrograman", "Pengembangan Web", "Pengembangan Aplikasi", "Software Engineering", "Hackathon",
  "Kecerdasan Buatan", "Machine Learning", "Data Science", "Analisis Data", "Keamanan Siber",
  "Teknologi", "Robotika", "Internet of Things", "Game Development", "UI/UX Design",
  "Sains", "Fisika", "Kimia", "Biologi", "Astronomi", "Matematika", "Statistika",
  "Olimpiade", "Riset dan Inovasi", "Lingkungan", "Energi Terbarukan", "Pertanian dan Pangan",
  "Kesehatan", "Kedokteran", "Pendidikan", "Psikologi", "Sosial dan Humaniora",
  "Esai dan Karya Tulis", "Jurnalistik", "Debat", "Bahasa dan Sastra", "Sejarah",
  "Bisnis dan Ekonomi", "Kewirausahaan", "Startup", "Keuangan", "Pemasaran",
  "Desain Grafis", "Ilustrasi", "Fotografi", "Videografi", "Film", "Animasi",
  "Seni dan Budaya", "Musik", "Tari", "Teater", "Arsitektur", "Fashion",
  "Olahraga", "E-sport", "Hukum", "Kebijakan Publik", "Pariwisata", "Kuliner",
];

export default function PersonalizationPage({ account, categoryOptions, competitions = [], onSave, onCancel, theme, onToggleTheme }) {
  const [form, setForm] = useState({ ...defaultPreferences, ...account.preferences });
  const [topicInput, setTopicInput] = useState("");
  const [topicSuggestionsOpen, setTopicSuggestionsOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const topicOptions = [...new Set([...categoryOptions, ...competitionFieldOptions, ...recommendationTopics])];
  const selectedTopics = Array.isArray(form.categories) ? form.categories : [];
  const availableCompetitions = useMemo(
    () => competitions.filter((item) => hasRegistrationAvailable(item) && matchesCompetitionLevel(form.level, item)),
    [competitions, form.level],
  );
  const countCompetitionsForTopic = (topic) => availableCompetitions
    .filter((item) => recommendationTopicScore(topic, item) > 0).length;
  const normalizedTopicInput = topicInput.trim().toLocaleLowerCase("id-ID");
  const topicSuggestions = normalizedTopicInput
    ? topicOptions.filter((option) => option.toLocaleLowerCase("id-ID").includes(normalizedTopicInput)
      && !selectedTopics.some((selected) => selected.toLocaleLowerCase("id-ID") === option.toLocaleLowerCase("id-ID"))).slice(0, 8)
      .map((topic) => ({ topic, count: countCompetitionsForTopic(topic) }))
    : [];
  const showCustomTopic = normalizedTopicInput
    && !selectedTopics.some((selected) => selected.toLocaleLowerCase("id-ID") === normalizedTopicInput)
    && !topicOptions.some((option) => option.toLocaleLowerCase("id-ID") === normalizedTopicInput);

  const selectTopic = (topic) => {
    const value = topic.trim();
    if (value && !selectedTopics.some((selected) => selected.toLocaleLowerCase("id-ID") === value.toLocaleLowerCase("id-ID"))) {
      setForm((current) => ({ ...current, categories: [...(current.categories || []), value] }));
    }
    setTopicInput("");
    setTopicSuggestionsOpen(false);
  };

  const removeTopic = (topic) => setForm((current) => ({
    ...current,
    categories: (current.categories || []).filter((selected) => selected !== topic),
  }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const message = await onSave(form);
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="profile-page">
      <div className="mx-auto mb-4 flex w-full max-w-[620px] items-center justify-between gap-4">
        <button className="auth-back" onClick={onCancel}><ArrowLeft size={17} /> Kembali ke beranda</button>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <section className="profile-card">
        <div className="profile-card-heading">
          <span className="profile-settings-icon"><SlidersHorizontal size={22} /></span>
          <span className="eyebrow">PERSONALISASI</span>
          <h1>Atur rekomendasimu</h1>
        <p>Pilih beberapa bidang yang kamu minati dan tingkatan lomba yang ingin diikuti. Keduanya boleh dikosongkan.</p>
        </div>
        <form className="profile-form grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit}>
          <div className="profile-topic-field">
            <label htmlFor="personalization-topic">Bidang atau topik minat</label>
            <div
              className="profile-topic-autocomplete"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setTopicSuggestionsOpen(false);
              }}
            >
              <div className="profile-topic-tags">
                {selectedTopics.map((topic) => <span className="profile-topic-tag" key={topic}>
                  {topic}
                  <button type="button" aria-label={`Hapus minat ${topic}`} onClick={() => removeTopic(topic)}>×</button>
                </span>)}
                <input
                  id="personalization-topic"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="personalization-topic-suggestions"
                  aria-expanded={Boolean(topicSuggestionsOpen && (topicSuggestions.length || showCustomTopic))}
                  value={topicInput}
                  onFocus={() => setTopicSuggestionsOpen(true)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTopicInput(value);
                    setTopicSuggestionsOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && topicSuggestionsOpen && topicSuggestions.length) {
                      event.preventDefault();
                      selectTopic(topicSuggestions[0].topic);
                    } else if (event.key === "Enter" && showCustomTopic) {
                      event.preventDefault();
                      selectTopic(topicInput);
                    } else if (event.key === "Backspace" && !topicInput && selectedTopics.length) {
                      removeTopic(selectedTopics[selectedTopics.length - 1]);
                    } else if (event.key === "Escape") {
                      setTopicSuggestionsOpen(false);
                    }
                  }}
                  placeholder={selectedTopics.length ? "Tambah bidang atau topik" : "Mulai ketik bidang atau topik"}
                  autoComplete="off"
                />
              </div>
              <p className="profile-topic-count-note">Jumlah saran mengikuti tingkatan yang dipilih dan hanya menghitung lomba yang pendaftarannya tersedia.</p>
              {topicSuggestionsOpen && (topicSuggestions.length > 0 || showCustomTopic) && (
                <div id="personalization-topic-suggestions" className="competition-autocomplete-list" role="listbox" aria-label="Saran bidang dan topik">
                  {topicSuggestions.map(({ topic, count }) => (
                    <button type="button" role="option" aria-selected={false} key={topic} onMouseDown={(event) => event.preventDefault()} onClick={() => selectTopic(topic)}>
                      <span>{topic}</span><small>{count.toLocaleString("id-ID")} lomba</small>
                    </button>
                  ))}
                  {showCustomTopic && (
                    <button type="button" role="option" aria-selected={false} className="competition-autocomplete-create" onMouseDown={(event) => event.preventDefault()} onClick={() => selectTopic(topicInput.trim())}>
                      <span>Gunakan “{topicInput.trim()}”</span><small>{countCompetitionsForTopic(topicInput.trim()).toLocaleString("id-ID")} lomba</small>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <label>Tingkatan lomba
            <select value={form.level} onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}>
              <option value="">Semua tingkatan</option>
              {scopeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          {error && <p className="form-error sm:col-span-2" role="alert">{error}</p>}
          <button className="button button-primary button-wide auth-submit sm:col-span-2" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="loading-icon" /> : null}
            {busy ? "Menyimpan preferensi..." : "Simpan personalisasi"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>
      </section>
    </main>
  );
}
