import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import lightBrandLogo from "../logo/themes-putih.png";
import darkBrandLogo from "../logo/themes-gelap.png";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  ChevronDown,
  IdCard,
  GraduationCap,
  Globe2,
  ExternalLink,
  FileText,
  Flag,
  Gift,
  Instagram,
  Link2,
  Layers3,
  LockKeyhole,
  MapPin,
  Mail,
  MessageCircle,
  Monitor,
  Music2,
  Plus,
  UsersRound,
  UserRoundPlus,
  Wallet,
  Moon,
  Search,
  Share2,
  Sparkles,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { competitionModeOptions, formatDate, organizerOptions, provinceOptions, scopeOptions, targetParticipantOptions } from "./data.js";
import { getCompetitionTagIcon, getDisplayTagLabel } from "./competitionTagIcons.js";
import { reportReasons } from "./reporting.js";

function getExternalContactUrl(url, fallback = "") {
  try {
    const parsedUrl = new URL(url || fallback);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:"
      ? parsedUrl.href
      : "";
  } catch {
    return "";
  }
}

export function Brand({ onClick }) {
  return (
    <button className="brand" type="button" data-guest-access onClick={onClick} aria-label="LombaLink, beranda">
      <img className="brand-logo brand-logo-light" src={lightBrandLogo} alt="LombaLink" />
      <img className="brand-logo brand-logo-dark" src={darkBrandLogo} alt="" aria-hidden="true" />
    </button>
  );
}

export function SiteFooter({ navigate, account }) {
  return (
    <footer className="site-footer content-width">
      <Brand onClick={() => {
        if (window.location.pathname === "/" && !window.location.search) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          navigate("/");
        }
      }} />
      <span>© 2026 LombaLink.</span>
      {!account && <div>
        <button data-guest-access onClick={() => navigate("/login")}>Masuk</button>
        <button data-guest-access onClick={() => navigate("/register")}>Bergabung</button>
      </div>}
    </footer>
  );
}

export function ThemeToggle({ theme, onToggleTheme }) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
      type="button"
      data-guest-access
      aria-label={`Aktifkan tema ${nextTheme}`}
      title={`Aktifkan tema ${nextTheme}`}
      onClick={onToggleTheme}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function getNearestRegistrationBatch(item) {
  const batches = Array.isArray(item.registrationBatches) ? item.registrationBatches : [];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return batches
    .filter((batch) => typeof batch.endsAt === "string" && batch.endsAt >= today)
    .sort((first, second) => (first.startsAt || first.endsAt).localeCompare(second.startsAt || second.endsAt))[0] || null;
}

function getDaysUntilDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || "")) return null;
  const targetDate = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(targetDate.getTime()) || targetDate.toISOString().slice(0, 10) !== dateString) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((targetDate.getTime() - today) / 86400000);
}

function getRegistrationBadge(item, batch) {
  const startsIn = getDaysUntilDate(batch?.startsAt);
  const closesIn = getDaysUntilDate(batch?.endsAt || item.deadline);
  if (closesIn == null) return { text: "Jadwal belum ada", status: "unknown" };
  if (closesIn < 0) return { text: "Ditutup", status: "closed" };
  if (startsIn > 0) return { text: `Buka H-${startsIn}`, status: "upcoming" };
  if (closesIn === 0) return { text: "Tutup hari ini", status: "closing" };
  return { text: `H-${closesIn} Tutup`, status: "open" };
}

function PosterLightbox({ imageUrl, imageAlt, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="poster-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Poster ${imageAlt}`}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <button className="poster-lightbox-close" type="button" aria-label="Tutup poster" onClick={onClose}><X size={21} /></button>
      <img src={imageUrl} alt={imageAlt} />
    </div>
  );
}

function getCompetitionCardTags(item) {
  const candidates = [
    item.competitionType,
    item.competitionCategory,
    item.category,
    ...(Array.isArray(item.keywords) ? item.keywords : []),
  ];
  const tags = [];
  const seenTags = new Set();

  for (const candidate of candidates) {
    const tag = getDisplayTagLabel(candidate);
    const normalizedTag = tag.toLocaleLowerCase("id-ID");
    if (!tag || seenTags.has(normalizedTag)) continue;
    seenTags.add(normalizedTag);
    tags.push(tag);
    if (tags.length === 5) break;
  }

  return tags;
}

