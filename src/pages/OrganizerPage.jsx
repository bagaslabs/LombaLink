import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Brand, ThemeToggle } from "../components.jsx";
import CompetitionForm from "../CompetitionForm.jsx";
import {
  competitionFieldsFromForm,
  competitionFromRow,
  getCompetitionCoverUrl,
} from "../data.js";
import {
  removeCompetitionCover,
  uploadCompetitionCover,
} from "../competitionService.js";

const pageDetails = {
  "/lomba/tambahkan": { title: "Tambahkan lomba", eyebrow: "PUBLIKASIKAN PELUANG" },
  "/lomba/manajemen": { title: "Manajemen lomba", eyebrow: "WORKSPACE PENYELENGGARA" },
  "/lomba/analisis": { title: "Analisis", eyebrow: "PERFORMA INFORMASI LOMBA" },
};

function statusLabel(item) {
  if (item.archivedAt) return "Diarsipkan";
  if (item.status === "draft") return "Draft";
  if (item.status === "approved") return "Tayang";
  if (item.status === "rejected") return "Perlu perbaikan";
  return "Menunggu verifikasi";
}

function formatLongDate(value) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

export default function OrganizerPage({
  account,
  supabaseClient,
  route,
  navigate,
  onLogout,
  suggestedKeywords = [],
  formPersistenceKey,
  onCompetitionsChanged,
  theme,
  onToggleTheme,
}) {
  const routePath = route.split("?")[0];
  const editId = new URLSearchParams(route.slice(route.indexOf("?") + 1)).get("edit") || "";
  const currentPage = pageDetails[routePath] ? routePath : "/lomba/manajemen";
  const [competitions, setCompetitions] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionId, setActionId] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(5);
  const competitionsLoadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (!competitionsLoadedRef.current) setLoading(true);
    setLoadError("");
    setAnalyticsError("");

    Promise.all([
      supabaseClient
        .from("lombalink_competitions")
        .select("*")
        .eq("submitted_by", account.id)
        .order("submitted_at", { ascending: false })
        .limit(500),
      supabaseClient.rpc("lombalink_my_competition_analytics"),
    ]).then(([competitionResult, analyticsResult]) => {
      if (!active) return;
      if (competitionResult.error) {
        setCompetitions([]);
        setLoadError(`Daftar lomba gagal dimuat: ${competitionResult.error.message}`);
      } else {
        setCompetitions((competitionResult.data ?? []).map((row) => {
          const item = competitionFromRow(row);
          return {
            ...item,
            coverUrl: getCompetitionCoverUrl(supabaseClient, item.coverPath),
            guidebookUrl: item.rulebookUrl || (item.guidebookPath
              ? getCompetitionCoverUrl(supabaseClient, item.guidebookPath)
              : ""),
          };
        }));
      }

      if (analyticsResult.error) {
        setAnalytics({});
        setAnalyticsError(`Analisis gagal dimuat: ${analyticsResult.error.message}`);
      } else {
        setAnalytics(Object.fromEntries((analyticsResult.data ?? []).map((item) => [
          item.competition_id,
          { views: Number(item.views), registrationClicks: Number(item.registration_clicks) },
        ])));
      }
    }).catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Workspace lomba gagal dimuat.");
    }).finally(() => {
      if (active) {
        competitionsLoadedRef.current = true;
        setLoading(false);
      }
    });

    return () => { active = false; };
  }, [account.id, reloadKey, supabaseClient]);

  useEffect(() => {
    if (routePath !== "/lomba/terima-kasih") return undefined;
    setSecondsLeft(5);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, 5 - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) navigate("/lomba/manajemen");
    }, 250);
    return () => window.clearInterval(interval);
  }, [navigate, routePath]);

  const editingCompetition = useMemo(
    () => competitions.find((item) => item.id === editId) || null,
    [competitions, editId],
  );
  const competitionKeywordSuggestions = useMemo(
    () => [...new Set([...suggestedKeywords, ...competitions.flatMap((item) => item.keywords || [])])],
    [competitions, suggestedKeywords],
  );
  const matchingCompetitions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return competitions.filter((item) => {
      if (filter === "archived" ? !item.archivedAt : item.archivedAt) return false;
      if (filter === "drafts" && item.status !== "draft") return false;
      if (filter === "active" && (item.status === "rejected" || item.status === "draft")) return false;
      return !query || `${item.title} ${item.organizer} ${item.category} ${item.keywords.join(" ")}`.toLocaleLowerCase("id-ID").includes(query);
    });
  }, [competitions, filter, search]);
  const publishedCompetitions = competitions.filter((item) => item.status === "approved" && !item.archivedAt);
  const totalViews = Object.values(analytics).reduce((total, item) => total + item.views, 0);
  const totalClicks = Object.values(analytics).reduce((total, item) => total + item.registrationClicks, 0);
  const activeTitle = routePath === "/lomba/tambahkan" ? (editId ? "Ubah lomba" : "Tambahkan lomba") : pageDetails[currentPage].title;

  const saveCompetition = async (form) => {
    if (!supabaseClient || !account?.id) return "Sesi login tidak tersedia. Silakan masuk kembali.";
    const existing = editingCompetition;
    const competitionId = existing?.id || crypto.randomUUID();
    let coverPath = form.removeCover ? null : existing?.coverPath || null;
    let uploadedCoverPath = "";
    const guidebookPath = form.guidebookPath || null;

    if (form.coverFile) {
      const upload = await uploadCompetitionCover(supabaseClient, account.id, competitionId, form.coverFile);
      if (upload.error) return upload.error;
      coverPath = upload.path;
      uploadedCoverPath = upload.path;
    }
    const saveAction = form.saveAction || "submit";
    const values = {
      ...competitionFieldsFromForm(form),
      cover_path: coverPath,
      guidebook_path: guidebookPath,
      rulebook_url: form.guidebookUrl?.trim() || null,
      archived_at: saveAction === "archive"
        ? new Date().toISOString()
        : saveAction === "submit" && existing
          ? null
          : existing?.archivedAt || null,
    };
    if (existing && saveAction === "submit") {
      values.status = "pending";
      values.reviewed_by = null;
      values.reviewed_at = null;
    }
    let result;
    try {
      result = existing
        ? await supabaseClient
          .from("lombalink_competitions")
          .update(values)
          .eq("id", existing.id)
          .eq("submitted_by", account.id)
          .select("id")
          .single()
        : await supabaseClient
          .from("lombalink_competitions")
          .insert({
            ...values,
            status: saveAction === "submit" ? "pending" : "draft",
            submitted_by: account.id,
          })
          .select("id")
          .single();
    } catch (error) {
      const cleanupErrors = await Promise.all([
        uploadedCoverPath ? removeCompetitionCover(supabaseClient, uploadedCoverPath) : "",
      ]);
      const message = error instanceof Error ? error.message : "kesalahan tidak diketahui.";
      return `Lomba gagal disimpan: ${message}${cleanupErrors.filter(Boolean).join(" ") ? ` ${cleanupErrors.filter(Boolean).join(" ")}` : ""}`;
    }

    if (result.error) {
      const cleanupErrors = await Promise.all([
        uploadedCoverPath ? removeCompetitionCover(supabaseClient, uploadedCoverPath) : "",
      ]);
      const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
      return `Lomba gagal disimpan: ${result.error.message}${cleanupMessage ? ` ${cleanupMessage}` : ""}`;
    }

    const replacedPaths = [
      existing?.coverPath !== coverPath ? existing?.coverPath : "",
      existing?.guidebookPath !== guidebookPath ? existing?.guidebookPath : "",
    ].filter(Boolean);
    if (replacedPaths.length) {
      const cleanupErrors = await Promise.all(replacedPaths.map((path) => removeCompetitionCover(supabaseClient, path)));
      const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
      if (cleanupMessage) setNotice(`Informasi lomba tersimpan, tetapi ${cleanupMessage.toLowerCase()}`);
    }

    setReloadKey((current) => current + 1);
    onCompetitionsChanged?.();
    return "";
  };

  const saveSucceeded = (saveAction) => {
    if (saveAction === "draft") {
      setNotice("Draft lomba berhasil disimpan dan bisa dilanjutkan nanti.");
      setFilter("drafts");
      navigate("/lomba/manajemen");
      return;
    }
    if (saveAction === "archive") {
      setNotice("Lomba berhasil disimpan ke arsip.");
      setFilter("archived");
      navigate("/lomba/manajemen");
      return;
    }
    if (editId) {
      setNotice("Perubahan lomba dikirim untuk ditinjau.");
      navigate("/lomba/manajemen");
    } else {
      navigate("/lomba/terima-kasih");
    }
  };

  const toggleArchive = async (item) => {
    setActionId(item.id);
    setNotice("");
    setLoadError("");
    try {
      const { error } = await supabaseClient
        .from("lombalink_competitions")
        .update({ archived_at: item.archivedAt ? null : new Date().toISOString() })
        .eq("id", item.id)
        .eq("submitted_by", account.id)
        .select("id")
        .single();
      if (error) {
        setLoadError(`Status arsip gagal diperbarui: ${error.message}`);
      } else {
        setNotice(item.archivedAt ? "Lomba dikembalikan dari arsip." : "Lomba berhasil diarsipkan.");
        setReloadKey((current) => current + 1);
        onCompetitionsChanged?.();
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Status arsip gagal diperbarui.");
    } finally {
      setActionId("");
    }
  };

  const deleteCompetition = async () => {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    setLoadError("");
    try {
      const { error } = await supabaseClient
        .from("lombalink_competitions")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("submitted_by", account.id)
        .select("id")
        .single();
      if (error) {
        setLoadError(`Lomba gagal dihapus: ${error.message}`);
        return;
      }

      const cleanupErrors = await Promise.all([
        deleteTarget.coverPath ? removeCompetitionCover(supabaseClient, deleteTarget.coverPath) : "",
        deleteTarget.guidebookPath ? removeCompetitionCover(supabaseClient, deleteTarget.guidebookPath) : "",
      ]);
      const cleanupMessage = cleanupErrors.filter(Boolean).join(" ");
      setNotice(cleanupMessage ? `Lomba dihapus, tetapi ${cleanupMessage.toLowerCase()}` : "Lomba berhasil dihapus.");
      setDeleteTarget(null);
      setReloadKey((current) => current + 1);
      onCompetitionsChanged?.();
    } catch (error) {
      setLoadError(`Lomba mungkin sudah terhapus, tetapi responsnya gagal: ${error instanceof Error ? error.message : "kesalahan tidak diketahui."}`);
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="organizer-page">
      <aside className="organizer-sidebar">
        <Brand onClick={() => navigate("/")} />
        <span className="organizer-sidebar-label">WORKSPACE</span>
        <button className={`organizer-nav-item ${currentPage === "/lomba/tambahkan" ? "active" : ""}`} onClick={() => navigate("/lomba/tambahkan")}><Plus size={17} /> Tambah Lomba</button>
        <button className={`organizer-nav-item ${currentPage === "/lomba/manajemen" ? "active" : ""}`} onClick={() => navigate("/lomba/manajemen")}><LayoutDashboard size={17} /> Manajemen Lomba</button>
        <button className={`organizer-nav-item ${currentPage === "/lomba/analisis" ? "active" : ""}`} onClick={() => navigate("/lomba/analisis")}><BarChart3 size={17} /> Analisis</button>
        <div className="organizer-sidebar-spacer" />
        <button className="organizer-nav-item" onClick={() => navigate("/")}><ArrowRight className="organizer-back-icon" size={16} /> Kembali ke situs</button>
        <div className="organizer-sidebar-account"><span className="avatar">{account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : account.name.slice(0, 1).toUpperCase()}</span><span><strong>{account.name}</strong><small>Penyelenggara</small></span><button aria-label="Keluar" title="Keluar" onClick={onLogout}><LogOut size={16} /></button></div>
      </aside>

      <section className="organizer-main">
        <header className="organizer-topbar">
          <div className="organizer-breadcrumb">Workspace <span>/</span> <strong>{activeTitle}</strong></div>
          <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
        </header>
        <div className="organizer-content">
          {notice && <div className="admin-users-notice organizer-notice" role="status"><CheckCircle2 size={16} /> {notice}<button onClick={() => setNotice("")} aria-label="Tutup pemberitahuan">×</button></div>}
          {loadError && <div className="admin-users-error organizer-notice" role="alert">{loadError}<button onClick={() => setReloadKey((current) => current + 1)}>Coba lagi</button></div>}

          {routePath === "/lomba/tambahkan" && (
            loading && editId && !editingCompetition
              ? <div className="organizer-loading" role="status"><LoaderCircle className="loading-icon" size={20} /> Memuat lomba...</div>
              : editId && !editingCompetition
                ? <div className="organizer-empty"><strong>Lomba tidak ditemukan</strong><p>Pastikan lomba ini milik akun yang sedang digunakan.</p><button className="button button-outline" onClick={() => navigate("/lomba/manajemen")}>Kembali ke manajemen</button></div>
                : <CompetitionForm
                  key={editId || "new"}
                  initialCompetition={editingCompetition}
                  suggestedKeywords={competitionKeywordSuggestions}
                  persistenceKey={formPersistenceKey}
                  onSubmit={saveCompetition}
                  onCancel={() => navigate("/lomba/manajemen")}
                  onSuccess={saveSucceeded}
                />
          )}

          {routePath === "/lomba/manajemen" && (
            <>
              <div className="organizer-page-heading">
                <div><span className="eyebrow">{pageDetails[currentPage].eyebrow}</span><h1>Kelola semua lombamu</h1><p>Pantau proses verifikasi, perbarui informasi, atau arsipkan lomba kapan saja.</p></div>
                <button className="button button-primary" onClick={() => navigate("/lomba/tambahkan")}><Plus size={16} /> Tambah Lomba</button>
              </div>
              <div className="organizer-summary-grid">
                <div><span><FileText size={17} /></span><small>Total lomba</small><strong>{competitions.length}</strong></div>
                <div><span><Clock3 size={17} /></span><small>Menunggu verifikasi</small><strong>{competitions.filter((item) => item.status === "pending" && !item.archivedAt).length}</strong></div>
                <div><span><CheckCircle2 size={17} /></span><small>Sedang tayang</small><strong>{publishedCompetitions.length}</strong></div>
                <div><span><Archive size={17} /></span><small>Diarsipkan</small><strong>{competitions.filter((item) => item.archivedAt).length}</strong></div>
              </div>
              <div className="organizer-list-card">
                <div className="organizer-list-heading">
                  <div><h2>Daftar lomba</h2><p>{matchingCompetitions.length} lomba ditampilkan</p></div>
                  <label className="organizer-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari lomba..." /></label>
                </div>
                <div className="organizer-tabs">
                  <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Aktif</button>
                  <button className={filter === "drafts" ? "active" : ""} onClick={() => setFilter("drafts")}>Draft</button>
                  <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Semua</button>
                  <button className={filter === "archived" ? "active" : ""} onClick={() => setFilter("archived")}>Arsip</button>
                </div>
                {loading ? <div className="organizer-loading"><LoaderCircle className="loading-icon" size={20} /> Memuat daftar lomba...</div>
                  : matchingCompetitions.length ? <div className="organizer-competition-list">
                    {matchingCompetitions.map((item) => {
                      const stats = analytics[item.id] || { views: 0, registrationClicks: 0 };
                      return <article className="organizer-competition-card" key={item.id}>
                        <div className="organizer-competition-art">
                          {item.coverUrl ? <img src={item.coverUrl} alt="" /> : <ShieldCheck size={23} />}
                        </div>
                        <div className="organizer-competition-info">
                          <div className="organizer-competition-title"><h3>{item.title}</h3><span className={`status-pill status-${item.status}${item.archivedAt ? " status-archived" : ""}`}>{statusLabel(item)}</span></div>
                          <p>{item.organizer} · {item.category} · Batas daftar {formatLongDate(item.deadline)}</p>
                          {item.status === "rejected" && item.reviewedAt && <small>Ditinjau {formatLongDate(item.reviewedAt.slice(0, 10))}. Perbarui informasi untuk mengirim ulang.</small>}
                          <div className="organizer-competition-metrics"><span><Eye size={14} /> {stats.views} tampilan</span><span><ExternalLink size={14} /> {stats.registrationClicks} klik daftar</span></div>
                        </div>
                        <div className="organizer-competition-actions">
                          <button title="Ubah lomba" aria-label="Ubah lomba" disabled={Boolean(actionId)} onClick={() => navigate(`/lomba/tambahkan?edit=${item.id}`)}><FileText size={16} /></button>
                          <button title={item.archivedAt ? "Kembalikan dari arsip" : "Arsipkan lomba"} aria-label={item.archivedAt ? "Kembalikan dari arsip" : "Arsipkan lomba"} disabled={actionId === item.id} onClick={() => toggleArchive(item)}><Archive size={16} /></button>
                          <button className="danger" title="Hapus lomba" aria-label="Hapus lomba" disabled={Boolean(actionId)} onClick={() => setDeleteTarget(item)}><Trash2 size={16} /></button>
                        </div>
                      </article>;
                    })}
                  </div>
                    : <div className="organizer-empty"><FileText size={22} /><strong>Belum ada lomba pada bagian ini</strong><p>Tambahkan informasi lomba untuk mulai mengelola status dan statistiknya.</p><button className="button button-primary" onClick={() => navigate("/lomba/tambahkan")}><Plus size={15} /> Tambah Lomba</button></div>}
              </div>
            </>
          )}

          {routePath === "/lomba/analisis" && (
            <>
              <div className="organizer-page-heading">
                <div><span className="eyebrow">{pageDetails[currentPage].eyebrow}</span><h1>Performa lomba</h1><p>Tampilan dan klik pendaftaran unik per sesi per hari.</p></div>
                <button className="button button-outline" onClick={() => navigate("/lomba/manajemen")}><LayoutDashboard size={16} /> Manajemen Lomba</button>
              </div>
              {analyticsError && <div className="organizer-analytics-error" role="alert">{analyticsError}</div>}
              <div className="organizer-analytics-summary">
                <article><span><CheckCircle2 size={19} /></span><small>Lomba sedang tayang</small><strong>{publishedCompetitions.length}</strong><p>Lomba yang dapat ditemukan peserta.</p></article>
                <article><span><Eye size={19} /></span><small>Total tampilan</small><strong>{totalViews.toLocaleString("id-ID")}</strong><p>Tampilan unik per sesi setiap hari.</p></article>
                <article><span><ExternalLink size={19} /></span><small>Total klik pendaftaran</small><strong>{totalClicks.toLocaleString("id-ID")}</strong><p>Klik unik per sesi menuju tautan pendaftaran.</p></article>
              </div>
              <div className="organizer-list-card">
                <div className="organizer-list-heading"><div><h2>Analisis per lomba</h2><p>Angka terhitung saat detail lomba dibuka atau tautan pendaftaran diklik.</p></div></div>
                {loading ? <div className="organizer-loading"><LoaderCircle className="loading-icon" size={20} /> Memuat analisis...</div>
                  : competitions.length ? <div className="organizer-analytics-list">
                    {competitions.map((item) => {
                      const stats = analytics[item.id] || { views: 0, registrationClicks: 0 };
                      return <article key={item.id}><div><strong>{item.title}</strong><span className={`status-pill status-${item.status}`}>{statusLabel(item)}</span></div><span><Eye size={15} /> {stats.views.toLocaleString("id-ID")}</span><span><ExternalLink size={15} /> {stats.registrationClicks.toLocaleString("id-ID")}</span></article>;
                    })}
                  </div> : <div className="organizer-empty"><BarChart3 size={22} /><strong>Belum ada data lomba</strong><p>Data analisis akan muncul setelah lombamu tayang.</p></div>}
              </div>
            </>
          )}

          {routePath === "/lomba/terima-kasih" && (
            <section className="organizer-thanks">
              <span className="organizer-thanks-icon"><CheckCircle2 size={28} /></span>
              <span className="eyebrow">TERIMA KASIH</span>
              <h1>Terima kasih sudah membantu membuka peluang baru.</h1>
              <p>Informasi lombamu sudah terkirim dan akan ditinjau moderator sebelum ditampilkan kepada peserta.</p>
              <span className="organizer-countdown">Kamu akan diarahkan ke Manajemen Lomba dalam <strong>{secondsLeft}</strong> detik.</span>
              <button className="button button-primary" onClick={() => navigate("/lomba/manajemen")}>Buka Manajemen Lomba <ArrowRight size={15} /></button>
            </section>
          )}
        </div>
      </section>

      {deleteTarget && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !actionId && setDeleteTarget(null)}>
        <section className="modal-card organizer-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-competition-title">
          <span className="eyebrow">HAPUS PERMANEN</span>
          <h2 id="delete-competition-title">Hapus lomba ini?</h2>
          <p><strong>{deleteTarget.title}</strong> akan dihapus permanen, baik sedang menunggu verifikasi maupun sudah tayang. Tindakan ini tidak dapat dibatalkan.</p>
          <div><button className="button button-outline" disabled={Boolean(actionId)} onClick={() => setDeleteTarget(null)}>Batal</button><button className="button button-danger" disabled={Boolean(actionId)} onClick={deleteCompetition}>{actionId ? "Menghapus..." : "Hapus permanen"}</button></div>
        </section>
      </div>}
    </main>
  );
}
