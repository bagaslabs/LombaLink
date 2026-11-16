import React, { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "../components.jsx";
import { competitionFieldOptions, competitionModeOptions, defaultPreferences, targetParticipantOptions } from "../data.js";
import LocationSelects from "../LocationSelects.jsx";

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

export default function PersonalizationPage({ account, categoryOptions, onSave, onCancel, theme, onToggleTheme }) {
  const [form, setForm] = useState({ ...defaultPreferences, ...account.preferences });
  const [topicInput, setTopicInput] = useState(account.preferences.category || "");
  const [topicSuggestionsOpen, setTopicSuggestionsOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const topicOptions = [...new Set([...categoryOptions, ...competitionFieldOptions, ...recommendationTopics])];
  const normalizedTopicInput = topicInput.trim().toLocaleLowerCase("id-ID");
  const topicSuggestions = normalizedTopicInput
    ? topicOptions.filter((option) => option.toLocaleLowerCase("id-ID").includes(normalizedTopicInput)).slice(0, 8)
    : [];
  const showCustomTopic = normalizedTopicInput
    && !topicOptions.some((option) => option.toLocaleLowerCase("id-ID") === normalizedTopicInput);

  const selectTopic = (topic) => {
    setTopicInput(topic);
    setForm((current) => ({ ...current, category: topic }));
    setTopicSuggestionsOpen(false);
  };

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
          <p>Pilih minat agar rekomendasi lomba di beranda lebih sesuai untukmu. Semua pilihan boleh dikosongkan.</p>
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
                  setForm((current) => ({ ...current, category: value }));
                  setTopicSuggestionsOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && topicSuggestionsOpen && topicSuggestions.length) {
                    event.preventDefault();
                    selectTopic(topicSuggestions[0]);
                  } else if (event.key === "Escape") {
                    setTopicSuggestionsOpen(false);
                  }
                }}
                placeholder="Mulai ketik bidang atau topik"
                autoComplete="off"
              />
              {topicSuggestionsOpen && (topicSuggestions.length > 0 || showCustomTopic) && (
                <div id="personalization-topic-suggestions" className="competition-autocomplete-list" role="listbox" aria-label="Saran bidang dan topik">
                  {topicSuggestions.map((topic) => (
                    <button type="button" role="option" aria-selected={false} key={topic} onMouseDown={(event) => event.preventDefault()} onClick={() => selectTopic(topic)}>{topic}</button>
                  ))}
                  {showCustomTopic && (
                    <button type="button" role="option" aria-selected={false} className="competition-autocomplete-create" onMouseDown={(event) => event.preventDefault()} onClick={() => selectTopic(topicInput.trim())}>
                      Gunakan “{topicInput.trim()}”
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <label>Mode lomba
            <select value={form.mode} onChange={update("mode")}>
              <option value="">Semua mode</option>
              {competitionModeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Jenjang pendidikan atau status
            <select value={form.education} onChange={update("education")}>
              <option value="">Semua jenjang/status</option>
              {targetParticipantOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Preferensi biaya
            <select value={form.feeType} onChange={update("feeType")}>
              <option value="">Semua biaya</option>
              <option value="Gratis">Gratis</option>
              <option value="Berbayar">Berbayar</option>
            </select>
          </label>
          <label>Cakupan lokasi
            <select value={form.locationScope} onChange={(event) => setForm((current) => ({
              ...current,
              locationScope: event.target.value,
              province: ["Provinsi", "Kabupaten/Kota"].includes(event.target.value) ? current.province : "",
              city: event.target.value === "Kabupaten/Kota" ? current.city : "",
            }))}>
              <option value="">Semua cakupan</option>
              <option value="Provinsi">Provinsi</option>
              <option value="Kabupaten/Kota">Kota/Kabupaten</option>
              <option value="Nasional">Nasional</option>
            </select>
          </label>
          {["Provinsi", "Kabupaten/Kota"].includes(form.locationScope) && <LocationSelects
            province={form.province}
            city={form.city}
            onProvinceChange={(province) => setForm((current) => ({ ...current, province, city: "" }))}
            onCityChange={(city) => setForm((current) => ({ ...current, city }))}
            showCity={form.locationScope === "Kabupaten/Kota"}
            cityRequired={form.locationScope === "Kabupaten/Kota"}
            className="sm:col-span-2"
          />}
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