export function CompetitionCard({ item, onDetails }) {
  const [coverAspectRatio, setCoverAspectRatio] = useState("9 / 16");
  const [shareFeedback, setShareFeedback] = useState("");
  const cardRef = useRef(null);
  const contentRef = useRef(null);
  const nearestBatch = getNearestRegistrationBatch(item);
  const registrationBadge = getRegistrationBadge(item, nearestBatch);
  const batchDates = nearestBatch
    ? `${formatDate(nearestBatch.startsAt)}${nearestBatch.endsAt !== nearestBatch.startsAt ? ` - ${formatDate(nearestBatch.endsAt)}` : ""}`
    : `Tutup ${formatDate(item.deadline)}`;
  const registrationDate = batchDates;
  const audience = item.audience || item.education;
  const location = item.location && item.location !== item.mode ? item.location : "";
  const execution = [item.mode, location].filter(Boolean).join(" · ");
  const feeType = nearestBatch?.feeType || item.feeType || "Gratis";
  const feeAmount = nearestBatch?.feeAmount ?? item.feeAmount;
  const feeLabel = feeType === "Berbayar"
    ? feeAmount != null && feeAmount !== "" ? `Rp ${Number(feeAmount).toLocaleString("id-ID")}` : "Berbayar"
    : "Gratis";
  const eventStart = item.eventStartDate ? formatDate(item.eventStartDate) : "";
  const eventDates = eventStart
    ? `${eventStart}${item.eventEndDate && item.eventEndDate !== item.eventStartDate ? ` – ${formatDate(item.eventEndDate)}` : ""}`
    : "";
  const tags = getCompetitionCardTags(item);
  const CardArtIcon = getCompetitionTagIcon(item.category || item.competitionType);

  const navigateToDetails = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onDetails(item);
  };

  const shareCompetition = async () => {
    setShareFeedback("");
    const shareUrl = new URL(`/kompetisi/${encodeURIComponent(item.id)}`, window.location.origin).href;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: item.title, url: shareUrl });
        setShareFeedback("Tautan dibagikan.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API tidak tersedia.");
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback("Tautan disalin.");
    } catch {
      setShareFeedback("Tautan tidak dapat dibagikan dari browser ini.");
    }
  };

  useEffect(() => {
    const card = cardRef.current;
    const content = contentRef.current;
    if (!card || !content) return;
    if (!item.coverUrl) {
      card.style.removeProperty("--card-cover-column-width");
      return;
    }
    if (typeof ResizeObserver === "undefined") return;

    const [aspectWidth, aspectHeight] = coverAspectRatio.split("/").map(Number);
    const aspect = aspectWidth / aspectHeight;
    const resizeObserver = new ResizeObserver(() => {
      const cardWidth = card.getBoundingClientRect().width;
      const contentHeight = content.getBoundingClientRect().height;
      const minimumColumnWidth = cardWidth < 768 ? 88 : 144;
      const columnWidth = Math.max(minimumColumnWidth, Math.min(cardWidth * 0.38, contentHeight * aspect));
      card.style.setProperty("--card-cover-column-width", `${columnWidth}px`);
    });

    resizeObserver.observe(card);
    resizeObserver.observe(content);
    return () => resizeObserver.disconnect();
  }, [coverAspectRatio, item.coverUrl]);

  return (
    <article className={`competition-card${feeType === "Berbayar" ? " is-paid" : ""}${item.registrationUrl ? " has-registration" : ""}`} ref={cardRef}>
        <a
          className="competition-card-main"
          href={`/kompetisi/${encodeURIComponent(item.id)}`}
          aria-label={`Buka detail lomba ${item.title}`}
          onClick={navigateToDetails}
        >
          <div className={`card-art ${item.color || "blue"}${item.coverUrl ? " has-cover" : ""}`} style={item.coverUrl ? { "--card-cover-aspect": coverAspectRatio } : undefined}>
            {item.coverUrl ? (
              <img
                className="card-cover-image"
                src={item.coverUrl}
                alt=""
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth && naturalHeight) setCoverAspectRatio(`${naturalWidth} / ${naturalHeight}`);
                }}
              />
            ) : <span className="card-art-icon"><CardArtIcon size={25} aria-hidden="true" /></span>}
          </div>
          <div className="card-content" ref={contentRef}>
            <div className="competition-card-top">
              <div className="competition-card-top-copy">
                <div className="competition-card-badges">
                  <span className={`competition-card-fee-badge${feeType === "Berbayar" ? " is-paid" : ""}`}>
                    {feeType === "Berbayar" ? <Wallet size={13} aria-hidden="true" /> : <Layers3 size={13} aria-hidden="true" />}
                    {feeType === "Berbayar" ? "Berbayar" : "Gratis"}
                  </span>
                  <span className={`competition-card-registration-badge is-${registrationBadge.status}`}>
                    <Clock3 size={13} aria-hidden="true" />
                    {registrationBadge.text.startsWith("H-") ? <>
                      <span className="competition-card-countdown">{registrationBadge.text.split(" ")[0]}</span>
                      {" "}
                      {registrationBadge.text.slice(registrationBadge.text.indexOf(" ") + 1)}
                    </> : registrationBadge.text}
                  </span>
                </div>
                <h3>{item.title}</h3>
                {item.organizer && <p className="competition-card-organizer"><Building2 size={14} /> {item.organizer}</p>}
                {tags.length > 0 && <div className="competition-card-tags">{tags.map((tag) => {
                  const TagIcon = getCompetitionTagIcon(tag);
                  return <span className="soft-tag" key={tag}><TagIcon size={12} aria-hidden="true" /><span className="competition-card-tag-label">{tag}</span></span>;
                })}</div>}
              </div>
              <div className={`competition-card-trophy${feeType === "Berbayar" ? " is-paid" : ""}`} aria-hidden="true">
                <Sparkles className="competition-card-trophy-sparkle is-left" size={15} />
                <svg className="competition-card-trophy-art" viewBox="0 0 150 120" aria-hidden="true">
                  <path className="competition-card-laurels" d="M41 59C20 66 15 91 35 108M109 59c21 7 26 32 6 49" />
                  <path className="competition-card-leaves" d="m31 70-12-8 14 2m-11 17-13-5 14-1m-10 20 12-9m94-16 12-8-14 2m11 17 13-5-14-1m10 20-12-9" />
                  <path className="competition-card-handles" d="M48 22H32v12c0 14 8 23 21 26m49-38h16v12c0 14-8 23-21 26" />
                  <path className="competition-card-cup" d="M47 13h56v24c0 23-12 39-28 49-16-10-28-26-28-49z" />
                  <path className="competition-card-cup-highlight" d="M54 19h15v37c0 8 2 15 7 22-12-9-23-23-23-42z" />
                  <path className="competition-card-star" d="m75 29 4 9 10 1-7.5 6.5 2.5 10-9-5.5-9 5.5 2.5-10L61 39l10-1z" />
                  <path className="competition-card-stem" d="M68 85h14v11h16v8H54v-8h14z" />
                  <path className="competition-card-base" d="M49 105h52v7H49z" />
                </svg>
                <Sparkles className="competition-card-trophy-sparkle is-right" size={13} />
              </div>
            </div>
            <div className="competition-card-info">
              <div className="competition-card-registration">
                <CalendarDays size={14} />
                <span><small>Pendaftaran</small><strong>{registrationDate}</strong></span>
              </div>
              {audience && (
                <div className="competition-card-fact">
                  <UsersRound size={14} />
                  <span><small>Untuk siapa</small><strong>{audience}</strong></span>
                </div>
              )}
              {item.scope && <div className="competition-card-fact"><Layers3 size={14} /><span><small>Cakupan</small><strong>{item.scope}</strong></span></div>}
              {execution && <div className="competition-card-fact"><Monitor size={14} /><span><small>Pelaksanaan</small><strong>{execution}</strong></span></div>}
              {eventDates && <div className="competition-card-fact"><CalendarDays size={14} /><span><small>Tanggal lomba</small><strong>{eventDates}</strong></span></div>}
            </div>
            <div className="card-bottom">
              {feeType === "Berbayar" && <span className="competition-card-fee-detail"><Wallet size={18} /><span><small>Biaya pendaftaran</small><strong>{feeLabel}</strong></span></span>}
              <span className="competition-card-details-button">Detail Selengkapnya <ArrowRight size={14} /></span>
            </div>
          </div>
        </a>
        <div className="competition-card-mobile-actions">
          {item.registrationUrl && <a className="competition-card-mobile-register" href={item.registrationUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Daftar Sekarang</a>}
          <a
            className="competition-card-details-button competition-card-mobile-details"
            href={`/kompetisi/${encodeURIComponent(item.id)}`}
            onClick={navigateToDetails}
          >
            Detail Selengkapnya <ArrowRight size={14} />
          </a>
        </div>
        {item.registrationUrl && <a className="competition-card-register" href={item.registrationUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Daftar Sekarang</a>}
        <button className="competition-card-share" type="button" aria-label={`Bagikan lomba ${item.title}`} title="Bagikan lomba" onClick={shareCompetition}>
          <Share2 size={16} aria-hidden="true" />
        </button>
        {shareFeedback && <span className="competition-card-share-feedback" role="status">{shareFeedback}</span>}
    </article>
  );
}

