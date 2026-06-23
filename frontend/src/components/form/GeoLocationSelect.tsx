import { useEffect, useMemo, useState } from "react";
import { City, Country, State } from "country-state-city";
import Label from "./Label";
import Select from "./Select";

interface GeoLocationSelectProps {
  country: string;
  region: string;
  city: string;
  onChange: (values: { country: string; region: string; city: string }) => void;
  disabled?: boolean;
}

export default function GeoLocationSelect({
  country,
  region,
  city,
  onChange,
  disabled = false,
}: GeoLocationSelectProps) {
  const [countryCode, setCountryCode] = useState("");
  const [regionCode, setRegionCode] = useState("");

  const countries = useMemo(
    () => Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })),
    [],
  );

  useEffect(() => {
    if (!country) {
      setCountryCode("");
      return;
    }
    const match = Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === country.toLowerCase() || c.isoCode === country,
    );
    setCountryCode(match?.isoCode ?? "");
  }, [country]);

  useEffect(() => {
    if (!countryCode || !region) {
      setRegionCode("");
      return;
    }
    const states = State.getStatesOfCountry(countryCode);
    const match = states.find(
      (s) => s.name.toLowerCase() === region.toLowerCase() || s.isoCode === region,
    );
    setRegionCode(match?.isoCode ?? "");
  }, [countryCode, region]);

  const regions = useMemo(() => {
    if (!countryCode) return [];
    return State.getStatesOfCountry(countryCode).map((s) => ({
      value: s.isoCode,
      label: s.name,
    }));
  }, [countryCode]);

  const cities = useMemo(() => {
    if (!countryCode || !regionCode) return [];
    return City.getCitiesOfState(countryCode, regionCode).map((c) => ({
      value: c.name,
      label: c.name,
    }));
  }, [countryCode, regionCode]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <Label>Pays</Label>
        <Select
          options={[{ value: "", label: "—" }, ...countries]}
          value={countryCode}
          onChange={(iso) => {
            const c = Country.getCountryByCode(iso);
            setCountryCode(iso);
            setRegionCode("");
            onChange({ country: c?.name ?? "", region: "", city: "" });
          }}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Région</Label>
        <Select
          options={[{ value: "", label: "—" }, ...regions]}
          value={regionCode}
          onChange={(iso) => {
            const s = State.getStatesOfCountry(countryCode).find((st) => st.isoCode === iso);
            setRegionCode(iso);
            onChange({ country, region: s?.name ?? "", city: "" });
          }}
          disabled={disabled || !countryCode}
        />
      </div>
      <div>
        <Label>Ville</Label>
        <Select
          options={[{ value: "", label: "—" }, ...cities]}
          value={city}
          onChange={(name) => onChange({ country, region, city: name })}
          disabled={disabled || !regionCode}
        />
      </div>
    </div>
  );
}
