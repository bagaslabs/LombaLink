import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flag, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
import { reportReasonLabel, reportStatuses } from "../reporting.js";

function formatSubmittedAt(value) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminReportsPanel({ supabaseClient, moderatorId, onPendingCountChange }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionId, setActionId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    onPendingCountChange(null);

    if (!supabaseClient) {
      setError("Supabase belum tersedia. Laporan tidak dapat dimuat.");
      setLoading(false);
      return () => { active = false; };
    }

    Promise.all([
      supabaseClient.from("lombalink_competition_reports").select("*").order("submitted_at", { ascending: false }).limit(1000),
      supabaseClient.from("lombalink_competitions").select("id, title, organizer"),
      supabaseClient.from("lombalink_profiles").select("id, full_name"),
    ]).then(([reportResult, competitionResult, profileResult]) => {
      if (!active) return;
      const failedResult = [reportResult, competitionResult, profileResult].find((result) => result.error);
      if (failedResult) {
        setReports([]);
        setError(`Laporan gagal dimuat: ${failedResult.error.message}`);
        return;
      }

      const competitions = new Map((competitionResult.data ?? []).map((competition) => [competition.id, competition]));
      const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
      const nextReports = (reportResult.data ?? []).map((report) => {
        const competition = competitions.get(report.competition_id);
        return {
          ...report,
          competitionTitle: competition?.title || "Lomba tidak ditemukan",
          organizer: competition?.organizer || "",
          reporterName: profiles.get(report.reporter_id) || `ID ${report.reporter_id}`,
        };
      });
      setReports(nextReports);
      onPendingCountChange(nextReports.filter((report) => report.status === "pending").length);
    }).catch((loadError) => {
      if (active) {
        setReports([]);
        setError(loadError instanceof Error ? loadError.message : "Laporan gagal dimuat.");
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [onPendingCountChange, reloadKey, supabaseClient]);

  const visibleReports = useMemo(
    () => reports.filter((report) => filter === "all" || report.status === filter),
    [filter, reports],
  );
  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((report) => report.status === "pending").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
    dismissed: reports.filter((report) => report.status === "dismissed").length,
  }), [reports]);
  const countLabel = (value) => loading || error ? "—" : value.toLocaleString("id-ID");

  const reviewReport = async (report, status) => {
    setActionId(report.id);
    setError("");
    setNotice("");
    const reviewedAt = new Date().toISOString();
    try {
      const { error: updateError } = await supabaseClient
        .from("lombalink_competition_reports")
        .update({ status, reviewed_by: moderatorId, reviewed_at: reviewedAt })
        .eq("id", report.id);
      if (updateError) {
        setError(`Status laporan gagal diperbarui: ${updateError.message}`);
        return;
      }

      const updatedReports = reports.map((item) => item.id === report.id
        ? { ...item, status, reviewed_by: moderatorId, reviewed_at: reviewedAt }
        : item);
      setReports(updatedReports);
      onPendingCountChange(updatedReports.filter((item) => item.status === "pending").length);
      setNotice(status === "resolved" ? "Laporan ditandai selesai." : "Laporan diabaikan.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Status laporan gagal diperbarui.");
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="admin-reports">
      <div className="admin-reports-heading">
        <div>
          <span className="eyebrow">MODERASI KOMUNITAS</span>
          <h1>Laporan pengguna</h1>
          <p>Tinjau laporan informasi lomba yang dikirim oleh pengguna.</p>
        </div>
        <button className="button button-outline button-small" onClick={() => setReloadKey((current) => current + 1)} disabled={loading}>
          <RefreshCw size={14} /> Muat ulang
        </button>
      </div>
      {notice && <div className="admin-users-notice" role="status">{notice}</div>}
      {error && <div className="admin-users-error" role="alert">{error}<button onClick={() => setReloadKey((current) => current + 1)}>Coba lagi</button></div>}
      <div className="admin-table-card">
        <div className="table-heading">
          <div><h2>Antrean laporan</h2><p>Laporan hanya dapat ditinjau oleh moderator.</p></div>
          <span className="admin-report-total">{countLabel(counts.pending)} menunggu</span>
        </div>
        <div className="table-tabs">
          <button className={filter === "pending" ? "selected" : ""} onClick={() => setFilter("pending")}>Menunggu <span>{countLabel(counts.pending)}</span></button>
          {reportStatuses.filter((status) => status.value !== "pending").map((status) => (
            <button key={status.value} className={filter === status.value ? "selected" : ""} onClick={() => setFilter(status.value)}>{status.label} <span>{countLabel(counts[status.value])}</span></button>
          ))}
          <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Semua <span>{countLabel(counts.all)}</span></button>
        </div>
        <div className="admin-report-list">
          {loading
            ? <div className="admin-empty" role="status"><LoaderCircle size={20} className="loading-icon" /><strong>Memuat laporan...</strong></div>
            : error
              ? null
              : visibleReports.length
              ? visibleReports.map((report) => (
                <article className="admin-report-row" key={report.id}>
                  <div className="admin-report-header">
                    <span className="admin-report-icon"><Flag size={17} /></span>
                    <div className="admin-report-summary">
                      <strong>{report.competitionTitle}</strong>
                      <span>{reportReasonLabel(report.reason)}{report.organizer ? ` · ${report.organizer}` : ""}</span>
                      <small>{report.reporterName} · {formatSubmittedAt(report.submitted_at)}</small>
                    </div>
                    <span className={`status-pill status-${report.status}`}>
                      {report.status === "resolved" ? <CheckCircle2 size={12} /> : report.status === "dismissed" ? <XCircle size={12} /> : <i></i>}
                      {reportStatuses.find((status) => status.value === report.status)?.label || report.status}
                    </span>
                  </div>
                  <p className="admin-report-description">{report.description}</p>
                  {report.status === "pending" && (
                    <div className="admin-report-actions">
                      <button className="button button-outline button-small" disabled={actionId === report.id} onClick={() => reviewReport(report, "dismissed")}>Abaikan</button>
                      <button className="button button-primary button-small" disabled={actionId === report.id} onClick={() => reviewReport(report, "resolved")}>Tandai selesai</button>
                    </div>
                  )}
                </article>
              ))
              : <div className="admin-empty"><CheckCircle2 size={22} /><strong>Tidak ada laporan</strong><span>Belum ada laporan pada kategori ini.</span></div>}
        </div>
      </div>
    </section>
  );
}
