import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CompetitionCard, SearchPanel } from "../components.jsx";

const emptyFilters = { keyword: "", education: "", category: "", scope: "", organizerType: "", location: "" };

export default function SearchPage({
  account,
  navigate,
  onRequireAccount,
  competitions,
  competitionsLoading,
  competitionsError,
  categoryOptions,
}) {
  const [filters, setFilters] = useState(emptyFilters);
  const [hasSearched, setHasSearched] = useState(false);

  const matchingCompetitions = useMemo(() => competitions.filter((item) => {
    const searchText = `${item.title} ${item.tagline} ${item.organizer} ${item.category} ${item.competitionCategory || ""} ${item.competitionType || ""} ${item.location} ${(item.targetParticipants || []).join(" ")} ${(item.keywords || []).join(" ")}`.toLowerCase();
    return (!filters.keyword || searchText.includes(filters.keyword.toLowerCase().trim()))
      && (!filters.education || (item.targetParticipants || []).includes(filters.education) || item.education === filters.education)
      && (!filters.category || item.category === filters.category)
      && (!filters.scope || item.scope === filters.scope)
      && (!filters.organizerType || item.organizerType === filters.organizerType)
      && (!filters.location || String(item.location || "").toLowerCase().includes(filters.location.toLowerCase().trim()));
  }), [competitions, filters]);

  const search = () => {
    if (!account) {
      onRequireAccount(false, true);
      return;
    }
    setHasSearched(true);
  };

  let results;
  if (competitionsLoading) {
    results = <div className="empty-results" role="status"><span><Search size={23} /></span><h3>Memuat data lomba</h3><p>Mengambil informasi yang tersedia dari database.</p></div>;
  } else if (competitionsError) {
    results = <div className="empty-results" role="alert"><span><Search size={23} /></span><h3>Data lomba tidak dapat dimuat</h3><p>{competitionsError}</p></div>;
  } else if (matchingCompetitions.length) {
    results = <div className="competition-grid grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">{matchingCompetitions.map((item) => <CompetitionCard key={item.id} item={item} onDetails={() => navigate(`/kompetisi/${encodeURIComponent(item.id)}`)} />)}</div>;
  } else {
    results = <div className="empty-results"><span><Search size={23} /></span><h3>Belum ada lomba yang cocok</h3><p>Coba ubah kata kunci atau filter pencarianmu.</p><button className="button button-outline" onClick={() => setFilters(emptyFilters)}>Hapus semua filter</button></div>;
  }

  return (
    <section className="discovery-page content-width" id="cari" aria-labelledby="search-heading">
      <header className="discovery-heading">
        <span className="eyebrow">JELAJAHI PELUANG</span>
        <h2 id="search-heading">Cari lomba</h2>
        <p>Gunakan kata kunci dan filter untuk menemukan kesempatan yang sesuai.</p>
      </header>
      <SearchPanel
        filters={filters}
        setFilters={setFilters}
        onSearch={search}
        onRequireAccount={onRequireAccount}
        isLoggedIn={Boolean(account)}
        categoryOptions={categoryOptions}
      />
      <section className="discovery-results" aria-live="polite">
        {!competitionsLoading && !competitionsError && <p className="discovery-result-count">{hasSearched ? `${matchingCompetitions.length} lomba ditemukan.` : `${competitions.length} lomba tersedia.`}</p>}
        {results}
      </section>
    </section>
  );
}
