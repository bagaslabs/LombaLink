import React, { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "../components.jsx";
import { defaultPreferences, educationOptions, organizerOptions, scopeOptions } from "../data.js";

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
          <label>Kategori minat
            <select value={form.category} onChange={update("category")}>
              <option value="">Semua kategori</option>
              {categoryOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Jenjang peserta
            <select value={form.education} onChange={update("education")}>
              <option value="">Semua jenjang</option>
              {educationOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Cakupan lomba
            <select value={form.scope} onChange={update("scope")}>
              <option value="">Semua cakupan</option>
              {scopeOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Jenis penyelenggara
            <select value={form.organizerType} onChange={update("organizerType")}>
              <option value="">Semua penyelenggara</option>
              {organizerOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">Daerah atau provinsi
            <input value={form.location} onChange={update("location")} placeholder="Contoh: Bandung atau Jawa Barat" />
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
