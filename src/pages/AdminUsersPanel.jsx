import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  Pencil,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { birthYearOptions, educationOptions } from "../data.js";
import LocationSelects from "../LocationSelects.jsx";

const sanctionReasons = [
  "Spam atau promosi berulang",
  "Informasi lomba palsu atau menyesatkan",
  "Pelecehan atau ujaran kebencian",
  "Penyalahgunaan platform",
  "Pelanggaran aturan komunitas",
  "Lainnya (isi sendiri)",
];
const banDurations = [3, 7, 14, 30, 365];

async function invokeAdminUsers(supabaseClient, body) {
  const { data, error } = await supabaseClient.functions.invoke("admin-users", { body });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        const payload = await error.context.clone().json();
        if (typeof payload?.error === "string") message = payload.error;
      } catch (parseError) {
        if (!(parseError instanceof SyntaxError)) throw parseError;
      }
    }
    throw new Error(message);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Respons pengelolaan pengguna tidak valid.");
  }
  if (typeof data.error === "string") throw new Error(data.error);
  return data;
}

function formatCreatedAt(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function AdminUsersPanel({ supabaseClient, moderatorId }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [profile, setProfile] = useState({ username: "", fullName: "", phone: "", province: "", city: "", birthYear: "", education: "", institution: "" });
  const [locationValid, setLocationValid] = useState(false);
  const [formError, setFormError] = useState("");
  const [sanctionReason, setSanctionReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [banDuration, setBanDuration] = useState(3);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    invokeAdminUsers(supabaseClient, { action: "list", page })
      .then((result) => {
        if (!active) return;
        if (!Array.isArray(result.users) || typeof result.hasMore !== "boolean") {
          throw new Error("Format daftar pengguna tidak valid.");
        }
        setUsers(result.users);
        setHasMore(result.hasMore);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Daftar pengguna gagal dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [page, reloadKey, supabaseClient]);

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => `${user.fullName} ${user.email} ${user.region}`.toLowerCase().includes(query));
  }, [search, users]);

  const openEditor = (user) => {
    setEditingUser(user);
    setProfile({
      username: user.username || "",
      fullName: user.fullName || "",
      phone: user.phone || "",
      province: user.province || "",
      city: user.city || "",
      birthYear: user.birthYear || "",
      education: user.education || "",
      institution: user.institution || "",
    });
    setLocationValid(false);
    setFormError("");
  };

  const openAction = (user, action) => {
    setPendingAction({ user, action });
    setFormError("");
    setSanctionReason("");
    setCustomReason("");
    setBanDuration(3);
    setDeleteConfirmation("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const birthYear = Number(profile.birthYear);
    if (!profile.username.trim() || !profile.fullName.trim() || !profile.phone.trim() || !profile.province.trim() || !profile.city.trim() || !profile.birthYear || !profile.education) {
      setFormError("Lengkapi semua data profil wajib terlebih dahulu.");
      return;
    }
    if (!locationValid || !Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
      setFormError("Pastikan provinsi dan kota/kabupaten terisi, serta isi tahun lahir yang valid.");
      return;
    }
    setSaving(true);
    setFormError("");
    setError("");
    try {
      const result = await invokeAdminUsers(supabaseClient, {
        action: "update_profile",
        userId: editingUser.id,
        profile,
      });
      if (!result.user || result.user.id !== editingUser.id) {
        throw new Error("Respons pembaruan profil tidak valid.");
      }
      setUsers((current) => current.map((user) => user.id === editingUser.id ? result.user : user));
      setEditingUser(null);
      setNotice(`Profil ${editingUser.fullName || editingUser.email} berhasil diperbarui.`);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Profil gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!pendingAction) return;
    const reason = sanctionReason === "Lainnya (isi sendiri)" ? customReason.trim() : sanctionReason;
    if ((pendingAction.action === "suspend" || pendingAction.action === "ban") && !reason) {
      setFormError("Pilih atau tulis alasan terlebih dahulu.");
      return;
    }
    if (pendingAction.action === "delete" && deleteConfirmation !== "HAPUS") {
      setFormError('Ketik "HAPUS" untuk mengonfirmasi penghapusan permanen.');
      return;
    }

    setSaving(true);
    setError("");
    setFormError("");
    try {
      const result = await invokeAdminUsers(supabaseClient, {
        action: pendingAction.action,
        userId: pendingAction.user.id,
        ...(["suspend", "ban"].includes(pendingAction.action) ? { reason } : {}),
        ...(pendingAction.action === "ban" ? { durationDays: Number(banDuration) } : {}),
      });
      if (pendingAction.action === "reactivate" && result.user?.status !== "active") {
        throw new Error("Permintaan diproses, tetapi status akun masih belum aktif. Coba lagi atau periksa status akun di Supabase.");
      }
      if (pendingAction.action === "delete") {
        if (result.deletedUserId !== pendingAction.user.id) {
          throw new Error("Respons penghapusan akun tidak valid.");
        }
      } else {
        if (!result.user || result.user.id !== pendingAction.user.id) {
          throw new Error("Respons pembaruan status akun tidak valid.");
        }
        setUsers((current) => current.map((user) => user.id === pendingAction.user.id ? result.user : user));
      }
      const label = pendingAction.action === "suspend"
        ? "ditangguhkan permanen"
        : pendingAction.action === "ban"
          ? `dikenai ban selama ${banDuration} hari`
          : pendingAction.action === "delete"
            ? "dihapus permanen"
            : "diaktifkan kembali";
      setNotice(`Akun ${pendingAction.user.email} berhasil ${label}.`);
      setPendingAction(null);
      if (pendingAction.action === "delete") setReloadKey((current) => current + 1);
    } catch (actionError) {
      setFormError(actionError instanceof Error ? actionError.message : "Status pengguna gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-users">
      <div className="admin-users-heading">
        <div>
          <span className="eyebrow">MANAJEMEN AKUN</span>
          <h2>Pengguna</h2>
          <p>Kelola profil dan akses akun komunitas. Email dan role moderator tidak dapat diedit dari sini.</p>
        </div>
        <label className="admin-users-search">
          <Search size={16} />
          <span className="sr-only">Cari pengguna pada halaman ini</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, email, daerah..." />
        </label>
      </div>
      {notice && <div className="admin-users-notice" role="status"><Check size={16} /> {notice}<button onClick={() => setNotice("")} aria-label="Tutup pemberitahuan"><X size={15} /></button></div>}
      {error && <div className="admin-users-error" role="alert">{error}<button onClick={() => setReloadKey((current) => current + 1)}>Coba lagi</button></div>}
      <div className="admin-users-table-card">
        <div className="admin-users-table-caption"><span>{loading ? "Memuat pengguna..." : `${visibleUsers.length} pengguna di halaman ini`}</span><span>Halaman {page}</span></div>
        {loading ? (
          <div className="admin-users-loading"><LoaderCircle size={20} className="loading-icon" /> Memuat daftar pengguna...</div>
        ) : visibleUsers.length ? (
          <div className="admin-users-table-scroll">
            <table className="admin-users-table">
              <thead><tr><th>Pengguna</th><th>Profil</th><th>Status</th><th>Bergabung</th><th>Aksi</th></tr></thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const isProtected = user.id === moderatorId || user.role === "moderator";
                  const statusClass = user.status === "deactivated" ? "suspended" : user.status;
                  const statusLabel = user.status === "suspended"
                    ? "Suspend permanen"
                    : user.status === "banned"
                      ? "Ban sementara"
                      : user.status === "deactivated"
                        ? "Suspend permanen"
                        : "Aktif";
                  return (
                    <tr key={user.id}>
                      <td><div className="admin-user-identity"><span className="admin-user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={17} />}</span><span><strong>{user.fullName || "Nama belum diisi"}</strong><small>{user.username ? `@${user.username}` : "Username belum diisi"}</small><small>{user.email}</small>{user.role === "moderator" && <em><ShieldCheck size={12} /> Moderator</em>}</span></div></td>
                      <td><div className="admin-user-profile">{user.phone && <span>{user.phone}</span>}<span><MapPin size={13} /> {user.region || "Daerah belum diisi"}</span>{user.institution && <span><Building2 size={13} /> {user.institution}</span>}</div></td>
                      <td>
                        <span className={`admin-user-status status-${statusClass}`}>{statusLabel}</span>
                        {user.status !== "active" && user.sanctionReason && <small className="admin-user-sanction-reason">{user.sanctionReason}{user.bannedUntil ? ` · sampai ${formatCreatedAt(user.bannedUntil)}` : ""}</small>}
                      </td>
                      <td className="admin-user-date">{formatCreatedAt(user.createdAt)}</td>
                      <td>
                        {isProtected ? <span className="admin-user-protected">Dilindungi</span> : <div className="admin-user-actions">
                          <button title="Edit profil" aria-label={`Edit profil ${user.email}`} onClick={() => openEditor(user)}><Pencil size={15} /></button>
                          <button title="Suspend permanen" aria-label={`Suspend permanen ${user.email}`} className="suspend-user-action" onClick={() => openAction(user, "suspend")}><Ban size={15} /></button>
                          <button title="Ban sementara" aria-label={`Ban sementara ${user.email}`} className="ban-user-action" onClick={() => openAction(user, "ban")}><Clock3 size={15} /></button>
                          {user.status !== "active" && <button title="Unsuspend / unban akun" aria-label={`Aktifkan kembali ${user.email}`} className="restore-user-action" onClick={() => openAction(user, "reactivate")}><RotateCcw size={15} /></button>}
                          <button title="Hapus akun permanen" aria-label={`Hapus permanen ${user.email}`} className="deactivate-user-action" onClick={() => openAction(user, "delete")}><Trash2 size={15} /></button>
                        </div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="admin-users-empty">{search ? "Tidak ada pengguna yang cocok di halaman ini." : "Belum ada pengguna pada halaman ini."}</div>}
        <div className="admin-users-pagination">
          <button className="button button-outline button-small" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /> Sebelumnya</button>
          <button className="button button-outline button-small" disabled={!hasMore || loading} onClick={() => setPage((current) => current + 1)}>Berikutnya <ChevronRight size={15} /></button>
        </div>
      </div>

      {editingUser && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && setEditingUser(null)}>
        <section className="modal-card admin-user-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <button className="modal-close" onClick={() => setEditingUser(null)} disabled={saving} aria-label="Tutup"><X size={19} /></button>
          <span className="eyebrow">EDIT PROFIL</span>
          <h2 id="edit-user-title">{editingUser.fullName || editingUser.email}</h2>
          <p className="admin-user-modal-email">{editingUser.email}</p>
          <form className="admin-user-form" onSubmit={saveProfile}>
            <label>Username <input value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value.toLowerCase() })} minLength={3} maxLength={30} pattern="[a-zA-Z0-9._]{3,30}" required /></label>
            <label>Nama lengkap <input value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} maxLength={120} required /></label>
            <label>Nomor HP <input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} maxLength={40} required /></label>
            <label>Email <input type="email" value={editingUser.email} readOnly aria-readonly="true" /></label>
            <LocationSelects
              className="admin-user-locations"
              province={profile.province}
              city={profile.city}
              onProvinceChange={(value) => { setLocationValid(false); setProfile((current) => ({ ...current, province: value, city: "" })); }}
              onCityChange={(value) => setProfile((current) => ({ ...current, city: value }))}
              onValidityChange={setLocationValid}
            />
            <label>Tahun lahir
              <select value={profile.birthYear} onChange={(event) => setProfile({ ...profile, birthYear: event.target.value })} required>
                <option value="">Pilih tahun lahir</option>
                {birthYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label>Jenjang
              <select value={profile.education} onChange={(event) => setProfile({ ...profile, education: event.target.value })} required>
                <option value="">Pilih jenjang</option>
                {educationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="sm:col-span-2">Lembaga <span className="optional-mark">(opsional)</span><input value={profile.institution} onChange={(event) => setProfile({ ...profile, institution: event.target.value })} maxLength={160} /></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <button className="button button-primary button-wide" type="submit" disabled={saving}>{saving ? <LoaderCircle size={16} className="loading-icon" /> : <Check size={16} />} {saving ? "Menyimpan..." : "Simpan perubahan"}</button>
          </form>
        </section>
      </div>}

      {pendingAction && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && setPendingAction(null)}>
        <section className="modal-card admin-user-modal" role="alertdialog" aria-modal="true" aria-labelledby="user-action-title">
          <button className="modal-close" onClick={() => setPendingAction(null)} disabled={saving} aria-label="Tutup"><X size={19} /></button>
          <span className="eyebrow">{pendingAction.action === "delete" ? "HAPUS PERMANEN" : pendingAction.action === "ban" ? "BAN SEMENTARA" : pendingAction.action === "suspend" ? "SUSPEND PERMANEN" : "UNSUSPEND AKUN"}</span>
          <h2 id="user-action-title">{pendingAction.user.fullName || pendingAction.user.email}</h2>
          <p className="admin-user-confirm-copy">
            {pendingAction.action === "suspend"
              ? "Akun tidak dapat login sampai moderator melakukan unsuspend. Alasan suspend wajib dicatat."
              : pendingAction.action === "ban"
                ? `Akun tidak dapat login selama ${banDuration} hari. Setelah masa ban berakhir, akses login dibuka kembali.`
                : pendingAction.action === "delete"
                  ? "Penghapusan tidak dapat dibatalkan. Akun dan profil akan dihapus permanen, begitu juga semua lomba yang diajukan akun ini."
                  : "Batasan login akan dihapus dan akun dapat login kembali."}
          </p>
          {(pendingAction.action === "suspend" || pendingAction.action === "ban") && <div className="admin-user-form admin-sanction-form">
            <label>Alasan <span className="required-mark">*</span>
              <select value={sanctionReason} onChange={(event) => setSanctionReason(event.target.value)} required>
                <option value="">Pilih alasan</option>
                {sanctionReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </label>
            {sanctionReason === "Lainnya (isi sendiri)" && <label>Alasan khusus
              <textarea value={customReason} onChange={(event) => setCustomReason(event.target.value)} maxLength={500} rows={3} placeholder="Tuliskan alasan yang jelas" required />
            </label>}
            {pendingAction.action === "ban" && <label>Durasi ban
              <select value={banDuration} onChange={(event) => setBanDuration(Number(event.target.value))}>
                {banDurations.map((days) => <option key={days} value={days}>{days} hari</option>)}
              </select>
            </label>}
          </div>}
          {pendingAction.action === "delete" && <label className="admin-delete-confirm">Ketik HAPUS untuk melanjutkan
            <input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" />
          </label>}
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="admin-user-confirm-actions">
            <button className="button button-outline" disabled={saving} onClick={() => setPendingAction(null)}>Batal</button>
            <button className="button button-primary" disabled={saving} onClick={runAction}>{saving ? <LoaderCircle size={16} className="loading-icon" /> : pendingAction.action === "reactivate" ? <ArrowLeft size={16} /> : pendingAction.action === "delete" ? <Trash2 size={16} /> : <ArrowRight size={16} />}{saving ? "Memproses..." : pendingAction.action === "reactivate" ? "Unsuspend akun" : pendingAction.action === "delete" ? "Hapus permanen" : "Terapkan"}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}
