import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { Brand, ThemeToggle } from "../components.jsx";
import { competitionFromRow } from "../data.js";
import AdminUsersPanel from "./AdminUsersPanel.jsx";

export default function AdminPage({ account, supabaseClient, navigate, onLogout, theme, onToggleTheme }) {
  const [tab, setTab] = useState("pending");
  const [section, setSection] = useState("overview");
  const [competitions, setCompetitions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const moderatorName = account?.name || "Moderator";
  const pending = useMemo(() => competitions.filter((item) => item.status === "pending"), [competitions]);
  const visible = useMemo(() => competitions.filter((item) => tab === "all" || item.status === tab), [competitions, tab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    if (!supabaseClient) {
      setError("Supabase belum tersedia. Data moderator tidak dapat dimuat.");
      setLoading(false);
      return () => { active = false; };
    }

    Promise.all([
      supabaseClient.from("lombalink_competitions").select("*").order("submitted_at", { ascending: false }).limit(1000),
      supabaseClient.from("lombalink_profiles").select("id, full_name"),
      supabaseClient.from("lombalink_competitions").select("id", { count: "exact", head: true }),
      supabaseClient.from("lombalink_competitions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseClient.from("lombalink_competitions").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabaseClient.from("lombalink_profiles").select("id", { count: "exact", head: true }),
    ]).then(([competitionResult, profileResult, totalResult, pendingResult, approvedResult, profileCountResult]) => {
      if (!active) return;
      const failedResult = [competitionResult, profileResult, totalResult, pendingResult, approvedResult, profileCountResult].find((result) => result.error);
      if (failedResult) {
        setCompetitions([]);
        setStats(null);
        setError(`Data moderator gagal dimuat: ${failedResult.error.message}`);
        return;
      }

      const profileNames = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
      setCompetitions((competitionResult.data ?? []).map((row) => ({
        ...competitionFromRow(row),
        submittedBy: profileNames.get(row.submitted_by) || `ID ${row.submitted_by}`,
      })));
      setStats({
        total: totalResult.count ?? 0,
        pending: pendingResult.count ?? 0,
        approved: approvedResult.count ?? 0,
        profiles: profileCountResult.count ?? 0,
      });
    }).catch((loadError) => {
      if (active) {
        setCompetitions([]);
        setStats(null);
        setError(loadError instanceof Error ? loadError.message : "Data moderator gagal dimuat.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [reloadKey, supabaseClient]);

  const updateStatus = async (id, status) => {
    setActionId(id);
    setActionError("");
    try {
      const { error: updateError } = await supabaseClient
        .from("lombalink_competitions")
        .update({ status, reviewed_by: account.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) {
        setActionError(`Status pengajuan gagal diperbarui: ${updateError.message}`);
        return;
      }
      setReloadKey((current) => current + 1);
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Status pengajuan gagal diperbarui.");
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Brand onClick={() => navigate("/")} />
        <div className="sidebar-label">WORKSPACE</div>
        <button className={`sidebar-item ${section === "overview" ? "active" : ""}`} onClick={() => setSection("overview")}><LayoutDashboard size={17} /> Ringkasan</button>
        <button className={`sidebar-item ${section === "users" ? "active" : ""}`} onClick={() => setSection("users")}><UsersRound size={17} /> Pengguna</button>
        <button className="sidebar-item" onClick={() => { setSection("overview"); setTab("pending"); }}><Clock3 size={17} /> Verifikasi <span className="sidebar-count">{stats ? stats.pending.toLocaleString("id-ID") : "—"}</span></button>
        <button className="sidebar-item" onClick={() => { setSection("overview"); setTab("approved"); }}><CheckCircle2 size={17} /> Lomba terbit</button>
        <div className="sidebar-label sidebar-label-bottom">AKUN</div>
        <button className="sidebar-item" onClick={() => navigate("/")}><ArrowLeft size={17} /> Kembali ke situs</button>
        <div className="sidebar-user"><span className="avatar moderator-avatar">{moderatorName.slice(0, 1).toUpperCase()}</span><span><strong>{moderatorName}</strong><small>Moderator LombaLink</small></span><ShieldCheck size={15} /></div>
      </aside>
      <section className="admin-main">
        <div className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> <strong>{section === "users" ? "Pengguna" : "Ringkasan"}</strong></div><button className="admin-mobile-section" onClick={() => setSection(section === "users" ? "overview" : "users")}>{section === "users" ? <LayoutDashboard size={15} /> : <UsersRound size={15} />}{section === "users" ? "Ringkasan" : "Pengguna"}</button><div className="admin-top-actions"><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /><span className="admin-user-pill"><span className="avatar moderator-avatar">{moderatorName.slice(0, 1).toUpperCase()}</span> {moderatorName}</span><button className="icon-button" title="Keluar dari panel moderator" aria-label="Keluar" onClick={onLogout}><LogOut size={17} /></button></div></div>
        <div className="admin-content">
          {section === "users" ? <AdminUsersPanel supabaseClient={supabaseClient} moderatorId={account.id} /> : <>
          <div className="admin-welcome"><div><span className="eyebrow">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("id-ID")}</span><h1>Ruang kendali moderator</h1><p>Tinjau informasi baru dan bantu komunitas menemukan peluang yang terpercaya.</p></div><button className="button button-primary" onClick={() => navigate("/")}><ArrowLeft size={16} /> Lihat situs</button></div>
          {error && <div className="admin-users-error" role="alert">{error}<button onClick={() => setReloadKey((current) => current + 1)}>Coba lagi</button></div>}
          <div className="admin-stats grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            <div className="admin-stat"><span className="stat-icon stat-purple"><Trophy size={19} /></span><span className="stat-label">Total lomba</span><strong>{stats ? stats.total.toLocaleString("id-ID") : "—"}</strong><small>Data dari database</small></div>
            <div className="admin-stat"><span className="stat-icon stat-yellow"><Clock3 size={19} /></span><span className="stat-label">Menunggu verifikasi</span><strong>{stats ? stats.pending.toLocaleString("id-ID") : "—"}</strong><small>Perlu ditinjau moderator</small></div>
            <div className="admin-stat"><span className="stat-icon stat-green"><CheckCircle2 size={19} /></span><span className="stat-label">Lomba disetujui</span><strong>{stats ? stats.approved.toLocaleString("id-ID") : "—"}</strong><small>Data dari database</small></div>
            <div className="admin-stat"><span className="stat-icon stat-blue"><UsersRound size={19} /></span><span className="stat-label">Profil pengguna</span><strong>{stats ? stats.profiles.toLocaleString("id-ID") : "—"}</strong><small>Data dari database</small></div>
          </div>
          <div className="admin-table-card">
            <div className="table-heading"><div><h2>Pengajuan lomba</h2><p>Periksa kelengkapan informasi sebelum dipublikasikan.</p></div><button className="button button-outline button-small" onClick={() => setTab("all")}><SlidersHorizontal size={15} /> Semua</button></div>
            <div className="table-tabs"><button className={tab === "pending" ? "selected" : ""} onClick={() => setTab("pending")}>Menunggu <span>{stats ? stats.pending.toLocaleString("id-ID") : "—"}</span></button><button className={tab === "approved" ? "selected" : ""} onClick={() => setTab("approved")}>Disetujui</button><button className={tab === "rejected" ? "selected" : ""} onClick={() => setTab("rejected")}>Ditolak</button><button className={tab === "all" ? "selected" : ""} onClick={() => setTab("all")}>Semua</button></div>
            {actionError && <div className="admin-users-error" role="alert">{actionError}<button onClick={() => setActionError("")}>Tutup</button></div>}
            <div className="submission-list">
              {loading ? <div className="admin-empty"><LoaderCircle size={20} className="loading-icon" /><strong>Memuat data lomba...</strong></div> : visible.length ? visible.map((item) => <article className="submission-row" key={item.id}>
                <span className="submission-logo"><Trophy size={20} /></span>
                <div className="submission-info"><strong>{item.title}</strong><span>{item.organizer} <i>·</i> {item.category} <i>·</i> {item.education}</span><small>Diajukan oleh {item.submittedBy} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.submittedAt))}</small></div>
                <span className={`status-pill status-${item.status}`}>{item.status === "pending" ? <><i></i> Menunggu</> : item.status === "approved" ? <><Check size={12} /> Disetujui</> : "Ditolak"}</span>
                {item.status === "pending" ? <div className="submission-actions"><button title="Tolak pengajuan" className="reject-action" disabled={actionId === item.id} onClick={() => updateStatus(item.id, "rejected")}><span className="sr-only">Tolak</span><X size={16} /></button><button title="Setujui dan publikasikan" className="approve-action" disabled={actionId === item.id} onClick={() => updateStatus(item.id, "approved")}><Check size={16} /></button></div> : <span className="reviewed-label">Ditinjau</span>}
              </article>) : <div className="admin-empty"><CheckCircle2 size={22} /><strong>Tidak ada pengajuan di sini</strong><span>Tidak ada lomba dengan status ini di database.</span></div>}
            </div>
            <div className="table-footer"><span>{loading ? "Memuat pengajuan..." : `Menampilkan ${visible.length} pengajuan`}</span><button onClick={() => setTab("all")}>Lihat semua pengajuan <ArrowRight size={14} /></button></div>
          </div>
          <div className="admin-tip"><span><Sparkles size={17} /></span><p><strong>Tips moderasi:</strong> Pastikan tautan pendaftaran aktif dan informasi batas waktu terlihat jelas sebelum menyetujui lomba.</p></div>
          </>}
        </div>
      </section>
    </main>
  );
}
