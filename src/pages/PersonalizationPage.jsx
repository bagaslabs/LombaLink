import React, { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "../components.jsx";
import { competitionModeOptions, defaultPreferences, targetParticipantOptions } from "../data.js";
import LocationSelects from "../LocationSelects.jsx";

export default function PersonalizationPage({ account, categoryOptions, onSave, onCancel, theme, onToggleTheme }) {
  const [form, setForm] = useState({ ...defaultPreferences, ...account.preferences });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

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
          <label>Bidang atau topik minat
            <select value={form.category} onChange={update("category")}>
              <option value="">Semua bidang</option>
              {categoryOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
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
              province: event.target.value === "Daerah" ? current.province : "",
              city: event.target.value === "Daerah" ? current.city : "",
            }))}>
              <option value="">Semua cakupan</option>
              <option value="Daerah">Provinsi dan kota/kabupaten</option>
              <option value="Nasional">Nasional</option>
            </select>
          </label>
          {form.locationScope === "Daerah" && <LocationSelects
            province={form.province}
            city={form.city}
            onProvinceChange={(province) => setForm((current) => ({ ...current, province, city: "" }))}
            onCityChange={(city) => setForm((current) => ({ ...current, city }))}
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
