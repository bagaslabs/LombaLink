import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";

const actionLabels = {
  competition_created: "Menerbitkan lomba",
  competition_created_archived: "Membuat lomba di arsip",
  competition_status_changed: "Mengubah status lomba",
  competition_archived: "Mengarsipkan lomba",
  competition_restored: "Mengembalikan lomba dari arsip",
  competition_updated: "Memperbarui informasi lomba",
  competition_deleted: "Menghapus lomba",
  report_resolved: "Menandai laporan selesai",
  report_dismissed: "Mengabaikan laporan",
  report_reopened: "Membuka kembali laporan",
  user_profile_updated: "Memperbarui profil pengguna",
  user_suspended: "Menangguhkan akun pengguna",
  user_banned: "Memberi ban sementara",
  user_reactivated: "Mengaktifkan kembali akun pengguna",
  user_deleted: "Menghapus akun pengguna",
};

const entityLabels = {
  competition: "Lomba",
  report: "Laporan",
  user: "Pengguna",
};

const statusLabels = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  draft: "Draft",
  resolved: "Selesai",
  dismissed: "Diabaikan",
};

const fieldLabels = {
  title: "judul",
  description: "deskripsi",
  organizer: "penyelenggara",
  category: "bidang",
  status: "status",
  archived_at: "arsip",
  registration_url: "link pendaftaran",
  location: "lokasi",
  deadline: "deadline",
  username: "username",
  full_name: "nama",
  phone: "nomor telepon",
  province: "provinsi",
  city: "kota",
  birth_year: "tahun lahir",
  education: "jenjang pendidikan",
  institution: "institusi",
};

const reportReasonLabels = {
  inaccurate_information: "Informasi tidak akurat",
  registration_link_issue: "Masalah link pendaftaran",
  suspicious_competition: "Lomba mencurigakan",
  competition_ended: "Lomba sudah berakhir",
  other: "Lainnya",
};

function formatCreatedAt(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getActivityDetails(log) {
  const details = log.details && typeof log.details === "object" && !Array.isArray(log.details)
    ? log.details
    : {};

  if (log.action === "competition_status_changed") {
    const before = statusLabels[details.before_status] || details.before_status;
    const after = statusLabels[details.after_status] || details.after_status;
    return `Status: ${before || "—"} → ${after || "—"}`;
  }
  if (log.action === "competition_created" || log.action === "competition_created_archived") {
    return details.status ? `Status awal: ${statusLabels[details.status] || details.status}` : "";
  }
  if (log.action === "competition_updated" && Array.isArray(details.changed_fields)) {
    const fields = details.changed_fields
      .filter((field) => typeof field === "string")
      .map((field) => fieldLabels[field] || field);
    return fields.length ? `Bidang diubah: ${fields.join(", ")}` : "";
  }
  if (log.action === "report_resolved" || log.action === "report_dismissed" || log.action === "report_reopened") {
    const before = statusLabels[details.before_status] || details.before_status;
    const after = statusLabels[details.after_status] || details.after_status;
    const reason = reportReasonLabels[details.reason] || details.reason;
    return `${before || "Menunggu"} → ${after || "—"}${reason ? ` · ${reason}` : ""}`;
  }
  if (log.action === "user_banned") {
    const duration = Number(details.duration_days);
    const reason = typeof details.reason === "string" ? details.reason : "";
    return [
      Number.isFinite(duration) && duration > 0 ? `Durasi ${duration} hari` : "",
      reason ? `Alasan: ${reason}` : "",
    ].filter(Boolean).join(" · ");
  }
  if (log.action === "user_suspended" && typeof details.reason === "string") {
    return `Alasan: ${details.reason}`;
  }
  if (log.action === "user_profile_updated" && Array.isArray(details.updated_fields)) {
    return `Data diperbarui: ${details.updated_fields.join(", ")}`;
  }
  return "";
}

export default function AdminActivityPanel({ supabaseClient }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    if (!supabaseClient) {
      setError("Supabase belum tersedia. Log aktivitas tidak dapat dimuat.");
      setLogs([]);
      setLoading(false);
      return () => { active = false; };
    }

    supabaseClient
      .from("lombalink_admin_activity_logs")
      .select("id, actor_id, actor_name, action, entity_type, entity_id, entity_label, details, created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setLogs([]);
          setError(loadError.code === "PGRST205"
            ? "Tabel log aktivitas belum tersedia di Supabase. Terapkan migration database yang tertunda, lalu muat ulang panel ini."
            : `Log aktivitas gagal dimuat: ${loadError.message}`);
          return;
        }
        setLogs(data || []);
      })
      .catch((loadError) => {
        if (!active) return;
        setLogs([]);
        setError(loadError instanceof Error ? loadError.message : "Log aktivitas gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [reloadKey, supabaseClient]);

  const visibleLogs = useMemo(
    () => logs.filter((log) => filter === "all" || log.entity_type === filter),
    [filter, logs],
  );

  return (
    <section className="admin-activity">
      <div className="admin-activity-heading">
        <div>
          <span className="eyebrow">AKTIVITAS MODERATOR</span>
          <h1>Log Admin</h1>
          <p>Riwayat tindakan moderator pada lomba, laporan, dan akun pengguna.</p>
        </div>
        <button
          className="button button-outline button-small"
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          disabled={loading}
        >
          <RefreshCw size={14} /> Muat ulang
        </button>
      </div>
      <div className="admin-activity-card">
        <div className="admin-activity-toolbar">
          <label>
            Tampilkan
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Semua aktivitas</option>
              <option value="competition">Lomba</option>
              <option value="report">Laporan</option>
              <option value="user">Pengguna</option>
            </select>
          </label>
          <span>{loading ? "Memuat..." : `${visibleLogs.length} aktivitas terbaru`}</span>
        </div>
        <div className="admin-activity-list">
          {loading ? (
            <div className="admin-empty" role="status"><LoaderCircle size={20} className="loading-icon" /><strong>Memuat log aktivitas...</strong></div>
          ) : error ? (
            <div className="admin-users-error" role="alert">{error}<button type="button" onClick={() => setReloadKey((current) => current + 1)}>Coba lagi</button></div>
          ) : visibleLogs.length ? visibleLogs.map((log) => (
            <article className="admin-activity-row" key={log.id}>
              <span className="admin-activity-icon"><ClipboardList size={17} /></span>
              <div className="admin-activity-copy">
                <div className="admin-activity-main">
                  <strong>{actionLabels[log.action] || "Aktivitas admin"}</strong>
                  <time dateTime={log.created_at}>{formatCreatedAt(log.created_at)}</time>
                </div>
                <p>{log.entity_label || entityLabels[log.entity_type] || "Data"}</p>
                <div className="admin-activity-meta">
                  <span><ShieldCheck size={13} /> {log.actor_name || "Moderator"}</span>
                  <span>{entityLabels[log.entity_type] || log.entity_type} · ID {log.entity_id}</span>
                </div>
                {getActivityDetails(log) && <small>{getActivityDetails(log)}</small>}
              </div>
            </article>
          )) : (
            <div className="admin-empty"><ClipboardList size={22} /><strong>Belum ada aktivitas admin</strong><span>Aktivitas moderator yang tercatat akan muncul di sini.</span></div>
          )}
        </div>
        {!loading && !error && logs.length >= 500 && <p className="admin-activity-limit">Menampilkan maksimal 500 aktivitas terbaru.</p>}
      </div>
    </section>
  );
}
