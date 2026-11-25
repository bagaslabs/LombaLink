import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  Flag,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { Brand, CompetitionModal, ThemeToggle } from "../components.jsx";
import CompetitionForm from "../CompetitionForm.jsx";
import { competitionFieldsFromForm, competitionFromRow, getCompetitionCoverUrl } from "../data.js";
import {
  removeCompetitionCover,
  uploadCompetitionCover,
} from "../competitionService.js";
import AdminUsersPanel from "./AdminUsersPanel.jsx";
import AdminReportsPanel from "./AdminReportsPanel.jsx";
import AdminActivityPanel from "./AdminActivityPanel.jsx";

export default function AdminPage({ routePath = "/admin", account, supabaseClient, navigate, onLogout, onCompetitionsChanged, theme, onToggleTheme, suggestedKeywords = [] }) {
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
  const [createNotice, setCreateNotice] = useState("");
  const [reviewItem, setReviewItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const isCreatePage = routePath === "/admin/tambahkan-lomba";
  const moderatorName = account?.name || "Moderator";
  const tabDescriptions = {
    pending: "Pengajuan yang sudah dikirim dan belum ditinjau moderator.",
    approved: "Lomba yang sudah disetujui dan dapat dilihat peserta.",
    rejected: "Lomba yang ditolak beserta catatan perbaikan.",
    archived: "Lomba yang disembunyikan dari publik; arsip tidak selalu draft.",
    all: "Semua lomba beserta status pengajuan dan arsipnya.",
  };
  const visible = useMemo(() => competitions.filter((item) => {
    if (item.status === "draft") return false;
    return tab === "all"
      || (tab === "archived" ? Boolean(item.archivedAt) : !item.archivedAt && item.status === tab);
  }), [competitions, tab]);
  const sectionLabel = isCreatePage
    ? "Tambah lomba"
    : section === "users"
      ? "Pengguna"
      : section === "reports"
        ? "Laporan"
        : section === "logs"
          ? "Log Admin"
        : ({
          archived: "Arsip",
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
      supabaseClient.from("lombalink_competitions").select("id", { count: "exact", head: true }).neq("status", "draft"),
      supabaseClient.from("lombalink_competitions").select("id", { count: "exact", head: true }).eq("status", "pending").is("archived_at", null),
      supabaseClient.from("lombalink_competitions").select("id", { count: "exact", head: true }).eq("status", "approved").is("archived_at", null),
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
      setCompetitions((competitionResult.data ?? []).filter((row) => row.status !== "draft").map((row) => ({
        ...competitionFromRow(row),
        coverUrl: getCompetitionCoverUrl(supabaseClient, row.cover_path),
        guidebookUrl: row.guidebook_path
          ? getCompetitionCoverUrl(supabaseClient, row.guidebook_path)
          : row.rulebook_url || "",
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

  const updateStatus = async (id, status, note = "") => {
    setActionId(id);
    setActionError("");
    try {
      const { error: updateError } = await supabaseClient
        .from("lombalink_competitions")
        .update(status === "pending"
          ? { status, reviewed_by: null, reviewed_at: null, rejection_note: null }
          : { status, reviewed_by: account.id, reviewed_at: new Date().toISOString(), rejection_note: status === "rejected" ? note.trim() : null })
        .eq("id", id);
      if (updateError) {
        setActionError(`Status pengajuan gagal diperbarui: ${updateError.message}`);
        return false;
      }
      setReviewItem(null);
      setRejectItem(null);
      setRejectionNote("");
      setReloadKey((current) => current + 1);
      return true;
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Status pengajuan gagal diperbarui.");
      return false;
    } finally {
      setActionId("");
    }
  };

  const toggleArchive = async (item) => {
    setActionId(item.id);
    setActionError("");
    try {
      const { error: archiveError } = await supabaseClient
        .from("lombalink_competitions")
        .update({ archived_at: item.archivedAt ? null : new Date().toISOString() })
        .eq("id", item.id)
        .select("id")
        .single();
      if (archiveError) {
        setActionError(`Status arsip gagal diperbarui: ${archiveError.message}`);
        return;
      }
      setCreateNotice(item.archivedAt ? "Lomba dikembalikan dari arsip." : "Lomba berhasil diarsipkan.");
      setTab(item.archivedAt ? item.status : "archived");
      setReloadKey((current) => current + 1);
      onCompetitionsChanged?.();
    } catch (archiveError) {
      setActionError(archiveError instanceof Error ? archiveError.message : "Status arsip gagal diperbarui.");
    } finally {
      setActionId("");
    }
  };

  const deleteCompetition = async () => {
    if (!deleteItem) return;
    const item = deleteItem;
    setActionId(item.id);
    setDeleteError("");
    try {
      const { error: deleteErrorResult } = await supabaseClient
        .from("lombalink_competitions")
        .delete()
        .eq("id", item.id)
        .select("id")
        .single();
      if (deleteErrorResult) {
        setDeleteError(`Lomba gagal dihapus: ${deleteErrorResult.message}`);
        return;
      }

      setDeleteItem(null);
      setReviewItem((current) => current?.id === item.id ? null : current);
      setReloadKey((current) => current + 1);
      onCompetitionsChanged?.();

      const cleanupErrors = await Promise.all([
        item.coverPath ? removeCompetitionCover(supabaseClient, item.coverPath) : "",
        item.guidebookPath ? removeCompetitionCover(supabaseClient, item.guidebookPath) : "",
      ]);
      const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
      setCreateNotice(cleanupMessage
        ? `Lomba dihapus, tetapi ${cleanupMessage.toLowerCase()}`
        : "Lomba berhasil dihapus.");
    } catch (deleteErrorResult) {
      setDeleteError(deleteErrorResult instanceof Error
        ? `Lomba gagal dihapus: ${deleteErrorResult.message}`
        : "Lomba gagal dihapus.");
    } finally {
      setActionId("");
    }
  };

  const publishCompetition = async (form) => {
    if (!supabaseClient || !account?.id) return "Sesi moderator tidak tersedia. Silakan masuk kembali.";
    let coverPath = null;
    try {
      const competitionId = crypto.randomUUID();
      const saveAction = form.saveAction || "submit";
      const reviewedAt = new Date().toISOString();
      if (form.coverFile) {
        const upload = await uploadCompetitionCover(supabaseClient, account.id, competitionId, form.coverFile);
        if (upload.error) return upload.error;
        coverPath = upload.path;
      }
      const { error: insertError } = await supabaseClient.from("lombalink_competitions").insert({
        ...competitionFieldsFromForm(form),
        id: competitionId,
        cover_path: coverPath,
        guidebook_path: form.guidebookPath || null,
        rulebook_url: form.guidebookLinks?.find((link) => link.url.trim())?.url.trim() || form.guidebookUrl?.trim() || null,
        status: "approved",
        archived_at: saveAction === "archive" ? reviewedAt : null,
        submitted_by: account.id,
        reviewed_by: account.id,
        reviewed_at: reviewedAt,
      });
      if (insertError) {
        const cleanupErrors = await Promise.all([
          coverPath ? removeCompetitionCover(supabaseClient, coverPath) : "",
        ]);
        const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
        return `Lomba gagal diterbitkan: ${insertError.message}${cleanupMessage ? ` ${cleanupMessage}` : ""}`;
      }

      setCreateNotice(saveAction === "archive"
        ? "Lomba berhasil disimpan ke arsip."
        : "Lomba berhasil diterbitkan dan sekarang tampil untuk publik.");
      setTab(saveAction === "archive" ? "archived" : "approved");
      setReloadKey((current) => current + 1);
      onCompetitionsChanged?.();
      return "";
    } catch (insertError) {
      const cleanupErrors = await Promise.all([
        coverPath ? removeCompetitionCover(supabaseClient, coverPath) : "",
      ]);
      const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
      const message = insertError instanceof Error ? insertError.message : "kesalahan tidak diketahui.";
      return `Lomba gagal diterbitkan: ${message}${cleanupMessage ? ` ${cleanupMessage}` : ""}`;
    }
  };

  const updateModeratedCompetition = async (form) => {
    if (!supabaseClient || !account?.id || !editingItem) return "Sesi moderator tidak tersedia. Silakan masuk kembali.";
    const existing = editingItem;
    let coverPath = form.removeCover ? null : existing.coverPath || null;
    let uploadedCoverPath = "";
    const guidebookPath = form.guidebookPath || null;

    if (form.coverFile) {
      const upload = await uploadCompetitionCover(supabaseClient, account.id, existing.id, form.coverFile);
      if (upload.error) return upload.error;
      coverPath = upload.path;
      uploadedCoverPath = upload.path;
    }

    try {
      const { error: updateError } = await supabaseClient
        .from("lombalink_competitions")
        .update({
          ...competitionFieldsFromForm(form),
          cover_path: coverPath,
          guidebook_path: guidebookPath,
          rulebook_url: form.guidebookLinks?.find((link) => link.url.trim())?.url.trim() || form.guidebookUrl?.trim() || null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updateError) {
        const cleanupMessage = uploadedCoverPath
          ? await removeCompetitionCover(supabaseClient, uploadedCoverPath)
          : "";
        return `Perubahan lomba gagal disimpan: ${updateError.message}${cleanupMessage ? ` ${cleanupMessage}` : ""}`;
      }
    } catch (updateError) {
      const cleanupMessage = uploadedCoverPath
        ? await removeCompetitionCover(supabaseClient, uploadedCoverPath)
        : "";
      const message = updateError instanceof Error ? updateError.message : "kesalahan tidak diketahui.";
      return `Perubahan lomba gagal disimpan: ${message}${cleanupMessage ? ` ${cleanupMessage}` : ""}`;
    }

    const replacedPaths = [
      existing.coverPath !== coverPath ? existing.coverPath : "",
      existing.guidebookPath !== guidebookPath ? existing.guidebookPath : "",
    ].filter(Boolean);
    const cleanupErrors = await Promise.all(replacedPaths.map((path) => removeCompetitionCover(supabaseClient, path)));
    const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
    setCreateNotice(cleanupMessage
      ? `Lomba diperbarui, tetapi ${cleanupMessage.toLowerCase()}`
      : "Perubahan lomba berhasil disimpan.");
    setReloadKey((current) => current + 1);
    onCompetitionsChanged?.();
    return "";
  };

  const openCreatePage = () => {
    setSection("overview");
    setCreateNotice("");
    navigate("/admin/tambahkan-lomba");
  };
  const showAdminSection = (nextSection, nextTab) => {
    setSection(nextSection);
    if (nextTab) setTab(nextTab);
    if (isCreatePage) navigate("/admin");
  };
  const returnToAdmin = () => showAdminSection("overview");

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Brand onClick={() => navigate("/")} />
        <div className="sidebar-label">WORKSPACE</div>
        <button className={`sidebar-item ${!isCreatePage && section === "overview" ? "active" : ""}`} onClick={() => showAdminSection("overview", "all")}><LayoutDashboard size={17} /> Ringkasan</button>
        <button className={`sidebar-item ${isCreatePage ? "active" : ""}`} onClick={openCreatePage}><Plus size={17} /> Tambah Lomba</button>
        <button className={`sidebar-item ${!isCreatePage && section === "users" ? "active" : ""}`} onClick={() => showAdminSection("users")}><UsersRound size={17} /> Pengguna</button>
        <button className={`sidebar-item ${!isCreatePage && section === "reports" ? "active" : ""}`} onClick={() => showAdminSection("reports")}><Flag size={17} /> Laporan <span className="sidebar-count">{reportPendingCount === null ? "—" : reportPendingCount.toLocaleString("id-ID")}</span></button>
        <button className={`sidebar-item ${!isCreatePage && section === "logs" ? "active" : ""}`} onClick={() => showAdminSection("logs")}><ClipboardList size={17} /> Log Admin</button>
        <div className="sidebar-label sidebar-label-bottom">AKUN</div>
        <button className="sidebar-item" onClick={() => navigate("/")}><ArrowLeft size={17} /> Kembali ke situs</button>
        <div className="sidebar-user"><span className="avatar moderator-avatar">{moderatorName.slice(0, 1).toUpperCase()}</span><span><strong>{moderatorName}</strong><small>Moderator LombaLink</small></span><ShieldCheck size={15} /></div>
      </aside>
      <section className="admin-main">
        <div className="admin-topbar"><div className="admin-breadcrumb">Workspace <span>/</span> <strong>{sectionLabel}</strong></div><label className="sr-only" htmlFor="admin-mobile-section">Pilih bagian panel moderator</label><select id="admin-mobile-section" className="admin-mobile-section" value={isCreatePage ? "create" : ["users", "reports", "logs"].includes(section) ? section : ["pending", "approved"].includes(tab) ? "all" : tab} onChange={(event) => {
          const value = event.target.value;
          if (value === "create") {
            openCreatePage();
            return;
          }
          if (value === "users" || value === "reports" || value === "logs") {
            showAdminSection(value);
          } else {
            showAdminSection("overview", value);
          }
        }}>
          <option value="all">Ringkasan</option>
          <option value="create">Tambah Lomba</option>
          <option value="archived">Arsip</option>
          <option value="rejected">Lomba ditolak</option>
          <option value="users">Pengguna</option>
          <option value="reports">Laporan</option>
          <option value="logs">Log Admin</option>
        </select><div className="admin-top-actions"><ThemeToggle theme={theme} onToggleTheme={onToggleTheme} /><span className="admin-user-pill"><span className="avatar moderator-avatar">{moderatorName.slice(0, 1).toUpperCase()}</span> {moderatorName}</span><button className="icon-button" title="Keluar dari panel moderator" aria-label="Keluar" onClick={onLogout}><LogOut size={17} /></button></div></div>
        <div className="admin-content">
          {isCreatePage
            ? <div className="admin-create-page">
              <button className="button button-outline button-small admin-create-back" onClick={returnToAdmin}><ArrowLeft size={15} /> Kembali ke panel</button>
              <CompetitionForm
                mode="moderator"
                suggestedKeywords={[...suggestedKeywords, ...competitions.flatMap((item) => item.keywords || [])]}
                suggestedCompetitions={competitions}
                persistenceKey={`lombalink.competition-form.v1.${account.id}.moderator-new`}
                onSubmit={publishCompetition}
                onCancel={returnToAdmin}
                onSuccess={returnToAdmin}
              />
            </div>
            : section === "users"
              ? <AdminUsersPanel supabaseClient={supabaseClient} moderatorId={account.id} />
              : section === "reports"
                ? <AdminReportsPanel supabaseClient={supabaseClient} moderatorId={account.id} onPendingCountChange={setReportPendingCount} />
                : section === "logs"
                  ? <AdminActivityPanel supabaseClient={supabaseClient} />
                : <>
          <div className="admin-welcome"><div><span className="eyebrow">{new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toLocaleUpperCase("id-ID")}</span><h1>Ruang kendali moderator</h1><p>Tinjau informasi baru dan bantu komunitas menemukan peluang yang terpercaya.</p></div><div className="admin-welcome-actions"><button className="button button-outline" onClick={() => navigate("/")}><ArrowLeft size={16} /> Lihat situs</button><button className="button button-primary" onClick={openCreatePage}><Plus size={16} /> Tambah Lomba</button></div></div>
          {createNotice && <div className="admin-users-notice admin-publish-notice" role="status"><CheckCircle2 size={16} /> {createNotice}<button onClick={() => setCreateNotice("")} aria-label="Tutup pemberitahuan"><X size={15} /></button></div>}
          {error && <div className="admin-users-error" role="alert">{error}<button onClick={() => setReloadKey((current) => current + 1)}>Coba lagi</button></div>}
          <div className="admin-stats grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            <div className="admin-stat"><span className="stat-icon stat-purple"><Trophy size={19} /></span><span className="stat-label">Total lomba</span><strong>{stats ? stats.total.toLocaleString("id-ID") : "—"}</strong><small>Data dari database</small></div>
            <div className="admin-stat"><span className="stat-icon stat-yellow"><Clock3 size={19} /></span><span className="stat-label">Menunggu verifikasi</span><strong>{stats ? stats.pending.toLocaleString("id-ID") : "—"}</strong><small>Perlu ditinjau moderator</small></div>
            <div className="admin-stat"><span className="stat-icon stat-green"><CheckCircle2 size={19} /></span><span className="stat-label">Lomba disetujui</span><strong>{stats ? stats.approved.toLocaleString("id-ID") : "—"}</strong><small>Data dari database</small></div>
            <div className="admin-stat"><span className="stat-icon stat-blue"><UsersRound size={19} /></span><span className="stat-label">Profil pengguna</span><strong>{stats ? stats.profiles.toLocaleString("id-ID") : "—"}</strong><small>Data dari database</small></div>
          </div>
          <div className="admin-table-card">
            <div className="table-heading"><div><h2>Pengajuan lomba</h2><p>{tabDescriptions[tab]}</p></div><button className="button button-outline button-small" onClick={() => setTab("all")}><SlidersHorizontal size={15} /> Semua</button></div>
            <div className="table-tabs">
              <button className={tab === "pending" ? "selected" : ""} title="Sudah dikirim, belum ditinjau" onClick={() => setTab("pending")}>Menunggu <span>{stats ? stats.pending.toLocaleString("id-ID") : "—"}</span></button>
              <button className={tab === "approved" ? "selected" : ""} title="Sudah disetujui dan dapat dilihat publik" onClick={() => setTab("approved")}>Disetujui</button>
              <button className={tab === "rejected" ? "selected" : ""} title="Ditolak setelah ditinjau" onClick={() => setTab("rejected")}>Ditolak</button>
              <button className={tab === "archived" ? "selected" : ""} title="Disembunyikan dari publik, status sebelumnya tetap dipertahankan" onClick={() => setTab("archived")}>Arsip <small>disembunyikan</small></button>
              <button className={tab === "all" ? "selected" : ""} onClick={() => setTab("all")}>Semua</button>
            </div>
            {actionError && <div className="admin-users-error" role="alert">{actionError}<button onClick={() => setActionError("")}>Tutup</button></div>}
            <div className="submission-list">
              {loading ? <div className="admin-empty"><LoaderCircle size={20} className="loading-icon" /><strong>Memuat data lomba...</strong></div> : visible.length ? visible.map((item) => <article className="submission-row" key={item.id}>
                <span className="submission-logo"><Trophy size={20} /></span>
                <div className="submission-info"><button className="submission-title-button" onClick={() => setReviewItem(item)}>{item.title}</button><span>{item.organizer} <i>·</i> {item.category} <i>·</i> {item.education}</span><small>Diajukan oleh {item.submittedBy} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.submittedAt))}</small></div>
                <span
                  className={`status-pill ${item.archivedAt ? "status-archived" : `status-${item.status}`}`}
                  title={item.archivedAt
                    ? item.status === "draft" ? "Arsip — data draft yang disembunyikan dan belum dikirim" : "Arsip — disembunyikan dari publik"
                    : item.status === "draft" ? "Draft — belum dikirim untuk ditinjau" : item.status === "pending" ? "Menunggu verifikasi moderator" : item.status === "approved" ? "Disetujui dan dapat dilihat publik" : "Ditolak oleh moderator"}
                >
                  {item.archivedAt
                    ? item.status === "draft" ? "Arsip · Draft" : "Diarsipkan"
                    : item.status === "draft"
                      ? "Draft"
                      : item.status === "pending"
                        ? <><i></i> Menunggu</>
                        : item.status === "approved"
                          ? <><Check size={12} /> Disetujui</>
                          : "Ditolak"}
                </span>
                <div className="submission-actions">
                  <button title={item.archivedAt ? "Kembalikan dari arsip agar status sebelumnya aktif kembali" : "Arsipkan lomba untuk disembunyikan dari publik"} className="archive-action" disabled={actionId === item.id} onClick={() => toggleArchive(item)}><span className="sr-only">{item.archivedAt ? "Kembalikan dari arsip" : "Arsipkan lomba"}</span><Archive size={16} /></button>
                  <button
                    type="button"
                    title="Edit lomba"
                    aria-label={`Edit lomba ${item.title}`}
                    className="edit-action"
                    disabled={Boolean(actionId)}
                    onClick={() => {
                      setReviewItem(null);
                      setEditingItem(item);
                    }}
                  ><Pencil size={15} /></button>
                  {item.status === "pending" ? <><button title="Tolak pengajuan" className="reject-action" disabled={actionId === item.id} onClick={() => { setRejectionNote(""); setRejectItem(item); }}><span className="sr-only">Tolak</span><X size={16} /></button><button title="Setujui dan publikasikan" className="approve-action" disabled={actionId === item.id} onClick={() => updateStatus(item.id, "approved")}><span className="sr-only">Setujui</span><Check size={16} /></button></> : item.status === "rejected" ? <button title="Kembalikan ke menunggu" className="archive-action" disabled={actionId === item.id} onClick={() => updateStatus(item.id, "pending")}><span className="sr-only">Kembalikan ke menunggu</span><ArrowLeft size={16} /></button> : item.status === "draft" ? <span className="reviewed-label">Belum dikirim</span> : null}
                  <button
                    title="Hapus lomba"
                    aria-label={`Hapus lomba ${item.title}`}
                    className="delete-action"
                    disabled={Boolean(actionId)}
                    onClick={() => { setDeleteError(""); setDeleteItem(item); }}
                  ><Trash2 size={16} /></button>
                </div>
              </article>) : <div className="admin-empty"><CheckCircle2 size={22} /><strong>Tidak ada pengajuan di sini</strong><span>Tidak ada lomba dengan status ini di database.</span></div>}
            </div>
            <div className="table-footer"><span>{loading ? "Memuat pengajuan..." : `Menampilkan ${visible.length} pengajuan`}</span><button onClick={() => setTab("all")}>Lihat semua pengajuan <ArrowRight size={14} /></button></div>
          </div>
          </>}
        </div>
      </section>
      <CompetitionModal
        item={reviewItem}
        onClose={() => setReviewItem(null)}
        moderationActions={{
          busy: actionId === reviewItem?.id,
          onApprove: () => updateStatus(reviewItem.id, "approved"),
          onReject: () => { setRejectionNote(""); setRejectItem(reviewItem); },
        }}
      />
      {rejectItem && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !actionId && setRejectItem(null)}>
        <section className="modal-card admin-rejection-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <span className="eyebrow">TINJAUAN PENGAJUAN</span>
          <h2 id="reject-title">Tolak pengajuan?</h2>
          <p className="modal-intro">Jelaskan alasan penolakan untuk membantu pengaju memperbaiki informasi lomba.</p>
          <label className="admin-rejection-label" htmlFor="rejection-note">Catatan penolakan <span>(wajib)</span></label>
          <textarea id="rejection-note" value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} minLength={5} maxLength={1000} rows={5} placeholder="Contoh: Tautan pendaftaran tidak dapat dibuka. Mohon perbarui tautannya." required />
          {actionError && <p className="form-error" role="alert">{actionError}</p>}
          <div className="admin-user-confirm-actions"><button className="button button-outline" type="button" disabled={Boolean(actionId)} onClick={() => setRejectItem(null)}>Batal</button><button className="button button-primary" type="button" disabled={Boolean(actionId) || rejectionNote.trim().length < 5} onClick={() => updateStatus(rejectItem.id, "rejected", rejectionNote)}>{actionId ? "Menyimpan..." : "Tolak pengajuan"}</button></div>
        </section>
      </div>}
      {editingItem && (
        <div className="admin-competition-edit-backdrop">
          <section className="admin-competition-edit-dialog" role="dialog" aria-modal="true" aria-label={`Edit lomba ${editingItem.title}`}>
            <div className="admin-competition-edit-toolbar">
              <span className="eyebrow">EDIT LOMBA</span>
              <button type="button" className="admin-competition-edit-close" aria-label="Tutup pengeditan" onClick={() => setEditingItem(null)}>
                <X size={18} />
              </button>
            </div>
            <CompetitionForm
              mode="moderator"
              initialCompetition={editingItem}
              suggestedKeywords={[...suggestedKeywords, ...competitions.flatMap((item) => item.keywords || [])]}
              suggestedCompetitions={competitions}
              persistenceKey={`lombalink.competition-form.v1.${account.id}.moderator-edit.${editingItem.id}`}
              onSubmit={updateModeratedCompetition}
              onCancel={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
            />
          </section>
        </div>
      )}
      {deleteItem && <div
        className="modal-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !actionId) {
            setDeleteItem(null);
            setDeleteError("");
          }
        }}
      >
        <section className="modal-card admin-competition-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-delete-competition-title">
          <span className="eyebrow">HAPUS LOMBA</span>
          <h2 id="admin-delete-competition-title">Hapus “{deleteItem.title}”?</h2>
          <p className="admin-user-confirm-copy">Lomba akan dihapus permanen. Laporan dan data analitik yang terkait juga ikut terhapus.</p>
          {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
          <div className="admin-user-confirm-actions">
            <button className="button button-outline" type="button" disabled={Boolean(actionId)} onClick={() => { setDeleteItem(null); setDeleteError(""); }}>Batal</button>
            <button className="button-danger" type="button" disabled={Boolean(actionId)} onClick={deleteCompetition}>
              <Trash2 size={15} /> {actionId === deleteItem.id ? "Menghapus..." : "Hapus permanen"}
            </button>
          </div>
        </section>
      </div>}
    </main>
  );
}
