import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AccountPrompt, SiteFooter } from "./components.jsx";
import Navbar from "./Navbar.jsx";
import {
  accountFromUser,
  authErrorMessage,
  competitionFromRow,
  getAnalyticsVisitorId,
  getCompetitionCoverUrl,
  googleOAuthErrorMessage,
  isProfileComplete,
} from "./data.js";
import { getSupabaseClient } from "./supabase.js";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PersonalizationPage from "./pages/PersonalizationPage.jsx";
import CompetitionDetailPage from "./pages/CompetitionDetailPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import OrganizerPage from "./pages/OrganizerPage.jsx";
import RoleSelectionPage from "./pages/RoleSelectionPage.jsx";
import { reportReasons } from "./reporting.js";

const profilePhotoBucket = "lombalink-profile-photos";
const scrollPositionStorageKey = "lombalink.scroll-position.v1";
const competitionRefreshCooldown = 30_000;

function useRoute() {
  const getCurrentRoute = () => `${window.location.pathname}${window.location.search}`;
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    const handlePopState = () => setRoute(getCurrentRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((nextRoute) => {
    const nextUrl = new URL(nextRoute, window.location.origin);
    const normalizedRoute = `${nextUrl.pathname}${nextUrl.search}`;
    if (getCurrentRoute() !== normalizedRoute) {
      window.history.pushState({}, "", normalizedRoute);
      setRoute(normalizedRoute);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return [route, navigate];
}

export default function App() {
  const [route, navigate] = useRoute();
  const routePath = route.split("?")[0];
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("lombalink.theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [account, setAccount] = useState(null);
  const authAccountIdRef = useRef(null);
  const [accountRoleReady, setAccountRoleReady] = useState(false);
  const [accountRoleRefreshKey, setAccountRoleRefreshKey] = useState(0);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [competitions, setCompetitions] = useState([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState("");
  const [competitionReloadKey, setCompetitionReloadKey] = useState(0);
  const competitionsLoadedRef = useRef(false);
  const lastCompetitionRefreshAtRef = useRef(0);
  const scrollRestorationAttemptedRef = useRef(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptRequired, setPromptRequired] = useState(false);
  const [encourageShare, setEncourageShare] = useState(false);
  const [postAfterProfile, setPostAfterProfile] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lombalink.theme", theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    for (const [key, value] of hashParams) {
      if (!params.has(key)) params.set(key, value);
    }

    const code = params.get("error_code") || params.get("error");
    const message = params.get("error_description") || params.get("error_message");
    if (!code && !message) return;

    setAuthError(authErrorMessage({ code, message }));
    if (window.location.pathname !== "/login") navigate("/login");
    window.history.replaceState(window.history.state, "", "/login");
  }, []);

  useEffect(() => {
    let active = true;
    let subscription;

    getSupabaseClient().then((client) => {
      if (!active) return;
      setSupabaseClient(client);
      if (!client) {
        setCompetitionsLoading(false);
        competitionsLoadedRef.current = true;
        setCompetitionsError("Supabase belum dikonfigurasi. Data lomba tidak dapat dimuat.");
        setAuthReady(true);
        return;
      }

      const { data: { subscription: authSubscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        const user = session?.user ?? null;
        const nextAccount = accountFromUser(user);
        const nextAccountId = nextAccount?.id ?? null;
        if (authAccountIdRef.current !== nextAccountId) {
          authAccountIdRef.current = nextAccountId;
          setAccount(nextAccount);
          setAccountRoleReady(!nextAccount);
          if (nextAccount) setAccountRoleRefreshKey((current) => current + 1);
        } else if (nextAccount) {
          setAccount((current) => {
            if (current?.id !== nextAccount.id) return nextAccount;
            return {
              ...current,
              ...accountFromUser(user, current.accountType),
              accountType: current.accountType,
              role: current.role,
            };
          });
        } else {
          setAccount(null);
          setAccountRoleReady(true);
        }
        setAuthReady(true);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setAuthError("");
      });
      subscription = authSubscription;

      return client.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(authErrorMessage(error, "Sesi akun tidak dapat dimuat."));
        const user = data.session?.user ?? null;
        const nextAccount = accountFromUser(user);
        authAccountIdRef.current = nextAccount?.id ?? null;
        setAccount(nextAccount);
        setAccountRoleReady(!nextAccount);
        if (nextAccount) setAccountRoleRefreshKey((current) => current + 1);
        setAuthReady(true);
      });
    }).catch((error) => {
      if (!active) return;
      setAuthError(error instanceof Error ? error.message : "Sesi tidak dapat dimuat.");
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!account?.id || !supabaseClient) return undefined;
    let active = true;

    supabaseClient
      .from("lombalink_profiles")
      .select("account_type")
      .eq("id", account.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAuthError(`Role akun gagal dimuat: ${error.message}`);
          setAccount((current) => current?.id === account.id
            ? {
              ...current,
              accountType: "",
              role: current.role === "moderator" ? "moderator" : "unselected",
            }
            : current);
        } else {
          const accountType = data?.account_type === "participant" || data?.account_type === "organizer"
            ? data.account_type
            : "";
          setAccount((current) => current?.id === account.id
            ? {
              ...current,
              accountType,
              role: current.role === "moderator" ? "moderator" : accountType || "unselected",
            }
            : current);
        }
        setAccountRoleReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setAuthError(error instanceof Error ? `Role akun gagal dimuat: ${error.message}` : "Role akun gagal dimuat.");
        setAccount((current) => current?.id === account.id
          ? {
            ...current,
            accountType: "",
            role: current.role === "moderator" ? "moderator" : "unselected",
          }
          : current);
        setAccountRoleReady(true);
      });

    return () => { active = false; };
  }, [account?.id, accountRoleRefreshKey, supabaseClient]);

  useEffect(() => {
    if (!supabaseClient) return undefined;
    let active = true;
    lastCompetitionRefreshAtRef.current = Date.now();
    if (!competitionsLoadedRef.current) setCompetitionsLoading(true);
    setCompetitionsError("");

    supabaseClient
      .from("lombalink_competitions")
      .select("*")
      .eq("status", "approved")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setCompetitions([]);
          setCompetitionsError(`Data lomba gagal dimuat: ${error.message}`);
          return;
        }
        setCompetitions((data ?? []).map((row) => {
          const item = competitionFromRow(row);
          return { ...item, coverUrl: getCompetitionCoverUrl(supabaseClient, item.coverPath) };
        }));
      })
      .catch((error) => {
        if (!active) return;
        setCompetitions([]);
        setCompetitionsError(error instanceof Error ? error.message : "Data lomba gagal dimuat.");
      })
      .finally(() => {
        if (active) {
          competitionsLoadedRef.current = true;
          setCompetitionsLoading(false);
        }
      });

    return () => { active = false; };
  }, [competitionReloadKey, supabaseClient]);

  useEffect(() => {
    let persistTimeout;
    const persistScrollPosition = () => {
      window.clearTimeout(persistTimeout);
      window.sessionStorage.setItem(scrollPositionStorageKey, JSON.stringify({
        route: `${window.location.pathname}${window.location.search}`,
        left: window.scrollX,
        top: window.scrollY,
      }));
    };
    const scheduleScrollPersistence = () => {
      window.clearTimeout(persistTimeout);
      persistTimeout = window.setTimeout(persistScrollPosition, 150);
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === "hidden") persistScrollPosition();
    };

    window.addEventListener("scroll", scheduleScrollPersistence, { passive: true });
    window.addEventListener("pagehide", persistScrollPosition);
    document.addEventListener("visibilitychange", persistWhenHidden);
    return () => {
      window.clearTimeout(persistTimeout);
      window.removeEventListener("scroll", scheduleScrollPersistence);
      window.removeEventListener("pagehide", persistScrollPosition);
      document.removeEventListener("visibilitychange", persistWhenHidden);
    };
  }, []);

  useEffect(() => {
    if (scrollRestorationAttemptedRef.current || !authReady || (account && !accountRoleReady)) return undefined;
    const isPublicRoute = routePath === "/" || routePath === "/cari" || routePath === "/rekomendasi";
    if (isPublicRoute && competitionsLoading) return undefined;

    scrollRestorationAttemptedRef.current = true;
    const savedPosition = window.sessionStorage.getItem(scrollPositionStorageKey);
    if (!savedPosition) return undefined;

    let position;
    try {
      position = JSON.parse(savedPosition);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      window.sessionStorage.removeItem(scrollPositionStorageKey);
      return undefined;
    }

    const currentRoute = `${window.location.pathname}${window.location.search}`;
    if (
      !position
      || position.route !== currentRoute
      || !Number.isFinite(position.left)
      || !Number.isFinite(position.top)
    ) return undefined;

    let secondFrame;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ left: position.left, top: position.top, behavior: "instant" });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [account, accountRoleReady, authReady, competitionsLoading, routePath]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (
        document.visibilityState === "visible"
        && Date.now() - lastCompetitionRefreshAtRef.current >= competitionRefreshCooldown
      ) {
        setCompetitionReloadKey((current) => current + 1);
      }
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, []);

  useEffect(() => {
    if (authReady && accountRoleReady && ["/admin", "/admin/tambahkan-lomba"].includes(routePath) && account?.role !== "moderator") {
      navigate("/admin/login");
    }
  }, [account, accountRoleReady, authReady, navigate, routePath]);

  useEffect(() => {
    if (!authReady || !accountRoleReady || !account) return;
    if (account.role === "moderator" && routePath === "/role") {
      navigate("/admin");
      return;
    }
    if (account.role === "unselected" && routePath !== "/role") {
      navigate("/role");
      return;
    }
    if (account.role !== "unselected" && routePath === "/role") {
      navigate(account.role === "organizer" ? "/lomba/manajemen" : "/");
      return;
    }
    if (account.role === "participant" && routePath.startsWith("/lomba/")) {
      navigate("/");
      return;
    }
    if (routePath === "/lomba/tambahkan" && account.role === "organizer" && !isProfileComplete(account)) {
      setPostAfterProfile(true);
      navigate("/profile");
    }
  }, [account, accountRoleReady, authReady, navigate, routePath]);

  const trackCompetitionEvent = useCallback(async (competitionId, eventType) => {
    if (!supabaseClient) return "Analitik belum siap. Coba muat ulang halaman.";
    try {
      const { error } = await supabaseClient.rpc("lombalink_track_competition_event", {
        p_competition_id: competitionId,
        p_event_type: eventType,
        p_visitor_id: getAnalyticsVisitorId(),
      });
      return error ? `Analitik lomba gagal dicatat: ${error.message}` : "";
    } catch (error) {
      return error instanceof Error ? `Analitik lomba gagal dicatat: ${error.message}` : "Analitik lomba gagal dicatat.";
    }
  }, [supabaseClient]);

  const submitCompetitionReport = useCallback(async ({ competitionId, reason, description }) => {
    if (!account || !supabaseClient) return "Masuk ke akun terlebih dahulu untuk mengirim laporan.";
    if (!reportReasons.some((item) => item.value === reason)) return "Pilih alasan laporan yang valid.";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length < 10 || trimmedDescription.length > 1000) {
      return "Jelaskan laporan dalam 10–1000 karakter.";
    }

    try {
      const { error } = await supabaseClient.from("lombalink_competition_reports").insert({
        competition_id: competitionId,
        reporter_id: account.id,
        reason,
        description: trimmedDescription,
      });
      if (error?.code === "23505") return "Kamu sudah mengirim laporan yang masih ditinjau untuk lomba ini.";
      return error ? `Laporan gagal dikirim: ${error.message}` : "";
    } catch (error) {
      return error instanceof Error ? `Laporan gagal dikirim: ${error.message}` : "Laporan gagal dikirim.";
    }
  }, [account, supabaseClient]);

  const signInWithGoogle = async () => {
    if (!supabaseClient) return "Google sign-in belum siap. Periksa konfigurasi Supabase.";
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,
          redirectTo: window.location.origin,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) return googleOAuthErrorMessage(error);
      if (!data.url) {
        return "Supabase tidak memberikan URL untuk memulai login Google.";
      }
      const response = await fetch(data.url, { redirect: "manual" });
      if (response.status >= 400) {
        const body = await response.text();
        let providerMessage = "";
        try {
          const payload = JSON.parse(body);
          providerMessage = payload.msg || payload.message || "";
        } catch (parseError) {
          if (!(parseError instanceof SyntaxError)) throw parseError;
        }
        return googleOAuthErrorMessage(providerMessage || `Permintaan login Google gagal (${response.status}).`);
      }

      window.location.assign(data.url);
      return null;
    } catch (error) {
      return authErrorMessage(error, "Gagal menghubungkan ke Google.");
    }
  };

  const signInAsModerator = async ({ email, password }) => {
    if (!supabaseClient) return "Supabase belum dikonfigurasi.";
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return authErrorMessage(error, "Gagal masuk ke panel moderator.");
      if (data.user?.app_metadata?.role !== "moderator") {
        const { error: signOutError } = await supabaseClient.auth.signOut();
        if (signOutError) return `Akun ini tidak memiliki role moderator, dan sesi gagal ditutup: ${signOutError.message}`;
        return "Akun ini tidak memiliki role moderator. Hubungi administrator LombaLink.";
      }

      setAccount(accountFromUser(data.user));
      setAccountRoleReady(true);
      setAuthError("");
      navigate("/admin");
      return null;
    } catch (error) {
      return authErrorMessage(error, "Gagal masuk ke panel moderator.");
    }
  };

  const logout = async () => {
    if (!supabaseClient) return;
    setAuthError("");
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        setAuthError(error.message);
        return;
      }
      navigate("/");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Gagal keluar dari akun.");
    }
  };

  const saveAccountType = async (accountType) => {
    if (!supabaseClient || !account) return "Sesi login tidak tersedia. Silakan masuk kembali.";
    if (accountType !== "participant" && accountType !== "organizer") {
      return "Pilihan jenis akun tidak valid. Pilih salah satu opsi yang tersedia.";
    }
    if (account.accountType) return "Role akun sudah ditetapkan dan tidak dapat diubah.";
    try {
      const { error: profileError } = await supabaseClient
        .from("lombalink_profiles")
        .upsert({
          id: account.id,
          full_name: account.fullName || account.name || "",
        }, { onConflict: "id", ignoreDuplicates: true });
      if (profileError) return `Profil akun gagal disiapkan: ${profileError.message}`;

      const { error } = await supabaseClient.rpc("lombalink_select_account_type", {
        p_account_type: accountType,
      });
      if (error) return `Pilihan jenis akun gagal disimpan: ${error.message}`;

      setAccount((current) => current?.id === account.id
        ? { ...current, accountType, role: accountType }
        : current);
      setAccountRoleReady(true);
      setAuthError("");
      navigate(accountType === "organizer" ? "/lomba/manajemen" : "/");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Pilihan jenis akun gagal disimpan.";
    }
  };

  const saveProfile = async (profile) => {
    if (!supabaseClient || !account) return "Sesi login tidak tersedia. Silakan masuk kembali.";
    let uploadedAvatarPath = "";
    try {
      let avatarUrl = profile.removeAvatar ? "" : account.avatarUrl;
      let avatarPath = profile.removeAvatar ? "" : account.avatarPath;
      if (profile.avatarFile) {
        const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
        const extension = extensions[profile.avatarFile.type];
        if (!extension || profile.avatarFile.size > 5 * 1024 * 1024) {
          return "Foto profil harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.";
        }
        uploadedAvatarPath = `${account.id}/${crypto.randomUUID()}.${extension}`;
        const { data: upload, error: uploadError } = await supabaseClient.storage
          .from(profilePhotoBucket)
          .upload(uploadedAvatarPath, profile.avatarFile, {
            cacheControl: "3600",
            contentType: profile.avatarFile.type,
            upsert: false,
          });
        if (uploadError) return `Foto profil gagal diunggah: ${uploadError.message}`;
        avatarPath = upload.path;
        const { data: publicUrl } = supabaseClient.storage.from(profilePhotoBucket).getPublicUrl(upload.path);
        avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
      }

      const username = profile.username.trim().toLowerCase();
      const region = `${profile.city.trim()}, ${profile.province.trim()}`;
      const profileFields = {
        username,
        full_name: profile.fullName,
        phone: profile.phone,
        province: profile.province,
        city: profile.city,
        region,
        birth_year: Number(profile.birthYear),
        education: profile.education,
        institution: profile.institution,
        avatar_url: avatarUrl || null,
        avatar_path: avatarPath || null,
      };

      const { error: profileError } = await supabaseClient.from("lombalink_profiles").upsert({
        id: account.id,
        ...profileFields,
      });
      if (profileError) {
        if (uploadedAvatarPath) {
          const { error: cleanupError } = await supabaseClient.storage.from(profilePhotoBucket).remove([uploadedAvatarPath]);
          const cleanupMessage = cleanupError ? ` Foto yang gagal disimpan juga tidak dapat dibersihkan: ${cleanupError.message}` : "";
          if (profileError.code === "23505") return `Username sudah digunakan. Pilih username lain.${cleanupMessage}`;
          return `Profil database gagal disimpan: ${profileError.message}.${cleanupMessage}`;
        }
        if (profileError.code === "23505") return "Username sudah digunakan. Pilih username lain.";
        return `Profil database gagal disimpan: ${profileError.message}`;
      }

      const { data, error } = await supabaseClient.auth.updateUser({
        data: {
          ...profileFields,
          birth_date: null,
          preferences: account.preferences,
        },
      });
      if (error || !data.user) {
        const { error: rollbackError } = await supabaseClient.from("lombalink_profiles").upsert({
          id: account.id,
          username: account.username || null,
          full_name: account.fullName || "",
          phone: account.phone || "",
          province: account.province || "",
          city: account.city || "",
          region: account.region || "",
          birth_year: account.birthYear ? Number(account.birthYear) : null,
          education: account.education || null,
          institution: account.institution || "",
          avatar_url: account.avatarUrl || null,
          avatar_path: account.avatarPath || null,
        });
        let failureMessage = error?.message || "Profil tidak dapat dimuat setelah disimpan.";
        if (rollbackError) failureMessage += ` Pemulihan data profil juga gagal: ${rollbackError.message}`;
        if (uploadedAvatarPath) {
          const { error: cleanupError } = await supabaseClient.storage.from(profilePhotoBucket).remove([uploadedAvatarPath]);
          if (cleanupError) failureMessage += ` Foto yang baru diunggah tidak dapat dibersihkan: ${cleanupError.message}`;
        }
        return failureMessage;
      }

      setAccount(accountFromUser(data.user, account.accountType));
      setAuthError("");
      if (account.avatarPath && account.avatarPath !== avatarPath) {
        const { error: removeError } = await supabaseClient.storage.from(profilePhotoBucket).remove([account.avatarPath]);
        if (removeError) setAuthError(`Profil tersimpan, tetapi foto lama belum dapat dihapus: ${removeError.message}`);
      }
      if (postAfterProfile) {
        setPostAfterProfile(false);
        navigate("/lomba/tambahkan");
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Profil gagal disimpan.";
    }
  };

  const savePersonalization = async (preferences) => {
    if (!supabaseClient) return "Supabase belum dikonfigurasi.";
    try {
      const { data, error } = await supabaseClient.auth.updateUser({
        data: {
          full_name: account.fullName,
          phone: account.phone,
          region: account.region,
          institution: account.institution,
          preferences,
        },
      });
      if (error) return error.message;
      if (!data.user) return "Preferensi tidak dapat dimuat setelah disimpan.";

      setAccount(accountFromUser(data.user, account.accountType));
      setAuthError("");
      navigate(routePath === "/rekomendasi" ? "/rekomendasi" : "/");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Personalisasi gagal disimpan.";
    }
  };

  const openAccountPrompt = (share = false, required = false) => {
    setEncourageShare(share);
    setPromptRequired(required);
    setPromptOpen(true);
  };
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  const requestSubmission = () => {
    if (!account) {
      openAccountPrompt(true);
      return;
    }
    if (account.role !== "organizer" && account.role !== "moderator") {
      setAuthError("Role peserta tidak dapat mengajukan lomba. Role akun tidak dapat diubah.");
      return;
    }
    if (!isProfileComplete(account)) {
      setPostAfterProfile(true);
      navigate("/profile");
      return;
    }
    navigate("/lomba/tambahkan");
  };

  const categoryOptions = useMemo(
    () => [...new Set(competitions.map((item) => item.category))].sort(),
    [competitions],
  );
  const keywordSuggestions = useMemo(
    () => [...new Set(competitions.flatMap((item) => item.keywords || []))],
    [competitions],
  );

  if (!authReady || (account && !accountRoleReady)) {
    return <main className="auth-loading" role="status"><LoaderCircle size={20} className="loading-icon" /> Memuat sesi akun...</main>;
  }

  if (routePath === "/login" || routePath === "/register") {
    return <AuthPage mode={routePath.slice(1)} navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError={authError} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (routePath === "/admin/login") {
    return <AdminLoginPage navigate={navigate} onLogin={signInAsModerator} authConfigured={Boolean(supabaseClient)} authError={authError} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (routePath === "/profile") {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk dengan Google untuk mengatur profil." theme={theme} onToggleTheme={toggleTheme} />;
    }
    return <ProfilePage account={account} onSave={saveProfile} onCancel={() => { setPostAfterProfile(false); navigate("/"); }} pendingPost={postAfterProfile} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (routePath === "/role") {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk dengan Google untuk memilih jenis akun." theme={theme} onToggleTheme={toggleTheme} />;
    }
    if (account.role === "moderator") return null;
    return <RoleSelectionPage account={account} onSave={saveAccountType} theme={theme} onToggleTheme={toggleTheme} authError={authError} />;
  }
  if (routePath === "/personalization") {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk dengan Google untuk mengatur personalisasi." theme={theme} onToggleTheme={toggleTheme} />;
    }
    return <PersonalizationPage account={account} categoryOptions={categoryOptions} onSave={savePersonalization} onCancel={() => navigate("/")} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (routePath === "/settings") {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk dengan Google untuk membuka pengaturan." theme={theme} onToggleTheme={toggleTheme} />;
    }
    return <SettingsPage account={account} onLogout={logout} onCancel={() => navigate("/")} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (routePath === "/admin" || routePath === "/admin/tambahkan-lomba") {
    if (account?.role !== "moderator") {
      return <AdminLoginPage
        navigate={navigate}
        onLogin={signInAsModerator}
        authConfigured={Boolean(supabaseClient)}
        authError={authError || "Sesi ini tidak memiliki akses moderator. Silakan masuk dengan akun moderator."}
        theme={theme}
        onToggleTheme={toggleTheme}
      />;
    }
    return <AdminPage routePath={routePath} account={account} supabaseClient={supabaseClient} navigate={navigate} onLogout={logout} onCompetitionsChanged={() => setCompetitionReloadKey((current) => current + 1)} theme={theme} onToggleTheme={toggleTheme} suggestedKeywords={keywordSuggestions} />;
  }
  if (routePath.startsWith("/lomba/")) {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk untuk menambahkan dan mengelola lomba." theme={theme} onToggleTheme={toggleTheme} />;
    }
    if (account.role !== "organizer" && account.role !== "moderator") return null;
    return <OrganizerPage
      account={account}
      supabaseClient={supabaseClient}
      route={route}
      navigate={navigate}
      onLogout={logout}
      suggestedKeywords={keywordSuggestions}
      formPersistenceKey={`lombalink.competition-form.v1.${account.id}.${new URLSearchParams(route.slice(route.indexOf("?") + 1)).get("edit") || "new"}`}
      onCompetitionsChanged={() => setCompetitionReloadKey((current) => current + 1)}
      theme={theme}
      onToggleTheme={toggleTheme}
    />;
  }

  const requestedSection = new URLSearchParams(route.split("?")[1] || "").get("section");
  const initialSection = routePath === "/cari"
    ? "cari"
    : routePath === "/rekomendasi" ? "rekomendasi" : routePath === "/" ? requestedSection || "" : "";
  const isCompetitionDetailRoute = routePath.startsWith("/kompetisi/");
  const detailCompetitionId = isCompetitionDetailRoute ? routePath.slice("/kompetisi/".length) : "";
  const detailCompetition = competitions.find((item) => item.id === detailCompetitionId);
  const publicPage = isCompetitionDetailRoute
    ? competitionsLoading
      ? <main className="competition-detail-state" role="status"><LoaderCircle size={20} className="loading-icon" /> Memuat detail lomba...</main>
      : competitionsError
        ? <main className="competition-detail-state" role="alert"><div><h1>Detail lomba tidak dapat dimuat</h1><p>{competitionsError}</p><button className="button button-outline" onClick={() => navigate("/")}>Kembali ke beranda</button></div></main>
        : detailCompetition
          ? <CompetitionDetailPage
            item={detailCompetition}
            competitions={competitions}
            account={account}
            navigate={navigate}
            onTrackEvent={trackCompetitionEvent}
            onReport={submitCompetitionReport}
          />
          : <main className="competition-detail-state"><div><h1>Lomba tidak ditemukan</h1><p>Informasi lomba mungkin sudah dihapus atau tidak lagi tersedia.</p><button className="button button-outline" onClick={() => navigate("/")}>Kembali ke beranda</button></div></main>
    : <LandingPage
      account={account}
      navigate={navigate}
      onSubmit={requestSubmission}
      onRequireAccount={openAccountPrompt}
      competitions={competitions}
      competitionsLoading={competitionsLoading}
      competitionsError={competitionsError}
      categoryOptions={categoryOptions}
      initialSection={initialSection}
    />;

  return (
    <>
      <Navbar account={account} route={route} navigate={navigate} onSubmit={requestSubmission} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} />
      {authError && <div className="auth-error-banner" role="alert">{authError}<button onClick={() => setAuthError("")}>Tutup</button></div>}
      {publicPage}
      <SiteFooter navigate={navigate} account={account} />
      {promptOpen && <AccountPrompt onClose={() => { setPromptRequired(false); setPromptOpen(false); }} navigate={navigate} encourageShare={encourageShare} required={promptRequired} />}
    </>
  );
}
