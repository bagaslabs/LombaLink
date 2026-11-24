import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { CompetitionCard, SearchPanel } from "../components.jsx";

const emptyFilters = { keyword: "", education: "", category: "", scope: "", organizerType: "", location: "", participantType: "", mode: "" };
const resultsPerPage = 4;
const openParticipantTargets = new Set(["umum", "semua jenjang", "semua tingkat", "terbuka untuk umum"]);

function matchesEducationFilter(item, education) {
  if (!education) return true;
  const selected = education.trim().toLocaleLowerCase("id-ID");
  const targets = (item.targetParticipants || []).map((target) => String(target).trim().toLocaleLowerCase("id-ID"));
  const legacyEducation = String(item.education || "").trim().toLocaleLowerCase("id-ID");
  if (targets.includes(selected) || legacyEducation === selected) return true;
  return targets.some((target) => openParticipantTargets.has(target)) || openParticipantTargets.has(legacyEducation);
}

export default function SearchPage({
  navigate,
  competitions,
  competitionsLoading,
  competitionsError,
  categoryOptions,
  renderLayout,
}) {
  const [filters, setFilters] = useState(emptyFilters);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);

  const matchingCompetitions = useMemo(() => competitions.filter((item) => {
    const searchText = `${item.title} ${item.tagline} ${item.organizer} ${item.category} ${item.competitionCategory || ""} ${item.competitionType || ""} ${item.location} ${(item.targetParticipants || []).join(" ")} ${(item.keywords || []).join(" ")}`.toLowerCase();
    return (!filters.keyword || searchText.includes(filters.keyword.toLowerCase().trim()))
      && matchesEducationFilter(item, filters.education)
      && (!filters.category || String(item.category || "").trim().toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]/gu, "").includes(filters.category.trim().toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}]/gu, "")))
      && (!filters.scope || item.scope === filters.scope)
      && (!filters.organizerType || item.organizerType === filters.organizerType)
      && (!filters.location || String(item.location || "").toLowerCase().includes(filters.location.toLowerCase().trim()))
      && (!filters.participantType
        || (filters.participantType === "Individu" && (item.participantType === "Individu" || item.participantType === "Individu dan Tim"))
        || (filters.participantType === "Kelompok" && (item.participantType === "Tim" || item.participantType === "Individu dan Tim"))
        || (filters.participantType === "Campuran" && item.participantType === "Individu dan Tim"))
      && (!filters.mode || item.mode === filters.mode);
  }), [competitions, filters]);
  const pageCount = Math.ceil(matchingCompetitions.length / resultsPerPage);
  const visibleCompetitions = matchingCompetitions.slice(
    (page - 1) * resultsPerPage,
    page * resultsPerPage,
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, Math.max(pageCount, 1)));
  }, [pageCount]);

  const search = () => {
    setHasSearched(true);
  };

  const goToPage = (nextPage) => {
    setPage(nextPage);
    document.getElementById("cari-hasil")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  let results;
  if (competitionsLoading) {
    results = <div className="empty-results" role="status"><span><Search size={23} /></span><h3>Memuat data lomba</h3><p>Mengambil informasi yang tersedia dari database.</p></div>;
  } else if (competitionsError) {
    results = <div className="empty-results" role="alert"><span><Search size={23} /></span><h3>Data lomba tidak dapat dimuat</h3><p>{competitionsError}</p></div>;
  } else if (matchingCompetitions.length) {
    results = <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{visibleCompetitions.map((item) => <CompetitionCard key={item.id} item={item} onDetails={() => navigate(`/kompetisi/${encodeURIComponent(item.id)}`)} />)}</div>;
  } else {
    results = <div className="empty-results"><span><Search size={23} /></span><h3>Belum ada lomba yang cocok</h3><p>Coba ubah kata kunci atau filter pencarianmu.</p><button className="button button-outline" onClick={() => setFilters(emptyFilters)}>Hapus semua filter</button></div>;
  }

  const searchControls = (
    <div className="landing-search-block content-width" id="cari" aria-labelledby="search-heading">
      <SearchPanel
        filters={filters}
        setFilters={setFilters}
        onSearch={search}
        categoryOptions={categoryOptions}
        competitions={competitions}
      />
    </div>
  );
  const searchResults = (
    <section className="discovery-page content-width landing-search-results" id="cari-hasil" aria-labelledby="search-results-heading">
      <header className="search-results-heading">
        <span className="eyebrow">DAFTAR PELUANG</span>
        <h2 id="search-results-heading">
          Peluang untuk <span className="search-results-highlight">Dijelajahi
            <svg className="search-results-spark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 13 1.5 11.5M13 6 14 1.5M20 11l2.5-2.5" />
            </svg>
          </span>
        </h2>
      </header>
      <section className="discovery-results" aria-live="polite">
        {!competitionsLoading && !competitionsError && <p className="discovery-result-count">{hasSearched ? `${matchingCompetitions.length} lomba ditemukan.` : `${competitions.length} lomba tersedia.`}</p>}
        {results}
        {!competitionsLoading && !competitionsError && pageCount > 1 && (
          <nav className="search-pagination" aria-label="Halaman hasil lomba">
            <span>Menampilkan {(page - 1) * resultsPerPage + 1}–{Math.min(page * resultsPerPage, matchingCompetitions.length)} dari {matchingCompetitions.length} lomba</span>
            <div className="search-pagination-controls">
              <button
                className="button button-outline button-small"
                type="button"
                aria-label="Hasil sebelumnya"
                disabled={page === 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeft size={16} /> Sebelumnya
              </button>
              <span className="search-pagination-current">{page} / {pageCount}</span>
              <button
                className="button button-outline button-small"
                type="button"
                aria-label="Hasil berikutnya"
                disabled={page === pageCount}
                onClick={() => goToPage(page + 1)}
              >
                Berikutnya <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}
      </section>
    </section>
  );

  if (typeof renderLayout === "function") return renderLayout({ searchControls, searchResults });
  return <main className="search-page-standalone">{searchControls}{searchResults}</main>;
}
