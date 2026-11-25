import React, { useEffect, useId, useRef, useState } from "react";
import { fetchPlaces, sameName } from "./locationData.js";

function TypeaheadPlaceSelect({ items, value, placeholder, disabled, labelId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();
  const selectedItem = items.find((item) => item.id === value);
  const visibleItems = query
    ? items.filter((item) => item.name.toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID")))
    : items;
  const focusOption = (index) => optionRefs.current[index]?.focus();
  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      const selectedIndex = visibleItems.findIndex((item) => item.id === value);
      const index = selectedIndex >= 0 ? selectedIndex : event.key === "ArrowDown" ? 0 : visibleItems.length - 1;
      requestAnimationFrame(() => focusOption(index));
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      setQuery("");
    } else if (event.key === "Backspace" && query) {
      event.preventDefault();
      setQuery((current) => current.slice(0, -1));
      setIsOpen(true);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      setQuery((current) => `${current}${event.key}`);
      setIsOpen(true);
    }
  };

  return (
    <div
      className="location-typeahead"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setQuery("");
        }
      }}
    >
      <button
        ref={triggerRef}
        className="location-typeahead-trigger"
        type="button"
        disabled={disabled}
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => {
          setQuery("");
          setIsOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedItem?.name || placeholder}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      {isOpen && <div id={listboxId} className="competition-autocomplete-list location-typeahead-list" role="listbox" aria-labelledby={labelId}>
        {visibleItems.length ? visibleItems.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { optionRefs.current[index] = element; }}
            type="button"
            role="option"
            aria-selected={item.id === value}
            className={item.id === value ? "is-selected" : ""}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); focusOption(Math.min(index + 1, visibleItems.length - 1)); }
              else if (event.key === "ArrowUp") { event.preventDefault(); focusOption(Math.max(index - 1, 0)); }
              else if (event.key === "Home") { event.preventDefault(); focusOption(0); }
              else if (event.key === "End") { event.preventDefault(); focusOption(visibleItems.length - 1); }
              else if (event.key === "Escape") { event.preventDefault(); setIsOpen(false); setQuery(""); triggerRef.current?.focus(); }
            }}
            onClick={() => {
              onSelect(item);
              setIsOpen(false);
              setQuery("");
              triggerRef.current?.focus();
            }}
          >{item.name}</button>
        )) : <div className="location-typeahead-empty" role="status">Tidak ada daerah yang cocok.</div>}
      </div>}
    </div>
  );
}

