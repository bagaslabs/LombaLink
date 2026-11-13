import React from "react";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "../components.jsx";

export default function SettingsPage({ account, onLogout, onCancel, onChangeAccountType, theme, onToggleTheme }) {
  const accountTypeLabels = {
    participant: "Peserta lomba",
    organizer: "Penyelenggara lomba",
  };
  const accountTypes = account.accountTypes?.length
    ? account.accountTypes
    : account.accountType ? [account.accountType] : [];

  return (
    <main className="profile-page">
      <div className="mx-auto mb-4 flex w-full max-w-[620px] items-center justify-between gap-4">
        <button className="auth-back" onClick={onCancel}><ArrowLeft size={17} /> Kembali ke beranda</button>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <section className="profile-card">
        <div className="profile-card-heading">
          <span className="profile-settings-icon"><Settings size={22} /></span>
          <span className="eyebrow">PENGATURAN</span>
          <h1>Pengaturan akun</h1>
          <p>Kelola tampilan dan sesi akun LombaLink kamu.</p>
        </div>
        <div className="settings-row">
          <div><strong>Tampilan</strong><p>Gunakan tema {theme === "dark" ? "gelap" : "terang"}.</p></div>
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </div>
        {account.role !== "moderator" && <div className="settings-row">
          <div>
            <strong>Role aktif: {accountTypeLabels[account.accountType] || "Belum dipilih"}</strong>
            <p>Tersimpan di akun: {accountTypes.map((type) => accountTypeLabels[type]).join(" dan ") || "Belum ada role"}</p>
          </div>
          <button className="button button-outline button-small" onClick={onChangeAccountType}>Ubah</button>
        </div>}
        <div className="settings-row">
          <div><strong>Akun</strong><p>{account.email}</p></div>
          <button className="button button-outline button-small" onClick={onLogout}><LogOut size={15} /> Keluar</button>
        </div>
      </section>
    </main>
  );
}
