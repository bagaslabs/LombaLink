import React, { useEffect, useState } from "react";
import { fetchPlaces, sameName } from "./locationData.js";

export default function LocationSelects({
  province,
  city,
  onProvinceChange,
  onCityChange,
  onValidityChange,
  showCity = true,
  cityRequired = true,
  className = "",
}) {
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
      <label>
        <span className="location-select-label">Provinsi <span className="required-mark">*</span></span>
        {manualLocation
          ? <input autoComplete="address-level1" value={province} onChange={(event) => onProvinceChange(event.target.value)} maxLength={120} required />
          : <select
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
      </label>
      {showCity && <label>
        <span className="location-select-label">Kota/Kabupaten {cityRequired && <span className="required-mark">*</span>}</span>
        {manualLocation
          ? <input autoComplete="address-level2" value={city} onChange={(event) => onCityChange(event.target.value)} maxLength={120} required={cityRequired} />
          : <select
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
      </label>}
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