function renderDescriptionInline(value, keyPrefix) {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderDescriptionLines(value, keyPrefix) {
  const content = [];
  let listItems = [];
  let listType = "";
  const flushList = () => {
    if (!listItems.length) return;
    const ListTag = listType === "ordered" ? "ol" : "ul";
    content.push(<ListTag key={`${keyPrefix}-list-${content.length}`}>{listItems}</ListTag>);
    listItems = [];
    listType = "";
  };

  String(value || "").split(/\r?\n/).forEach((line, index) => {
    const unorderedItem = line.match(/^\s*[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+\.\s+(.+)$/);
    const listItem = unorderedItem || orderedItem;
    if (listItem) {
      const nextListType = orderedItem ? "ordered" : "unordered";
      if (listItems.length && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push(<li key={`${keyPrefix}-item-${index}`}>{renderDescriptionInline(listItem[1], `${keyPrefix}-inline-${index}`)}</li>);
      return;
    }
    flushList();
    if (line.trim()) {
      content.push(<p key={`${keyPrefix}-paragraph-${index}`}>{renderDescriptionInline(line, `${keyPrefix}-inline-${index}`)}</p>);
    }
  });
  flushList();
  return content;
}

function CompetitionDescription({ value }) {
  const content = [];
  const segments = String(value || "").split(/(\[\[justify\]\][\s\S]*?\[\[\/justify\]\])/g);
  segments.forEach((segment, index) => {
    const isJustified = segment.startsWith("[[justify]]") && segment.endsWith("[[/justify]]");
    const text = isJustified
      ? segment.slice("[[justify]]".length, segment.length - "[[/justify]]".length)
      : segment;
    const blocks = renderDescriptionLines(text, `description-${index}`);
    if (isJustified) {
      content.push(<div className="competition-description-justified" key={`justified-${index}`}>{blocks}</div>);
    } else {
      content.push(...blocks);
    }
  });
  return <div className="competition-description-content">{content}</div>;
}

function CompetitionInfoCard({ title, subtitle, Icon, numberedPoints = false, children }) {
  const headingId = `competition-info-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className={`competition-info-card${numberedPoints ? " competition-info-card-points" : ""}`} aria-labelledby={headingId}>
      <header className="competition-info-card-header">
        <span className="competition-info-card-icon"><Icon size={17} aria-hidden="true" /></span>
        <div>
          <h3 id={headingId}>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>
      <div className="competition-info-card-body">{children}</div>
    </section>
  );
}

export function CompetitionDetails({ item, onClose, onTrackEvent, onReport, isLoggedIn, onRequireLogin, moderationActions }) {
  const [posterOpen, setPosterOpen] = useState(false);
  const [summaryDescriptionLines, setSummaryDescriptionLines] = useState(0);
  const overviewRef = useRef(null);
  const posterRef = useRef(null);
  const summaryRef = useRef(null);
  const summaryDescriptionRef = useRef(null);
  const factsRef = useRef(null);
  const [shareNotice, setShareNotice] = useState("");
  const [shareError, setShareError] = useState("");
  const [copyAnimationKey, setCopyAnimationKey] = useState(0);
  const [sharingPoster, setSharingPoster] = useState(false);
  const [posterPreparing, setPosterPreparing] = useState(false);
  const [posterPreparationError, setPosterPreparationError] = useState("");
  const [preparedPoster, setPreparedPoster] = useState(null);
  const [trackingError, setTrackingError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(reportReasons[0].value);
  const [reportDescription, setReportDescription] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportNotice, setReportNotice] = useState("");

  useEffect(() => {
    setTrackingError("");
    if (!item || !onTrackEvent) return undefined;

    let active = true;
    onTrackEvent(item.id, "view").then((message) => {
      if (active && message) setTrackingError(message);
    });
    return () => { active = false; };
  }, [item?.id, onTrackEvent]);

  useEffect(() => {
    setShareNotice("");
    setShareError("");
    setSharingPoster(false);
    setPosterPreparationError("");
    setReportOpen(false);
    setReportReason(reportReasons[0].value);
    setReportDescription("");
    setReportError("");
    setReportNotice("");
  }, [item?.id]);

  useEffect(() => {
    let active = true;
    setPreparedPoster(null);
    setPosterPreparationError("");
    if (!item?.coverUrl) {
      setPosterPreparing(false);
      return () => { active = false; };
    }

    setPosterPreparing(true);
    fetch(item.coverUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Poster gagal diunduh (${response.status}).`);
        return response.blob();
      })
      .then((blob) => {
        if (!blob.type.startsWith("image/")) throw new Error("Respons poster bukan berkas gambar.");
        const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1]?.split("+")[0] || "img";
        const file = new File([blob], `poster-lombalink.${extension}`, { type: blob.type });
        if (active) setPreparedPoster({ url: item.coverUrl, file });
      })
      .catch(() => {
        if (active) setPosterPreparationError("Poster tidak dapat disiapkan untuk dibagikan sebagai gambar.");
      })
      .finally(() => {
        if (active) setPosterPreparing(false);
      });

    return () => { active = false; };
  }, [item?.id, item?.coverUrl]);

  useLayoutEffect(() => {
    const overview = overviewRef.current;
    const poster = posterRef.current;
    const summary = summaryRef.current;
    const preview = summaryDescriptionRef.current;
    const facts = factsRef.current;
    if (!item?.description && !item?.tagline) {
      setSummaryDescriptionLines(0);
      return undefined;
    }
    if (!summary || !preview) {
      setSummaryDescriptionLines(poster ? 0 : 2);
      return undefined;
    }

    const updateLineLimit = () => {
      if (!poster) {
        setSummaryDescriptionLines(2);
        return;
      }

      const style = window.getComputedStyle(preview);
      const lineHeight = Number.parseFloat(style.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

      const descriptionHeight = preview.getBoundingClientRect().height;
      const summaryHeight = summary.getBoundingClientRect().height;
      const summaryWithoutDescription = summaryHeight - descriptionHeight;
      const factsBesidePoster = window.matchMedia("(min-width: 681px)").matches;
      const factsHeight = factsBesidePoster ? facts?.getBoundingClientRect().height || 0 : 0;
      const rowGap = factsBesidePoster && overview
        ? Number.parseFloat(window.getComputedStyle(overview).rowGap) || 0
        : 0;
      const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const remainingHeight = poster.getBoundingClientRect().height
        - summaryWithoutDescription
        - factsHeight
        - rowGap
        - padding;
      const nextLineLimit = Math.max(0, Math.floor(remainingHeight / lineHeight));
      setSummaryDescriptionLines((current) => current === nextLineLimit ? current : nextLineLimit);
    };

    updateLineLimit();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateLineLimit);
    [overview, poster, summary, facts].forEach((element) => {
      if (element) resizeObserver?.observe(element);
    });
    window.addEventListener("resize", updateLineLimit);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateLineLimit);
    };
  }, [item?.id, item?.description, item?.tagline, item?.coverUrl]);

  if (!item) return null;
  const fees = Array.isArray(item.feeTiers) ? item.feeTiers : [];
  const batches = Array.isArray(item.registrationBatches) ? item.registrationBatches : [];
  const contacts = Array.isArray(item.contactPeople) && item.contactPeople.length
    ? item.contactPeople
    : item.contactPersonName || item.contactPersonPhone || item.contactPersonEmail || item.contact
      ? [{
        name: item.contactPersonName || "",
        phone: item.contactPersonPhone || item.contact || "",
        email: item.contactPersonEmail || "",
        instagramUsername: "",
        instagramUrl: "",
      }]
      : [];
  const competitionUrl = new URL(`/kompetisi/${encodeURIComponent(item.id)}`, window.location.origin).href;
  const preparedPosterFile = preparedPoster?.url === item.coverUrl ? preparedPoster.file : null;
  const description = String(item.description || item.tagline || "").replace(/\s+/g, " ").trim();
  const descriptionPreview = description.length > 500 ? `${description.slice(0, 497).trimEnd()}...` : description;
  const organizerSource = item.organizerLevel || item.organizerType;
  const overviewDescription = description
    .replace(/\[\[\/?justify\]\]/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const shareCaption = [
    `🏆 ${item.title}`,
    descriptionPreview,
    `Lihat detail lomba di LombaLink: ${competitionUrl}`,
  ].filter(Boolean).join("\n\n");
  const sharePosterImage = async () => {
    setShareNotice("");
    setShareError("");

    if (!item.coverUrl) {
      setShareError("Poster lomba ini belum tersedia untuk dibagikan sebagai gambar.");
      return;
    }
    if (!preparedPosterFile) {
      setShareError(posterPreparationError || "Poster masih disiapkan. Coba lagi sebentar.");
      return;
    }
    if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
      setShareError("Browser atau perangkat ini belum mendukung berbagi gambar langsung. Coba dari browser di ponsel.");
      return;
    }

    let supportsPosterSharing = false;
    try {
      supportsPosterSharing = navigator.canShare({ files: [preparedPosterFile] });
    } catch {
      supportsPosterSharing = false;
    }
    if (!supportsPosterSharing) {
      setShareError("Browser ini belum mendukung berbagi file gambar. Coba dari browser di ponsel.");
      return;
    }

    setSharingPoster(true);
    try {
      await navigator.share({
        files: [preparedPosterFile],
        title: item.title,
        text: shareCaption,
      });
      setShareNotice("Poster berhasil dibagikan.");
    } catch (error) {
      if (error?.name === "AbortError") {
        setShareNotice("Berbagi poster dibatalkan.");
      } else {
        setShareError("Poster tidak dapat dikirim sebagai gambar. Periksa koneksi dan coba lagi.");
      }
    } finally {
      setSharingPoster(false);
    }
  };
  const copyCompetitionLink = async () => {
    setShareNotice("");
    setShareError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API tidak tersedia.");
      await navigator.clipboard.writeText(competitionUrl);
      setCopyAnimationKey((current) => current + 1);
    } catch {
      setShareError("Tautan tidak dapat disalin. Silakan salin alamat halaman ini dari browser.");
    }
  };
  const targetParticipants = Array.isArray(item.targetParticipants) && item.targetParticipants.length
    ? item.targetParticipants.join(", ")
    : item.audience || item.education;
  const hasCompetitionFacts = Boolean(
    item.competitionCategory || item.competitionType || item.category || item.participantType
      || targetParticipants || item.scope || item.mode || item.location || item.deadline || item.eventStartDate,
  );
  const trackRegistration = () => {
    if (!onTrackEvent) return;
    onTrackEvent(item.id, "registration_click").then((message) => {
      if (message) setTrackingError(message);
    });
  };
  const submitReport = async (event) => {
    event.preventDefault();
    setReportBusy(true);
    setReportError("");
    try {
      const message = await onReport({
        competitionId: item.id,
        reason: reportReason,
        description: reportDescription.trim(),
      });
      if (message) {
        setReportError(message);
        return;
      }
      setReportOpen(false);
      setReportDescription("");
      setReportNotice("Laporan terkirim. Terima kasih sudah membantu menjaga informasi LombaLink.");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Laporan gagal dikirim.");
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="competition-detail-content">
        {onClose && <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>}
        <section className={`competition-detail-overview${item.coverUrl ? " has-poster" : ""}`} ref={overviewRef}>
          {item.coverUrl && <button ref={posterRef} className="competition-detail-cover-button" type="button" aria-label={`Perbesar poster ${item.title}`} onClick={() => setPosterOpen(true)}><img className="competition-detail-cover" src={item.coverUrl} alt={`Poster ${item.title}`} /></button>}
          <div className="competition-detail-summary" ref={summaryRef}>
            <div className="competition-detail-status-row">
              <div className="competition-detail-status-tags">
                {item.competitionCategory && <span>{item.competitionCategory}</span>}
                {item.status === "approved" && <span className="is-verified"><Check size={12} /> Terverifikasi</span>}
              </div>
              {onReport && !moderationActions && !reportNotice && <button
                className="competition-report-icon-button"
                type="button"
                aria-label={isLoggedIn ? "Laporkan informasi lomba" : "Masuk untuk melaporkan lomba"}
                title={isLoggedIn ? "Laporkan informasi lomba" : "Masuk untuk melaporkan lomba"}
                aria-expanded={isLoggedIn ? reportOpen : undefined}
                onClick={isLoggedIn
                  ? () => { setReportOpen((current) => !current); setReportError(""); }
                  : onRequireLogin}
              ><Flag size={15} aria-hidden="true" /></button>}
            </div>
            {shareNotice && <p className="competition-share-feedback" role="status">{shareNotice}</p>}
            {(shareError || posterPreparationError) && <p className="competition-share-feedback is-error" role="alert">{shareError || posterPreparationError}</p>}
            <h2 id="detail-title">{item.title}</h2>
            {(item.organizer || organizerSource) && <p className="detail-organizer">
              <Building2 size={16} aria-hidden="true" />
              {item.organizer && <span>{item.organizer}</span>}
              {organizerSource && <span className="detail-organizer-level">{organizerSource}</span>}
            </p>}
            <div className="competition-detail-badges">
              {item.competitionType && <span><Trophy size={13} />{item.competitionType}</span>}
              {targetParticipants && <span><GraduationCap size={13} />{targetParticipants}</span>}
              {item.participantType && <span><UsersRound size={13} />{item.participantType}</span>}
              {item.scope && <span><Globe2 size={13} />{item.scope}</span>}
            </div>
            {overviewDescription && <p
              ref={summaryDescriptionRef}
              className="competition-detail-summary-text"
              style={{
                WebkitLineClamp: Math.max(1, summaryDescriptionLines),
                maxHeight: summaryDescriptionLines > 0 ? undefined : 0,
                visibility: summaryDescriptionLines > 0 ? "visible" : "hidden",
              }}
            >{overviewDescription}</p>}
            <div className="competition-detail-actions">
              {item.registrationUrl && <a className="button button-primary competition-detail-register" href={item.registrationUrl} target="_blank" rel="noreferrer" onClick={trackRegistration}>Daftar lomba <ExternalLink size={15} /></a>}
              <div className="competition-detail-share-actions" aria-label="Bagikan lomba">
                <button className="button button-outline" type="button" onClick={copyCompetitionLink} aria-label="Salin tautan lomba"><Link2 key={copyAnimationKey} className={`competition-link-copy-icon${copyAnimationKey > 0 ? " is-copy-success" : ""}`} size={15} /> Salin tautan</button>
                <button className="button competition-share-whatsapp" type="button" onClick={sharePosterImage} disabled={sharingPoster || posterPreparing || Boolean(item.coverUrl && !preparedPosterFile && !posterPreparationError)} aria-label="Bagikan poster sebagai gambar"><MessageCircle size={16} />{sharingPoster || posterPreparing || Boolean(item.coverUrl && !preparedPosterFile && !posterPreparationError) ? "Menyiapkan poster..." : "Bagikan poster"}</button>
              </div>
            </div>
          </div>
          {hasCompetitionFacts && <div className="detail-grid" ref={factsRef}>
            {item.competitionCategory && <div><span>Kategori</span><strong>{item.competitionCategory}</strong></div>}
            {item.competitionType && <div><span>Tipe lomba</span><strong>{item.competitionType}</strong></div>}
            {item.category && <div><span>Bidang</span><strong>{item.category}</strong></div>}
            {item.participantType && <div><span>Jenis peserta</span><strong>{item.participantType}{item.participantType === "Tim" && item.teamMinMembers && item.teamMaxMembers ? ` · ${item.teamMinMembers === item.teamMaxMembers ? `${item.teamMinMembers}` : `${item.teamMinMembers}–${item.teamMaxMembers}`} anggota` : ""}</strong></div>}
            {targetParticipants && <div><span>Target peserta</span><strong>{targetParticipants}</strong></div>}
            {item.scope && <div><span>Cakupan</span><strong>{item.scope}</strong></div>}
            {item.mode && <div><span>Mode</span><strong>{item.mode}</strong></div>}
            {item.location && <div><span>Lokasi</span><strong>{item.location}</strong></div>}
            {item.deadline && <div><span>Batas pendaftaran</span><strong>{formatDate(item.deadline)}</strong></div>}
            {item.eventStartDate && <div><span>Pelaksanaan</span><strong>{formatDate(item.eventStartDate)}{item.eventEndDate && ` - ${formatDate(item.eventEndDate)}`}</strong></div>}
          </div>}
        </section>
        <div className="competition-detail-information">
          {item.description && <CompetitionInfoCard title="Tentang Lomba" subtitle="Deskripsi dan informasi singkat mengenai lomba ini." Icon={FileText}>
            <CompetitionDescription value={item.description} />
          </CompetitionInfoCard>}
        {batches.length > 0 && <section className="competition-registration-batches" aria-labelledby="registration-batches-title">
          <header className="competition-registration-batches-header">
            <span className="competition-registration-batches-icon"><Layers3 size={22} aria-hidden="true" /></span>
            <div>
              <h3 id="registration-batches-title">Batch Pendaftaran</h3>
              <p>Pendaftaran dibuka dalam beberapa gelombang. Pilih batch yang sesuai dengan waktumu.</p>
            </div>
          </header>
          <div className="competition-registration-batch-list">{batches.map((batch, index) => {
          const legacyFee = fees[index];
          const feeType = batch.feeType || (legacyFee ? "Berbayar" : item.feeType);
          const feeAmount = batch.feeType ? batch.feeAmount : legacyFee?.amount ?? item.feeAmount;
          const batchStatus = getRegistrationBadge(item, batch);
          const canRegister = ["open", "closing"].includes(batchStatus.status) && item.registrationUrl;
          const statusLabel = batchStatus.status === "open"
            ? "Dibuka"
            : batchStatus.status === "closing"
              ? "Tutup hari ini"
              : batchStatus.status === "upcoming"
                ? "Segera dibuka"
                : batchStatus.status === "closed" ? "Ditutup" : "Jadwal belum tersedia";
          const StatusIcon = ["closed", "unknown", "upcoming"].includes(batchStatus.status)
            ? batchStatus.status === "upcoming" ? Clock3 : LockKeyhole
            : null;
          const feeLabel = feeType === "Berbayar" && feeAmount != null && feeAmount !== ""
            ? `Rp ${Number(feeAmount).toLocaleString("id-ID")}`
            : feeType === "Gratis" ? "Gratis" : "Biaya belum ditentukan";
          return (
            <article className={`competition-registration-batch-card is-${batchStatus.status}`} key={`${batch.label}-${index}`}>
              <span className="competition-registration-batch-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="competition-registration-batch-copy">
                <h4>{batch.label || `Batch ${index + 1}`}</h4>
                <div className="competition-registration-batch-meta">
                  <span><CalendarDays size={15} aria-hidden="true" />{formatDate(batch.startsAt)} – {formatDate(batch.endsAt)}</span>
                  <span><Wallet size={15} aria-hidden="true" />{feeLabel}</span>
                </div>
              </div>
              <span className="competition-registration-batch-status">
                {StatusIcon
                  ? <StatusIcon size={15} aria-hidden="true" />
                  : <span className="competition-registration-batch-status-dot" aria-hidden="true" />}
                {statusLabel}
              </span>
              {canRegister && <a className="competition-registration-batch-cta" href={item.registrationUrl} target="_blank" rel="noreferrer" onClick={trackRegistration}>Daftar Sekarang <ArrowRight size={17} aria-hidden="true" /></a>}
            </article>
          );
        })}</div>
        </section>}
        {batches.length === 0 && (item.feeType || fees.length > 0) && <section className="competition-detail-section"><h3>Biaya pendaftaran</h3>
          {item.feeType === "Berbayar" && item.feeAmount != null && item.feeAmount !== ""
            ? <p>Rp {Number(item.feeAmount).toLocaleString("id-ID")}</p>
            : item.feeType === "Gratis"
              ? <p>Gratis</p>
              : fees.length > 0
                ? <ul>{fees.map((fee, index) => <li key={`${fee.label}-${index}`}><strong>{fee.label}</strong><span>Rp {Number(fee.amount).toLocaleString("id-ID")}</span></li>)}</ul>
                : <p>Nominal belum ditentukan</p>}
        </section>}
        {item.requirements && <CompetitionInfoCard title="Persyaratan" subtitle="Ketentuan yang perlu dipenuhi peserta lomba." Icon={ClipboardCheck} numberedPoints>
          <CompetitionDescription value={item.requirements} />
        </CompetitionInfoCard>}
        {item.prize && item.prize !== "Informasi hadiah belum ditambahkan" && <CompetitionInfoCard title="Hadiah" subtitle="Hadiah dan penghargaan yang disediakan penyelenggara." Icon={Gift} numberedPoints>
          <CompetitionDescription value={item.prize} />
        </CompetitionInfoCard>}
        {item.keywords?.length > 0 && <div className="competition-detail-keywords">{item.keywords.map((keyword) => {
          const TagIcon = getCompetitionTagIcon(keyword);
          return <span className="soft-tag" key={keyword}><TagIcon size={12} aria-hidden="true" />{getDisplayTagLabel(keyword)}</span>;
        })}</div>}
        {contacts.length > 0 && <CompetitionInfoCard title="Kontak Penyelenggara" subtitle="Hubungi penyelenggara melalui kanal berikut." Icon={UsersRound}>
          <div className="competition-detail-contacts">{contacts.map((contact, index) => {
          const instagramUsername = String(contact.instagramUsername || "").replace(/^@+/, "");
          const tiktokUsername = String(contact.tiktokUsername || "").replace(/^@+/, "");
          const instagramUrl = getExternalContactUrl(contact.instagramUrl, instagramUsername
            ? `https://www.instagram.com/${encodeURIComponent(instagramUsername)}/`
            : "");
          const tiktokUrl = getExternalContactUrl(contact.tiktokUrl, tiktokUsername
            ? `https://www.tiktok.com/@${encodeURIComponent(tiktokUsername)}`
            : "");
          const whatsappEnabled = contact.contactMethods?.includes("whatsapp") || contact.whatsappUrl;
          const phoneDigits = String(contact.phone || "").replace(/\D/g, "");
          const whatsappUrl = whatsappEnabled
            ? getExternalContactUrl(contact.whatsappUrl, phoneDigits ? `https://wa.me/${phoneDigits}` : "")
            : "";
          return (
            <div className="competition-detail-contact" key={`${contact.name || "kontak"}-${index}`}>
              {contact.name && contact.name !== item.organizer && <strong>{contact.name}</strong>}
              <div className="competition-detail-contact-methods">
                {contact.email && <a className="competition-detail-contact-method is-email" href={`mailto:${encodeURIComponent(contact.email)}`} aria-label={`Email ${contact.name || "penyelenggara"}`}><span className="competition-detail-contact-icon"><Mail size={18} aria-hidden="true" /></span><span className="competition-detail-contact-value"><span>Email</span><strong>{contact.email}</strong></span></a>}
                {instagramUrl && <a className="competition-detail-contact-method is-instagram" href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Buka Instagram"><span className="competition-detail-contact-icon"><Instagram size={18} aria-hidden="true" /></span><span className="competition-detail-contact-value"><span>Instagram</span><strong>{instagramUsername ? `@${instagramUsername}` : "Instagram"}</strong></span></a>}
                {tiktokUrl && <a className="competition-detail-contact-method is-tiktok" href={tiktokUrl} target="_blank" rel="noreferrer" aria-label="Buka TikTok"><span className="competition-detail-contact-icon"><Music2 size={18} aria-hidden="true" /></span><span className="competition-detail-contact-value"><span>TikTok</span><strong>{tiktokUsername ? `@${tiktokUsername}` : "TikTok"}</strong></span></a>}
                {whatsappUrl && <a className="competition-detail-contact-method is-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Buka WhatsApp"><span className="competition-detail-contact-icon"><MessageCircle size={18} aria-hidden="true" /></span><span className="competition-detail-contact-value"><span>WhatsApp</span><strong>WhatsApp</strong></span></a>}
              </div>
            </div>
          );
        })}</div>
        </CompetitionInfoCard>}
        <div className="competition-detail-links">
          {item.informationUrl && <a className="button button-outline" href={item.informationUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Info lomba</a>}
          {(item.rulebookLinks?.length
            ? item.rulebookLinks
            : (item.rulebookUrls?.length ? item.rulebookUrls : item.rulebookUrl ? [item.rulebookUrl] : []).map((url, index) => ({ name: `Panduan ${index + 1}`, url })))
            .map(({ name, url }, index) => <a className="button button-outline" href={url} target="_blank" rel="noreferrer" key={`${url}-${index}`}><FileText size={15} /> {name || `Panduan ${index + 1}`}</a>)}
        </div>
        {item.registrationUrl && <div className="competition-detail-after-links">
          <a className="button button-primary competition-detail-register" href={item.registrationUrl} target="_blank" rel="noreferrer" onClick={trackRegistration}>Daftar lomba <ExternalLink size={15} /></a>
        </div>}
        {trackingError && <p className="form-error" role="status">{trackingError}</p>}
        {onReport && !moderationActions && (reportNotice || reportOpen) && <section className="competition-report-section">
          {reportNotice && <p className="report-success" role="status">{reportNotice}</p>}
          {reportOpen && <form className="competition-report-form" onSubmit={submitReport}>
            <label>Alasan laporan
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} required>
                {reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
              </select>
            </label>
            <label>Jelaskan masalahnya
              <textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} minLength={10} maxLength={1000} rows={4} placeholder="Tuliskan detail agar moderator dapat memeriksanya." required />
            </label>
            {reportError && <p className="form-error" role="alert">{reportError}</p>}
            <div className="competition-report-actions">
              <button className="button button-outline" type="button" onClick={() => setReportOpen(false)} disabled={reportBusy}>Batal</button>
              <button className="button button-primary" type="submit" disabled={reportBusy}>{reportBusy ? "Mengirim..." : "Kirim laporan"}</button>
            </div>
            <small>Satu laporan aktif per akun untuk setiap lomba.</small>
          </form>}
        </section>}
        {moderationActions && item.status === "pending"
          ? <div className="competition-moderation-actions">
            <button className="button button-outline" type="button" disabled={moderationActions.busy} onClick={moderationActions.onReject}>Tolak</button>
            <button className="button button-primary" type="button" disabled={moderationActions.busy} onClick={moderationActions.onApprove}>Setujui & terbitkan</button>
          </div>
          : !item.registrationUrl && onClose && <button className="button button-primary button-wide" onClick={onClose}>Mengerti <Check size={16} /></button>}
        </div>
        {posterOpen && <PosterLightbox imageUrl={item.coverUrl} imageAlt={`Poster ${item.title}`} onClose={() => setPosterOpen(false)} />}
    </div>
  );
}

export function CompetitionModal({ item, onClose, ...detailsProps }) {
  if (!item) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card detail-modal competition-detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <CompetitionDetails item={item} onClose={onClose} {...detailsProps} />
      </section>
    </div>
  );
}

