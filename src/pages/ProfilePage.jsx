import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, LoaderCircle, Mail, Pencil, ShieldCheck, UserRound, X } from "lucide-react";
import { ThemeToggle } from "../components.jsx";
import { birthYearOptions, educationOptions, isProfileComplete, normalizePhoneNumber, phoneCountryCodes } from "../data.js";
import LocationSelects from "../LocationSelects.jsx";

function phonePartsFromValue(phone = "") {
  const digits = phone.replace(/\D/g, "");
  const matchingCountry = phone.startsWith("+")
    ? [...phoneCountryCodes]
      .sort((left, right) => right.callingCode.length - left.callingCode.length)
      .find(({ callingCode }) => digits.startsWith(callingCode.slice(1)))
    : null;

  if (matchingCountry) {
    return {
      country: matchingCountry.country,
      number: digits.slice(matchingCountry.callingCode.length - 1),
    };
  }
  return { country: "ID", number: digits.replace(/^0/, "") };
}

function profileFormFromAccount(account) {
  const phone = phonePartsFromValue(account.phone);
  return {
    username: account.username || "",
    fullName: account.fullName || "",
    phone: phone.number,
    province: account.province || "",
    city: account.city || "",
    birthYear: account.birthYear || "",
    education: account.education || "",
    institution: account.institution || "",
  };
}

export default function ProfilePage({ account, onSave, onCancel, pendingPost, theme, onToggleTheme }) {
  const [form, setForm] = useState(() => profileFormFromAccount(account));
  const [phoneCountry, setPhoneCountry] = useState(() => phonePartsFromValue(account.phone).country);
  const [editing, setEditing] = useState(() => !isProfileComplete(account));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [locationValid, setLocationValid] = useState(false);

  useEffect(() => {
    const phone = phonePartsFromValue(account.phone);
    setForm(profileFormFromAccount(account));
    setPhoneCountry(phone.country);
    setEditing(!isProfileComplete(account));
  }, [account]);

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
    if (!form.username.trim() || !form.fullName.trim() || !form.province.trim() || !form.city.trim() || !form.birthYear || !form.education) {
      setError("Lengkapi semua data profil wajib terlebih dahulu.");
      return;
    }
    const selectedPhoneCountry = phoneCountryCodes.find((item) => item.country === phoneCountry);
    const phone = normalizePhoneNumber(form.phone, selectedPhoneCountry?.callingCode);
    if (!phone) {
      setError("Masukkan nomor telepon yang valid dan pastikan kode negaranya benar.");
      return;
    }
    const birthYear = Number(form.birthYear);
    if (!locationValid || !Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
      setError("Pastikan provinsi dan kota/kabupaten terisi, serta isi tahun lahir yang valid.");
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
      phone,
      province: form.province.trim(),
      city: form.city.trim(),
      birthYear,
      education: form.education,
      institution: form.institution.trim(),
      avatarFile,
      removeAvatar,
    });
    if (message) {
      setError(message);
      setBusy(false);
    } else {
      setEditing(false);
      setBusy(false);
      setAvatarFile(null);
      setRemoveAvatar(false);
    }
  };

  const cancelEditing = () => {
    setForm(profileFormFromAccount(account));
    setPhoneCountry(phonePartsFromValue(account.phone).country);
    setError("");
    setAvatarFile(null);
    setRemoveAvatar(false);
    setEditing(false);
  };

  const profileIsComplete = isProfileComplete(account);

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
          <h1>{editing ? profileIsComplete ? "Edit profil" : "Lengkapi profilmu" : "Profil saya"}</h1>
          <p>{editing ? "Pastikan informasi profilmu tetap akurat dan nomor telepon dapat dihubungi." : "Informasi profil yang kamu bagikan di LombaLink."}</p>
        </div>
        {pendingPost && editing && <div className="profile-requirement"><ShieldCheck size={17} /><span>Lengkapi data wajib di bawah sebelum mengajukan lomba.</span></div>}
        {!editing ? (
          <>
            <div className="profile-summary">
              <div><span>Nama lengkap</span><strong>{account.fullName}</strong></div>
              <div><span>Username</span><strong>@{account.username}</strong></div>
              <div><span>Nomor telepon</span><strong>{normalizePhoneNumber(account.phone) || account.phone}</strong></div>
              <div><span>Email</span><strong>{account.email}</strong></div>
              <div><span>Domisili</span><strong>{account.region || "Belum diisi"}</strong></div>
              <div><span>Tahun lahir</span><strong>{account.birthYear || "Belum diisi"}</strong></div>
              <div><span>Jenjang</span><strong>{account.education || "Belum diisi"}</strong></div>
              <div><span>Lembaga</span><strong>{account.institution || "Belum diisi"}</strong></div>
            </div>
            <button className="button button-primary button-wide auth-submit" type="button" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profil</button>
          </>
        ) : <form className="profile-form grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit}>
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
          <label className="sm:col-span-2">Nomor HP <span className="required-mark">*</span>
            <div className="phone-input-group">
              <select value={phoneCountry} onChange={(event) => setPhoneCountry(event.target.value)} aria-label="Kode negara nomor telepon">
                {phoneCountryCodes.map((item) => <option key={item.country} value={item.country}>{item.name} ({item.callingCode})</option>)}
              </select>
              <input type="tel" inputMode="tel" autoComplete="tel-national" value={form.phone} onChange={update("phone")} placeholder="81234567890" minLength={7} maxLength={18} pattern="[0-9 ()-]{7,18}" required />
            </div>
            <small className="phone-input-hint">Masukkan nomor tanpa kode negara; nomor disimpan dalam format internasional.</small>
          </label>
          <label>Email<input type="email" value={account.email} readOnly aria-readonly="true" /></label>
          <LocationSelects
            className="sm:col-span-2"
            province={form.province}
            city={form.city}
            onProvinceChange={(value) => { setLocationValid(false); setForm((current) => ({ ...current, province: value, city: "" })); }}
            onCityChange={(value) => setForm((current) => ({ ...current, city: value }))}
            onValidityChange={setLocationValid}
          />
          <label>Tahun Lahir <span className="required-mark">*</span>
            <select value={form.birthYear} onChange={update("birthYear")} required>
              <option value="">Pilih tahun lahir</option>
              {birthYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label>Jenjang <span className="required-mark">*</span>
            <select value={form.education} onChange={update("education")} required>
              <option value="">Pilih jenjang</option>
              {educationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">Lembaga <span className="optional-mark">(opsional)</span><input autoComplete="organization" value={form.institution} onChange={update("institution")} placeholder="Sekolah, kampus, atau organisasi" maxLength={160} /></label>
          {error && <p className="form-error sm:col-span-2" role="alert">{error}</p>}
          {profileIsComplete && <button className="button button-quiet sm:col-span-1" type="button" onClick={cancelEditing}>Batal</button>}
          <button className="button button-primary button-wide auth-submit sm:col-span-2" type="submit" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="loading-icon" /> : null}
            {busy ? "Menyimpan profil..." : profileIsComplete ? "Simpan perubahan" : "Simpan profil"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>}
        {!editing && <p className="profile-account-email"><Mail size={14} /> Email akun tidak dapat diubah dari halaman profil.</p>}
      </section>
    </main>
  );
}