export default function LocationSelects({
  province,
  city,
  onProvinceChange,
  onCityChange,
  onValidityChange,
  showCity = true,
  cityRequired = true,
  className = "",
  searchable = false,
}) {
  const idPrefix = useId();
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [manualLocation, setManualLocation] = useState(false);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [provincesError, setProvincesError] = useState("");
  const [regenciesError, setRegenciesError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setProvincesLoading(true);
    setProvincesError("");

    fetchPlaces("provinces.json", controller.signal)
      .then((data) => {
        setProvinces(data);
        if (province.trim() && !data.some((item) => sameName(item.name, province))) {
          setManualLocation(true);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setProvincesError(error instanceof Error ? error.message : "Daftar provinsi gagal dimuat.");
          setManualLocation(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProvincesLoading(false);
      });

    return () => controller.abort();
  }, [retryKey]);

  const selectedProvince = provinces.find((item) => sameName(item.name, province));
  const selectedRegency = regencies.find((item) => sameName(item.name, city));

  useEffect(() => {
    if (!showCity || manualLocation || !selectedProvince) {
      setRegencies([]);
      setRegenciesError("");
      setRegenciesLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setRegencies([]);
    setRegenciesLoading(true);
    setRegenciesError("");

    fetchPlaces(`regencies/${encodeURIComponent(selectedProvince.id)}.json`, controller.signal)
      .then(setRegencies)
      .catch((error) => {
        if (!controller.signal.aborted) {
          setRegenciesError(error instanceof Error ? error.message : "Daftar kota/kabupaten gagal dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRegenciesLoading(false);
      });

    return () => controller.abort();
  }, [manualLocation, retryKey, selectedProvince?.id, showCity]);

  const error = provincesError || (showCity && !manualLocation && regenciesError);
  const isValid = manualLocation
    ? Boolean(province.trim() && (!showCity || !cityRequired || city.trim()))
    : Boolean(selectedProvince && (!showCity || !cityRequired || (selectedRegency && !regenciesLoading && !error)) && !provincesLoading && !provincesError);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  const retry = () => setRetryKey((current) => current + 1);

  return (
    <div className={`location-selects ${className}`.trim()}>
      <div className="location-select-field">
        <span id={`${idPrefix}-province-label`} className="location-select-label">Provinsi <span className="required-mark">*</span></span>
        {manualLocation
          ? <input aria-labelledby={`${idPrefix}-province-label`} autoComplete="address-level1" value={province} onChange={(event) => onProvinceChange(event.target.value)} maxLength={120} required />
          : searchable
            ? <TypeaheadPlaceSelect
              items={provinces}
              value={selectedProvince?.id || ""}
              placeholder={provincesLoading ? "Memuat provinsi..." : "Pilih provinsi"}
              disabled={provincesLoading || Boolean(provincesError)}
              labelId={`${idPrefix}-province-label`}
              onSelect={(nextProvince) => {
                onProvinceChange(nextProvince.name);
                onCityChange("");
                onValidityChange?.(false);
              }}
            />
            : <select
            aria-labelledby={`${idPrefix}-province-label`}
            autoComplete="address-level1"
            value={selectedProvince?.id || ""}
            onChange={(event) => {
              const nextProvince = provinces.find((item) => item.id === event.target.value);
              onProvinceChange(nextProvince?.name || "");
              onCityChange("");
              onValidityChange?.(false);
            }}
            disabled={provincesLoading || Boolean(provincesError)}
            required
          >
            <option value="">{provincesLoading ? "Memuat provinsi..." : "Pilih provinsi"}</option>
            {provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>}
      </div>
      {showCity && <div className="location-select-field">
        <span id={`${idPrefix}-city-label`} className="location-select-label">Kota/Kabupaten {cityRequired && <span className="required-mark">*</span>}</span>
        {manualLocation
          ? <input aria-labelledby={`${idPrefix}-city-label`} autoComplete="address-level2" value={city} onChange={(event) => onCityChange(event.target.value)} maxLength={120} required={cityRequired} />
          : searchable
            ? <TypeaheadPlaceSelect
              items={regencies}
              value={selectedRegency?.id || ""}
              placeholder={regenciesLoading ? "Memuat kota/kabupaten..." : "Pilih kota/kabupaten"}
              disabled={!selectedProvince || regenciesLoading || Boolean(error)}
              labelId={`${idPrefix}-city-label`}
              onSelect={(nextRegency) => onCityChange(nextRegency.name)}
            />
            : <select
            aria-labelledby={`${idPrefix}-city-label`}
            autoComplete="address-level2"
            value={selectedRegency?.id || ""}
            onChange={(event) => {
              const nextRegency = regencies.find((item) => item.id === event.target.value);
              onCityChange(nextRegency?.name || "");
            }}
            disabled={!selectedProvince || regenciesLoading || Boolean(error)}
            required={cityRequired}
          >
            <option value="">{regenciesLoading ? "Memuat kota/kabupaten..." : "Pilih kota/kabupaten"}</option>
            {regencies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>}
      </div>}
      <button
        className="location-select-mode-button"
        type="button"
        onClick={() => {
          setManualLocation((current) => !current);
          onValidityChange?.(false);
        }}
      >
        {manualLocation ? "Pilih lokasi dari daftar" : "Provinsi/kabupaten tidak ditemukan? Isi manual"}
      </button>
      {error && <p className="location-select-error" role="alert">{error}<button type="button" onClick={retry}>Coba lagi</button></p>}
    </div>
  );
}
