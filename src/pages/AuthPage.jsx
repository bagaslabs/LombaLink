import React, { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck, Trophy } from "lucide-react";
import { Brand, ThemeToggle } from "../components.jsx";

export default function AuthPage({ mode, navigate, onGoogleSignIn, authConfigured, authError, theme, onToggleTheme }) {
  const isRegister = mode === "register";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const startGoogleSignIn = async () => {
    setError("");
    setBusy(true);
    const message = await onGoogleSignIn();
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
      <div className="auth-layout">
        <section className="auth-aside">
          <Brand onClick={() => navigate("/")} />
          <div className="auth-aside-copy"><span className="eyebrow">SATU LANGKAH LEBIH DEKAT</span><h1>{isRegister ? <>Buka ruang<br />untuk <span>bertumbuh.</span></> : <>Kesempatan<br />menunggumu<br /><span>di depan.</span></>}</h1><p>{isRegister ? "Bergabung dengan komunitas yang saling berbagi peluang dan inspirasi." : "Masuk untuk menemukan peluang baru dan menyimpan perjalananmu."}</p></div>
          <div className="auth-aside-bottom"><span className="auth-aside-icon"><Trophy size={25} /></span><span>Setiap pencapaian besar<br />dimulai dari sebuah kesempatan.</span></div>
          <div className="auth-decoration decoration-one"></div><div className="auth-decoration decoration-two"></div>
        </section>
        <section className="auth-form-side">
          <div className="auth-form-wrap">
            <span className="eyebrow">{isRegister ? "MULAI PERJALANANMU" : "SENANG MELIHATMU KEMBALI"}</span>
            <h2>{isRegister ? "Daftar dengan Google" : "Masuk dengan Google"}</h2>
            <p className="auth-subtitle">{isRegister ? "Gunakan akun Google untuk bergabung dengan komunitas LombaLink." : "Masuk dengan akun Google untuk melanjutkan perjalananmu."}</p>
            <div className="auth-form grid gap-4">
              {isRegister && <p className="auth-account-type-note">Kamu akan memilih role setelah pendaftaran. Role yang dipilih akan tetap dan tidak dapat diubah.</p>}
              <button className="button google-auth-button button-wide" onClick={startGoogleSignIn} disabled={!authConfigured || busy}>
                {busy ? <LoaderCircle size={18} className="loading-icon" /> : <span className="google-mark" aria-hidden="true">G</span>}
                {busy ? "Menghubungkan ke Google..." : "Lanjutkan dengan Google"}
                {!busy && <ArrowRight size={16} />}
              </button>
              <p className="auth-demo-note"><ShieldCheck size={14} /> LombaLink tidak menyimpan kata sandi Google kamu.</p>
              {error && <p className="form-error" role="alert">{error}</p>}
              {authError && <p className="form-error" role="alert">{authError}</p>}
              {!authConfigured && <p className="auth-setup-warning" role="alert">Google sign-in belum dikonfigurasi. Periksa URL dan publishable key Supabase di environment proyek.</p>}
            </div>
            <p className="auth-switch">{isRegister ? "Sudah punya akun?" : "Belum punya akun?"} <button onClick={() => navigate(isRegister ? "/login" : "/register")}>{isRegister ? "Masuk" : "Daftar gratis"}</button></p>
            {isRegister && <p className="auth-terms">Dengan mendaftar, kamu menyetujui ketentuan penggunaan LombaLink.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
