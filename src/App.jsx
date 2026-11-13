import React, { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AccountPrompt, Header } from "./components.jsx";
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
import ProfilePage from "./pages/ProfilePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import OrganizerPage from "./pages/OrganizerPage.jsx";

const profilePhotoBucket = "lombalink-profile-photos";

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
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [competitions, setCompetitions] = useState([]);
  const [competitionsLoading, setCompetitionsLoading] = useState(true);
  const [competitionsError, setCompetitionsError] = useState("");
  const [competitionReloadKey, setCompetitionReloadKey] = useState(0);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptRequired, setPromptRequired] = useState(false);
  const [encourageShare, setEncourageShare] = useState(false);
  const [postAfterProfile, setPostAfterProfile] = useState(false);

  useEffect(() => {
    if (!authReady || account || routePath !== "/" || promptOpen) return undefined;

    const showRequiredPrompt = () => {
      setEncourageShare(false);
      setPromptRequired(true);
      setPromptOpen(true);
    };
    const blockGuestClick = (event) => {
      if (event.target instanceof Element && event.target.closest("[data-guest-access]")) return;
      event.preventDefault();
      event.stopPropagation();
      showRequiredPrompt();
    };
    const promptOnScroll = () => showRequiredPrompt();

    document.addEventListener("click", blockGuestClick, true);
    window.addEventListener("scroll", promptOnScroll, { passive: true });
    return () => {
      document.removeEventListener("click", blockGuestClick, true);
      window.removeEventListener("scroll", promptOnScroll);
    };
  }, [account, authReady, promptOpen, routePath]);

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
        setCompetitionsError("Supabase belum dikonfigurasi. Data lomba tidak dapat dimuat.");
        setAuthReady(true);
        return;
      }

      const { data: { subscription: authSubscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        setAccount(accountFromUser(session?.user));
        setAuthReady(true);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setAuthError("");
      });
      subscription = authSubscription;

      return client.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(authErrorMessage(error, "Sesi akun tidak dapat dimuat."));
        setAccount(accountFromUser(data.session?.user));
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
    if (!supabaseClient) return undefined;
    let active = true;
    setCompetitionsLoading(true);
    setCompetitionsError("");

    supabaseClient
      .from("lombalink_competitions")
      .select("*")
      .eq("status", "approved")
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
        if (active) setCompetitionsLoading(false);
      });

    return () => { active = false; };
  }, [competitionReloadKey, supabaseClient]);

  useEffect(() => {
    if (authReady && routePath === "/admin" && account?.role !== "moderator") {
      navigate("/admin/login");
    }
  }, [account, authReady, navigate, routePath]);

  useEffect(() => {
    if (authReady && account && routePath === "/lomba/tambahkan"
      && account.role !== "moderator" && !isProfileComplete(account)) {
      setPostAfterProfile(true);
      navigate("/profile");
    }
  }, [account, authReady, navigate, routePath]);

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
      if (!data.url) return "Supabase tidak memberikan URL untuk memulai login Google.";
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

      setAccount(accountFromUser(data.user));
      setAuthError("");
      if (account.avatarPath && account.avatarPath !== avatarPath) {
        const { error: removeError } = await supabaseClient.storage.from(profilePhotoBucket).remove([account.avatarPath]);
        if (removeError) setAuthError(`Profil tersimpan, tetapi foto lama belum dapat dihapus: ${removeError.message}`);
      }
      if (postAfterProfile) {
        setPostAfterProfile(false);
        navigate("/lomba/tambahkan");
      } else {
        navigate("/");
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

      setAccount(accountFromUser(data.user));
      setAuthError("");
      navigate("/");
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

  if (!authReady) {
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
  if (routePath === "/admin") {
    if (account?.role !== "moderator") return null;
    return <AdminPage account={account} supabaseClient={supabaseClient} navigate={navigate} onLogout={logout} onCompetitionsChanged={() => setCompetitionReloadKey((current) => current + 1)} theme={theme} onToggleTheme={toggleTheme} />;
  }
  if (routePath.startsWith("/lomba/")) {
    if (!account) {
      return <AuthPage mode="login" navigate={navigate} onGoogleSignIn={signInWithGoogle} authConfigured={Boolean(supabaseClient)} authError="Masuk untuk menambahkan dan mengelola lomba." theme={theme} onToggleTheme={toggleTheme} />;
    }
    return <OrganizerPage
      account={account}
      supabaseClient={supabaseClient}
      route={route}
      navigate={navigate}
      onLogout={logout}
      onCompetitionsChanged={() => setCompetitionReloadKey((current) => current + 1)}
      theme={theme}
      onToggleTheme={toggleTheme}
    />;
  }

  return (
    <>
      <Header account={account} navigate={navigate} onSubmit={requestSubmission} onLogout={logout} theme={theme} onToggleTheme={toggleTheme} />
      {authError && <div className="auth-error-banner" role="alert">{authError}<button onClick={() => setAuthError("")}>Tutup</button></div>}
      <LandingPage account={account} navigate={navigate} onSubmit={requestSubmission} onRequireAccount={openAccountPrompt} onTrackEvent={trackCompetitionEvent} competitions={competitions} competitionsLoading={competitionsLoading} competitionsError={competitionsError} />
      {promptOpen && <AccountPrompt onClose={() => { setPromptRequired(false); setPromptOpen(false); }} navigate={navigate} encourageShare={encourageShare} required={promptRequired} />}
    </>
  );
}
