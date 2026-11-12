import React, { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail, ShieldCheck, Trophy } from "lucide-react";
import { Brand, ThemeToggle } from "../components.jsx";

export default function AdminLoginPage({ navigate, onLogin, authConfigured, authError, theme, onToggleTheme }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const message = await onLogin({ email: email.trim(), password });
    if (message) {
      setError(message);
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="mx-auto mb-4 flex w-full max-w-[1180px] items-center justify-between gap-4">
        <button className="auth-back" onClick={() => navigate("/")}><ArrowLeft size={17} /> Kembali ke beranda</button>
        <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
      </div>
      <div className="auth-layout admin-auth-layout">
        <section className="auth-aside">
          <Brand onClick={() => navigate("/")} />
          <div className="auth-aside-copy">
            <span className="eyebrow">AREA KHUSUS</span>
            <h1>Panel<br /><span>moderator.</span></h1>
            <p>Gunakan akun moderator resmi untuk meninjau pengajuan lomba.</p>
          </div>
          <div className="auth-aside-bottom"><span className="auth-aside-icon"><ShieldCheck size={25} /></span><span>Akses panel dilindungi<br />oleh verifikasi akun moderator.</span></div>
          <div className="auth-decoration decoration-one"></div><div className="auth-decoration decoration-two"></div>
        </section>
        <section className="auth-form-side">
          <div className="auth-form-wrap">
            <span className="eyebrow">LOGIN ADMIN</span>
            <h2>Masuk ke panel moderator</h2>
            <p className="auth-subtitle">Masuk menggunakan email dan password admin.</p>
            <form className="auth-form grid gap-4" onSubmit={submit}>
              <label>Email admin
                <span className="input-with-icon"><Mail size={17} /><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@lombalink.id" required /></span>
              </label>
              <label>Password
                <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" required />
              </label>
              {(error || authError) && <p className="form-error" role="alert">{error || authError}</p>}
              {!authConfigured && <p className="auth-setup-warning" role="alert">Supabase belum dikonfigurasi.</p>}
              <button className="button button-primary button-wide auth-submit" type="submit" disabled={!authConfigured || busy}>
                {busy ? <LoaderCircle size={17} className="loading-icon" /> : null}
                {busy ? "Memverifikasi akun..." : "Masuk sebagai admin"}
                {!busy && <ArrowRight size={16} />}
              </button>
            </form>
            <p className="auth-demo-note"><Trophy size={14} /> Halaman ini hanya untuk akun dengan role moderator.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