function makeSearchFilterOptions(defaultLabel, options) {
  return [
    { label: defaultLabel, value: "" },
    ...options.map((option) => typeof option === "string" ? { label: option, value: option } : option),
  ];
}

function SearchFilterDropdown({ label, Icon, value, options, onChange, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = `search-filter-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const selectedOption = options.find((option) => option.value === value) || options[0];
  const focusOption = (index) => optionRefs.current[index]?.focus();
  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };
  const openMenuAt = (index) => {
    setIsOpen(true);
    requestAnimationFrame(() => focusOption(index));
  };
  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const selectedIndex = options.findIndex((option) => option.value === value);
      const index = selectedIndex >= 0 ? selectedIndex : event.key === "ArrowDown" ? 0 : options.length - 1;
      openMenuAt(index);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      closeMenu();
    }
  };
  const handleOptionKeyDown = (event, index) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  };

  return (
    <div
      className={`filter-select filter-select-dropdown ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
    >
      <Icon size={15} aria-hidden="true" />
      <button
        className="filter-select-dropdown-trigger"
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${selectedOption.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen && (
        <div id={listboxId} className="competition-autocomplete-list search-filter-options" role="listbox" aria-label={`Pilihan ${label}`}>
          {options.map((option, index) => (
            <button
              key={option.value || "all"}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "is-selected" : ""}
              tabIndex={option.value === value ? 0 : -1}
              onMouseDown={(event) => event.preventDefault()}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchPanel({ filters, setFilters, onSearch, categoryOptions, competitions = [] }) {
  const [categorySuggestionsOpen, setCategorySuggestionsOpen] = useState(false);
  const categoryCounts = new Map();
  competitions.forEach((item) => {
    const key = String(item.category || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]/gu, "");
    if (key) categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
  });
  const normalizedCategoryInput = filters.category.trim().toLocaleLowerCase("id-ID");
  const categorySuggestions = categoryOptions
    .filter((option) => !normalizedCategoryInput || option.toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]/gu, "").includes(normalizedCategoryInput.replace(/[^\p{L}\p{N}]/gu, "")))
    .slice(0, 8);
  const updateCategory = (value) => {
    setFilters({ ...filters, category: value });
  };
  const update = (key) => (event) => {
    const value = event.target.value;
    setFilters({ ...filters, [key]: value });
  };
  const updateFilter = (key) => (value) => {
    setFilters({ ...filters, [key]: value });
  };
  const updateScope = (value) => {
    setFilters({ ...filters, scope: value, location: "" });
  };
  const search = () => onSearch();
  const CategoryIcon = filters.category ? getCompetitionTagIcon(filters.category) : Trophy;

  return (
    <div className="search-panel">
      <header className="search-panel-heading">
        <span className="search-panel-heading-icon" aria-hidden="true"><Search size={22} /></span>
        <div>
          <h2 id="search-heading">Cari Lomba</h2>
          <p>Gunakan kata kunci atau filter untuk menemukan lomba yang sesuai dengan minatmu.</p>
        </div>
      </header>
      <div className="search-main-row">
        <label className="search-keyword">
          <Search size={20} />
          <span className="sr-only">Kata kunci lomba</span>
          <input value={filters.keyword} onChange={update("keyword")} placeholder="Cari nama lomba, bidang, atau penyelenggara..." onKeyDown={(event) => event.key === "Enter" && search()} />
        </label>
        <button className="button button-primary search-button" onClick={search}><Search size={17} /> Cari lomba</button>
      </div>
      <div className="filter-row">
        <SearchFilterDropdown
          label="Target peserta"
          Icon={GraduationCap}
          value={filters.education}
          options={makeSearchFilterOptions("Semua target peserta", targetParticipantOptions)}
          onChange={updateFilter("education")}
        />
        <div className="filter-select category-filter-autocomplete" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setCategorySuggestionsOpen(false);
        }}>
          <CategoryIcon size={15} aria-hidden="true" />
          <label className="sr-only" htmlFor="search-category">Kategori lomba</label>
          <input id="search-category" role="combobox" aria-autocomplete="list" aria-controls="search-category-suggestions" aria-expanded={categorySuggestionsOpen && categorySuggestions.length > 0}
            value={filters.category} placeholder="Semua kategori" autoComplete="off"
            onFocus={() => setCategorySuggestionsOpen(true)}
            onChange={(event) => { updateCategory(event.target.value); setCategorySuggestionsOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && categorySuggestionsOpen && categorySuggestions.length) {
                event.preventDefault();
                updateCategory(categorySuggestions[0]);
                setCategorySuggestionsOpen(false);
              } else if (event.key === "Escape") setCategorySuggestionsOpen(false);
            }} />
          {filters.category && <button type="button" className="category-filter-clear" aria-label="Hapus kategori" onClick={() => updateCategory("")}>×</button>}
          {categorySuggestionsOpen && categorySuggestions.length > 0 && (
            <div id="search-category-suggestions" className="competition-autocomplete-list category-filter-suggestions" role="listbox" aria-label="Saran kategori lomba">
              {categorySuggestions.map((option) => {
                const key = option.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]/gu, "");
                const CategorySuggestionIcon = getCompetitionTagIcon(option);
                return <button type="button" role="option" aria-selected={filters.category.toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]/gu, "") === key} key={key} onMouseDown={(event) => event.preventDefault()} onClick={() => { updateCategory(option); setCategorySuggestionsOpen(false); }}>
                  <span className="competition-autocomplete-option-label"><CategorySuggestionIcon size={14} aria-hidden="true" />{option}</span>
                  <small>{(categoryCounts.get(key) || 0).toLocaleString("id-ID")} lomba</small>
                </button>;
              })}
            </div>
          )}
        </div>
        <SearchFilterDropdown
          label="Cakupan lomba"
          Icon={Globe2}
          value={filters.scope}
          options={makeSearchFilterOptions("Semua cakupan", [
            { label: "Daerah (data lama)", value: "Daerah" },
            ...scopeOptions,
          ])}
          onChange={updateScope}
        />
        <SearchFilterDropdown
          label="Jenis partisipasi"
          Icon={UsersRound}
          value={filters.participantType}
          options={makeSearchFilterOptions("Semua partisipasi", ["Individu", "Kelompok", "Campuran"])}
          onChange={updateFilter("participantType")}
        />
        <SearchFilterDropdown
          label="Mode pelaksanaan"
          Icon={Globe2}
          value={filters.mode}
          options={makeSearchFilterOptions("Semua mode", competitionModeOptions)}
          onChange={updateFilter("mode")}
        />
        <SearchFilterDropdown
          label="Jenis penyelenggara"
          Icon={Building2}
          value={filters.organizerType}
          options={makeSearchFilterOptions("Semua penyelenggara", organizerOptions)}
          onChange={updateFilter("organizerType")}
        />
        <SearchFilterDropdown
          className="location-filter"
          label="Provinsi"
          Icon={MapPin}
          value={filters.location}
          options={makeSearchFilterOptions("Pilih provinsi", provinceOptions)}
          onChange={updateFilter("location")}
        />
      </div>
    </div>
  );
}

