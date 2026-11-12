import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, LoaderCircle, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import { ThemeToggle } from "../components.jsx";
import { educationOptions } from "../data.js";

export default function ProfilePage({ account, onSave, onCancel, pendingPost, theme, onToggleTheme }) {
  const [form, setForm] = useState({
    username: account.username || "",
    fullName: account.fullName || "",
    phone: account.phone || "",
    province: account.province || "",
    city: account.city || "",
    birthDate: account.birthDate || "",
    education: account.education || "",
    institution: account.institution || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const update = (key) => (event) => {
    const value = key === "username" ? event.target.value.toLowerCase() : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };
  const selectAvatar = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Foto profil harus berformat JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto profil maksimal 5 MB.");
      return;
    }
    setError("");
    setAvatarFile(file);
    setRemoveAvatar(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.username.trim() || !form.fullName.trim() || !form.phone.trim() || !form.province.trim() || !form.city.trim() || !form.birthDate || !form.education) {
      setError("Lengkapi semua data profil wajib terlebih dahulu.");
      return;
    }
    if (!/^[a-z0-9._]{3,30}$/.test(form.username.trim())) {
      setError("Username harus 3–30 karakter dan hanya boleh berisi huruf, angka, titik, atau garis bawah.");
      return;
    }
    setError("");
    setBusy(true);
    const message = await onSave({
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      birthDate: form.birthDate,
      education: form.education,
      institution: form.institution.trim(),
      avatarFile,
      removeAvatar,
    });
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="profile-page">
      <div className="mx-auto mb-4 flex w-full max-w-[760px] items-center justify-between gap-4">
        <button className="auth-back" onClick={onCancel}><ArrowLeft size={17} /> Kembali ke beranda</button>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <section className="profile-card">
        <div className="profile-card-heading">
          <span className="profile-settings-icon"><UserRound size={22} /></span>
          <span className="eyebrow">PROFIL</span>
          <h1>Lengkapi profilmu</h1>
          <p>Profil yang lengkap membantu komunitas mengetahui siapa yang membagikan informasi lomba.</p>
        </div>
        {pendingPost && <div className="profile-requirement"><ShieldCheck size={17} /><span>Lengkapi data wajib di bawah sebelum mengajukan lomba.</span></div>}
        <form className="profile-form grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit}>
          <div className="profile-photo-field sm:col-span-2">
            <span className="profile-photo-preview">
              {previewUrl || (!removeAvatar && account.avatarUrl)
                ? <img src={previewUrl || account.avatarUrl} alt="Pratinjau foto profil" />
                : <UserRound size={28} />}
            </span>
            <div className="profile-photo-controls">
              <label className="profile-photo-picker" htmlFor="profile-photo"><Camera size={15} /> Pilih foto profil</label>
              <input id="profile-photo" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
              <span className="profile-photo-note">JPG, PNG, atau WebP · maks. 5 MB · foto dapat dilihat publik</span>
            </div>
            {(previewUrl || (!removeAvatar && account.avatarUrl)) && <button className="profile-photo-remove" type="button" aria-label="Hapus foto profil" onClick={() => { setAvatarFile(null); setRemoveAvatar(true); }}><X size={16} /></button>}
          </div>
          <label>Username <span className="required-mark">*</span><input autoComplete="username" value={form.username} onChange={update("username")} placeholder="contoh: nama_kamu" minLength={3} maxLength={30} pattern="[a-zA-Z0-9._]{3,30}" required /></label>
          <label>Nama Lengkap <span className="required-mark">*</span><input autoComplete="name" value={form.fullName} onChange={update("fullName")} placeholder="Nama sesuai identitas" maxLength={120} required /></label>
          <label>Nomor HP <span className="required-mark">*</span><input type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} placeholder="Contoh: 081234567890" maxLength={40} required /></label>
          <label>Email<input type="email" value={account.email} readOnly aria-readonly="true" /></label>
          <label>Provinsi <span className="required-mark">*</span><input autoComplete="address-level1" value={form.province} onChange={update("province")} placeholder="Nama provinsi" maxLength={120} required /></label>
          <label>Kota <span className="required-mark">*</span><input autoComplete="address-level2" value={form.city} onChange={update("city")} placeholder="Nama kota/kabupaten" maxLength={120} required /></label>
          <label>Tanggal Lahir <span className="required-mark">*</span><input type="date" autoComplete="bday" value={form.birthDate} onChange={update("birthDate")} max={new Date().toISOString().slice(0, 10)} required /></label>
          <label>Jenjang <span className="required-mark">*</span>
            <select value={form.education} onChange={update("education")} required>
              <option value="">Pilih jenjang</option>
              {educationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">Lembaga <span className="optional-mark">(opsional)</span><input autoComplete="organization" value={form.institution} onChange={update("institution")} placeholder="Sekolah, kampus, atau organisasi" maxLength={160} /></label>
          {error && <p className="form-error sm:col-span-2" role="alert">{error}</p>}
          <button className="button button-primary button-wide auth-submit sm:col-span-2" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="loading-icon" /> : null}
            {busy ? "Menyimpan profil..." : "Simpan profil"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>
        <p className="profile-account-email"><Mail size={14} /> Email akun tidak dapat diubah dari halaman profil.</p>
      </section>
    </main>
  );
}
