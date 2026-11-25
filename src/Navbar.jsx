import React, { useState } from "react";
import {
  ArrowRight,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand, ThemeToggle } from "./components.jsx";
import { scrollToPageSection } from "./data.js";

export default function Navbar({ account, route, navigate, onSubmit, onLogout, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const routePath = route.split("?")[0];
  const [activeSection, setActiveSection] = useState(() => (
    routePath === "/cari" ? "cari" : routePath === "/rekomendasi" ? "rekomendasi" : ""
  ));

  const goToPage = (path) => {
    navigate(path);
    setMenuOpen(false);
    if (path === "/") setActiveSection("");
  };
  const goToSection = (sectionId) => {
    if (!scrollToPageSection(sectionId)) {
      const routeBySection = {
        cari: "/cari",
        rekomendasi: "/rekomendasi",
      };
      const targetRoute = routeBySection[sectionId]
        ? `${routeBySection[sectionId]}?scroll=smooth`
        : `/?section=${encodeURIComponent(sectionId)}&scroll=smooth`;
      navigate(targetRoute);
    }
    setActiveSection(sectionId);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand onClick={() => goToPage("/")} />
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navigasi utama">
          <button className={`nav-link ${activeSection === "cari" ? "is-active" : ""}`} data-guest-access onClick={() => goToSection("cari")}>Cari Lomba</button>
          <button className={`nav-link ${activeSection === "rekomendasi" ? "is-active" : ""}`} data-guest-access onClick={() => goToSection("rekomendasi")}>Rekomendasi</button>
          <button className={`nav-link ${activeSection === "tentang" ? "is-active" : ""}`} data-guest-access onClick={() => goToSection("tentang")}>Tentang</button>
          {account?.role === "moderator" && <button className={`nav-link ${routePath === "/admin" ? "is-active" : ""}`} onClick={() => goToPage("/admin")}>Panel Moderator</button>}
          {account && <button className={`nav-link ${routePath === "/personalization" ? "is-active" : ""}`} onClick={() => goToPage("/personalization")}>Personalisasi</button>}
          {account && <button className={`nav-link ${routePath === "/profile" ? "is-active" : ""}`} onClick={() => goToPage("/profile")}>Profil</button>}
          {account && <button className={`nav-link ${routePath === "/settings" ? "is-active" : ""}`} onClick={() => goToPage("/settings")}>Pengaturan</button>}
          {account && <button className="nav-link mobile-logout" onClick={() => { onLogout(); setMenuOpen(false); }}>Keluar</button>}
        </nav>
        <div className="header-actions">
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          {account ? (
            <>
              {account.role === "organizer" && <button className="button button-outline button-small organizer-add-nav" onClick={onSubmit}><Plus size={16} /> Tambah Lomba</button>}
              <button className="profile-chip" aria-label="Buka profil" onClick={() => goToPage("/profile")}>
                <span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : account.name.slice(0, 1).toUpperCase()}</span>
                <span className="profile-name">{account.name.split(" ")[0]}</span>
                {account.role === "moderator" && <ShieldCheck size={15} className="profile-shield" />}
              </button>
              <button className="icon-button logout-button" title="Keluar" onClick={onLogout}><LogOut size={17} /></button>
            </>
          ) : (
            <>
              <button className="button button-quiet button-small login-nav" data-guest-access onClick={() => goToPage("/login")}>Masuk</button>
              <button className="button button-primary button-small header-register-button" data-guest-access onClick={() => goToPage("/register")}>Daftar gratis <ArrowRight size={15} /></button>
            </>
          )}
        </div>
        <button className="mobile-menu" data-guest-access onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}
