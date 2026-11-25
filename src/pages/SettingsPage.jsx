import React from "react";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "../components.jsx";

export default function SettingsPage({ account, onLogout, onCancel, theme, onToggleTheme }) {
  const accountTypeLabels = {
    participant: "Peserta lomba",
    organizer: "Penyelenggara lomba",
  };
  return (
    <main className="profile-page">
      <section className="profile-card">
        <div className="profile-page-actions">
          <button className="auth-back" onClick={onCancel}><ArrowLeft size={17} /> Kembali</button>
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </div>
        <div className="profile-card-heading">
          <span className="profile-settings-icon"><Settings size={22} /></span>
          <span className="eyebrow">PENGATURAN</span>
          <h1>Pengaturan akun</h1>
          <p>Kelola sesi akun LombaLink kamu.</p>
        </div>
        <div className="settings-row settings-theme-row">
          <div><strong>Tampilan</strong><p>Gunakan tema {theme === "dark" ? "gelap" : "terang"}.</p></div>
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </div>
        {account.role !== "moderator" && <div className="settings-row">
          <div>
            <strong>Role akun: {accountTypeLabels[account.accountType] || "Belum dipilih"}</strong>
            <p>Role akun ditetapkan permanen dan tidak dapat diubah.</p>
          </div>
        </div>}
        <div className="settings-row">
          <div><strong>Akun</strong><p>{account.email}</p></div>
          <button className="button button-outline button-small" onClick={onLogout}><LogOut size={15} /> Keluar</button>
        </div>
      </section>
    </main>
  );
}