export function AccountPrompt({ onClose, navigate, encourageShare, required }) {
  return (
    <div className={`modal-backdrop${encourageShare ? " modal-backdrop-access" : ""}`} onMouseDown={(event) => !required && event.target === event.currentTarget && onClose()}>
      <section className={`modal-card prompt-modal${encourageShare ? " prompt-modal-access" : ""}`} role="dialog" aria-modal="true" aria-labelledby="prompt-title">
        {!required && <button className="modal-close" onClick={onClose} aria-label="Tutup"><X size={19} /></button>}
        <span className={`prompt-icon${encourageShare ? " prompt-icon-access" : ""}`}>
          {encourageShare ? <><IdCard size={56} strokeWidth={1.7} /><span className="prompt-icon-plus"><Plus size={19} strokeWidth={3} /></span></> : <Sparkles size={23} />}
        </span>
        <span className="eyebrow">{required || encourageShare ? "AKSES ANGGOTA" : "LANJUTKAN PERJALANANMU"}</span>
        <h2 id="prompt-title">
          {required
            ? "Daftar untuk mencari lomba"
            : encourageShare
              ? <>Akses lebih luas<br />di <span>LombaLink</span></>
              : "Pencarian gratis sudah habis"}
        </h2>
        <p>{required ? "Buat akun gratis untuk menggunakan pencarian dan filter lomba." : encourageShare ? "Buat akun gratis untuk menikmati seluruh fitur dan informasi di LombaLink." : "Buat akun gratis untuk mencari lomba tanpa batas dan menyimpan kesempatan favoritmu."}</p>
        <button className={`button button-primary button-wide${encourageShare ? " prompt-access-cta" : ""}`} onClick={() => navigate("/register")}>
          {encourageShare && <UserRoundPlus size={22} />}
          {required ? "Daftar gratis" : encourageShare ? "Buat Akun Gratis" : "Buat akun gratis"}
          <ArrowRight size={21} />
        </button>
        <button className="prompt-login" onClick={() => navigate("/login")}>Sudah punya akun? <strong>Masuk</strong></button>
      </section>
    </div>
  );
}
