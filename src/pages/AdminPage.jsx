import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { Brand, CompetitionModal, ThemeToggle } from "../components.jsx";
import CompetitionForm from "../CompetitionForm.jsx";
import { competitionFieldsFromForm, competitionFromRow, getCompetitionCoverUrl } from "../data.js";
import { removeCompetitionCover, uploadCompetitionCover } from "../competitionService.js";
import AdminUsersPanel from "./AdminUsersPanel.jsx";
import AdminReportsPanel from "./AdminReportsPanel.jsx";

export default function AdminPage({ account, supabaseClient, navigate, onLogout, onCompetitionsChanged, theme, onToggleTheme }) {
  const [tab, setTab] = useState("pending");
  const [section, setSection] = useState("overview");
  const [competitions, setCompetitions] = useState([]);
  const [stats, setStats] = useState(null);
  const [reportPendingCount, setReportPendingCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionId, setActionId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createNotice, setCreateNotice] = useState("");
  const [reviewItem, setReviewItem] = useState(null);
  const moderatorName = account?.name || "Moderator";
  const visible = useMemo(() => competitions.filter((item) => tab === "all" || item.status === tab), [competitions, tab]);
  const sectionLabel = section === "users"
    ? "Pengguna"
    : section === "reports"
      ? "Laporan"
      : ({
        pending: "Verifikasi",
        approved: "Lomba terbit",
        rejected: "Lomba ditolak",
      }[tab] || "Ringkasan");

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
        coverUrl: getCompetitionCoverUrl(supabaseClient, row.cover_path),
        submittedBy: profileNames.get(row.submitted_by) || (row.submitted_by === account.id ? moderatorName : `ID ${row.submitted_by}`),
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
  }, [account.id, moderatorName, reloadKey, supabaseClient]);

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
        return false;
      }
      setReviewItem(null);
      setReloadKey((current) => current + 1);
      return true;
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Status pengajuan gagal diperbarui.");
      return false;
    } finally {
      setActionId("");
    }
  };

  const publishCompetition = async (form) => {
    if (!supabaseClient || !account?.id) return "Sesi moderator tidak tersedia. Silakan masuk kembali.";
    let coverPath = null;
    try {
      const competitionId = crypto.randomUUID();
      if (form.coverFile) {
        const upload = await uploadCompetitionCover(supabaseClient, account.id, competitionId, form.coverFile);
        if (upload.error) return upload.error;
        coverPath = upload.path;
      }

      const reviewedAt = new Date().toISOString();
      const { error: insertError } = await supabaseClient.from("lombalink_competitions").insert({
        ...competitionFieldsFromForm(form),
        id: competitionId,
        cover_path: coverPath,
        status: "approved",
        submitted_by: account.id,
        reviewed_by: account.id,
        reviewed_at: reviewedAt,
      });
      if (insertError) {
        const cleanupError = coverPath ? await removeCompetitionCover(supabaseClient, coverPath) : "";
        return `Lomba gagal diterbitkan: ${insertError.message}${cleanupError ? ` ${cleanupError}` : ""}`;
      }

      setCreateNotice("Lomba berhasil diterbitkan dan sekarang tampil untuk publik.");
      setTab("approved");
      setReloadKey((current) => current + 1);
      onCompetitionsChanged?.();
      return "";
    } catch (insertError) {
      const cleanupError = coverPath ? await removeCompetitionCover(supabaseClient, coverPath) : "";
      const message = insertError instanceof Error ? insertError.message : "kesalahan tidak diketahui.";
      return `Lomba gagal diterbitkan: ${message}${cleanupError ? ` ${cleanupError}` : ""}`;
    }
  };

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Brand onClick={() => navigate("/")} />
        <div className="sidebar-label">WORKSPACE</div>
        <button className={`sidebar-item ${section === "overview" && tab === "all" ? "active" : ""}`} onClick={() => { setSection("overview"); setTab("all"); }}><LayoutDashboard size={17} /> Ringkasan</button>
        <button className={`sidebar-item ${section === "users" ? "active" : ""}`} onClick={() => setSection("users")}><UsersRound size={17} /> Pengguna</button>
        <button className={`sidebar-item ${section === "overview" && tab === "pending" ? "active" : ""}`} onClick={() => { setSection("overview"); setTab("pending"); }}><Clock3 size={17} /> Verifikasi <span className="sidebar-count">{stats ? stats.pending.toLocaleString("id-ID") : "—"}</span></button>
        <button className={`sidebar-item ${section === "overview" && tab === "approved" ? "active" : ""}`} onClick={() => { setSection("overview"); setTab("approved"); }}><CheckCircle2 size={17} /> Lomba terbit</button>
        <button className={`sidebar-item ${section === "reports" ? "active" : ""}`} onClick={() => setSection("reports")}><Flag size={17} /> Laporan <span className="sidebar-count">{reportPendingCount === null ? "—" : reportPendingCount.toLocaleString("id-ID")}</span></button>
        <div className="sidebar-label sidebar-label-bottom">AKUN</div>
        <button className="sidebar-item" onClick={() => navigate("/")}><ArrowLeft size={17} /> Kembali ke situs</button>
        <div className="sidebar-user"><span className="avatar moderator-avatar">{moderatorName.slice(0, 1).toUpperCase()}</span><span><strong>{moderatorName}</strong><small>Moderator LombaLink</small></span><ShieldCheck size={15} /></div>
      </aside>
      <section className="admin-main">
        <div className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> <strong>{sectionLabel}</strong></div><label className="sr-only" htmlFor="admin-mobile-section">Pilih bagian panel moderator</label><select id="admin-mobile-section" className="admin-mobile-section" value={section === "users" || section === "reports" ? section : tab} onChange={(event) => {
          const value = event.target.value;
          if (value === "users" || value === "reports") {
            setSection(value);
          } else {
            setSection("overview");
            setTab(value);
          }
        }}>
          <option value="all">Ringkasan</option>
          <option value="pending">Verifikasi</option>
          <option value="approved">Lomba terbit</option>
          <option value="rejected">Lomba ditolak</option>
          <option value="users">Pengguna</option>
          <option value="reports">Laporan</option>
        </select><div className="admin-top-actions"><ThemeToggle theme={theme} onToggleTheme={toggleTheme} /><span className="admin-user-pill"><span className="avatar moderator-avatar">{moderatorName.slice(0, 1).toUpperCase()}</span> {moderatorName}</span><button className="icon-button" title="Keluar dari panel moderator" aria-label="Keluar" onClick={onLogout}><LogOut size={17} /></button></div></div>
        <div className="admin-content">
          {section === "users"
            ? <AdminUsersPanel supabaseClient={supabaseClient} moderatorId={account.id} />
            : section === "reports"
              ? <AdminReportsPanel supabaseClient={supabaseClient} moderatorId={account.id} onPendingCountChange={setReportPendingCount} />
              : <>
          <div className="admin-welcome"><div><span className="eyebrow">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("id-ID")}</span><h1>Ruang kendali moderator</h1><p>Tinjau informasi baru dan bantu komunitas menemukan peluang yang terpercaya.</p></div><div className="admin-welcome-actions"><button className="button button-outline" onClick={() => navigate("/")}><ArrowLeft size={16} /> Lihat situs</button><button className="button button-primary" onClick={() => { setCreateNotice(""); setCreateModalOpen(true); }}><Plus size={16} /> Tambah Lomba</button></div></div>
          {createNotice && <div className="admin-users-notice admin-publish-notice" role="status"><CheckCircle2 size={16} /> {createNotice}<button onClick={() => setCreateNotice("")} aria-label="Tutup pemberitahuan"><X size={15} /></button></div>}
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
                <div className="submission-info"><button className="submission-title-button" onClick={() => setReviewItem(item)}>{item.title}</button><span>{item.organizer} <i>·</i> {item.category} <i>·</i> {item.education}</span><small>Diajukan oleh {item.submittedBy} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.submittedAt))}</small></div>
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
      {createModalOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setCreateModalOpen(false)}>
        <section className="modal-card competition-admin-modal" role="dialog" aria-modal="true" aria-labelledby="create-competition-title">
          <button className="modal-close" onClick={() => setCreateModalOpen(false)} aria-label="Tutup"><X size={19} /></button>
          <CompetitionForm mode="moderator" onSubmit={publishCompetition} onCancel={() => setCreateModalOpen(false)} onSuccess={() => setCreateModalOpen(false)} />
        </section>
      </div>}
      <CompetitionModal
        item={reviewItem}
        onClose={() => setReviewItem(null)}
        moderationActions={{
          busy: actionId === reviewItem?.id,
          onApprove: () => updateStatus(reviewItem.id, "approved"),
          onReject: () => updateStatus(reviewItem.id, "rejected"),
        }}
      />
    </main>
  );
}
