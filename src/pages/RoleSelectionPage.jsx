import React, { useState } from "react";
import { ArrowRight, Building2, LoaderCircle, Search, UserRound } from "lucide-react";
import { ThemeToggle } from "../components.jsx";

const roleOptions = [
  {
    value: "participant",
    title: "Mencari lomba",
    description: "Jelajahi peluang, simpan minat, dan temukan lomba yang cocok.",
    icon: Search,
  },
  {
    value: "organizer",
    title: "Penyelenggara lomba",
    description: "Bagikan lomba dan gunakan panel untuk mengelola pengajuan.",
    icon: Building2,
  },
];

export default function RoleSelectionPage({ account, onSave, theme, onToggleTheme, authError }) {
  const [selectedRole, setSelectedRole] = useState(account.accountType);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selectedRole) {
      setError("Pilih dulu cara kamu menggunakan LombaLink.");
      return;
    }

    setBusy(true);
    setError("");
    const message = await onSave(selectedRole);
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="profile-page">
      <div className="mx-auto mb-4 flex w-full max-w-[760px] items-center justify-end gap-4">
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <section className="profile-card role-selection-card">
        <div className="profile-card-heading">
          <span className="profile-settings-icon"><UserRound size={22} /></span>
          <span className="eyebrow">SATU LANGKAH LAGI</span>
          <h1>Kamu ingin menggunakan LombaLink sebagai apa?</h1>
          <p>Pilihan ini akan ditetapkan permanen untuk akunmu dan tidak dapat diubah nanti.</p>
        </div>
        <div className="role-choice-grid" role="group" aria-label="Pilih jenis akun">
          {roleOptions.map(({ value, title, description, icon: Icon }) => (
            <button
              className={`role-choice ${selectedRole === value ? "selected" : ""}`}
              type="button"
              key={value}
              aria-pressed={selectedRole === value}
              onClick={() => setSelectedRole(value)}
            >
              <span className="role-choice-icon"><Icon size={20} /></span>
              <span className="role-choice-copy"><strong>{title}</strong><small>{description}</small></span>
            </button>
          ))}
        </div>
        {(error || authError) && <p className="form-error role-selection-error" role="alert">{error || authError}</p>}
        <button className="button button-primary button-wide auth-submit" type="button" onClick={submit} disabled={!selectedRole || busy}>
          {busy ? <LoaderCircle size={17} className="loading-icon" /> : null}
          {busy ? "Menyimpan pilihan..." : selectedRole === "organizer" ? "Lanjut ke panel penyelenggara" : "Mulai mencari lomba"}
          {!busy && <ArrowRight size={16} />}
        </button>
      </section>
    </main>
  );
}
