import { useEffect, useMemo, useState } from "react";
import { City, Country } from "country-state-city";
import Label from "./Label";
import Select from "./Select";
import Input from "./input/InputField";
import { useTranslation } from "../../i18n/useTranslation";
import { TIP_GEO_REGIONS } from "../../features/events/tipRegions";

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
  const { t } = useTranslation();
  const [countryCode, setCountryCode] = useState("");

  const countries = useMemo(
    () => Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name })),
    [],
  );

  const regionOptions = useMemo(
    () => [
      { value: "", label: "—" },
      ...TIP_GEO_REGIONS.map((name) => ({ value: name, label: name })),
      ...(region && !TIP_GEO_REGIONS.includes(region as (typeof TIP_GEO_REGIONS)[number])
        ? [{ value: region, label: region }]
        : []),
    ],
    [region],
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

  const cities = useMemo(() => {
    if (!countryCode) return [];
    const list = City.getCitiesOfCountry(countryCode) ?? [];
    const names = [...new Set(list.map((c) => c.name))].sort((a, b) => a.localeCompare(b, "fr"));
    return names.map((name) => ({ value: name, label: name }));
  }, [countryCode]);

  const cityOptions = useMemo(() => {
    const base = [{ value: "", label: "—" }, ...cities];
    if (city && !cities.some((c) => c.value === city)) {
      return [{ value: "", label: "—" }, { value: city, label: city }, ...cities];
    }
    return base;
  }, [cities, city]);

  const useCityInput = Boolean(countryCode && cities.length === 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <Label>{t("events.country")}</Label>
        <Select
          options={[{ value: "", label: "—" }, ...countries]}
          value={countryCode}
          onChange={(iso) => {
            const c = Country.getCountryByCode(iso);
            setCountryCode(iso);
            onChange({ country: c?.name ?? "", region, city: "" });
          }}
          disabled={disabled}
        />
      </div>
      <div>
        <Label>{t("events.region")}</Label>
        <Select
          options={regionOptions}
          value={region}
          onChange={(value) => onChange({ country, region: value, city })}
          disabled={disabled}
        />
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          {t("events.regionHint")}
        </p>
      </div>
      <div>
        <Label>{t("events.city")}</Label>
        {useCityInput ? (
          <Input
            value={city}
            placeholder={t("events.cityPlaceholder")}
            onChange={(e) => onChange({ country, region, city: e.target.value })}
            disabled={disabled || !countryCode}
          />
        ) : (
          <Select
            options={cityOptions}
            value={city}
            onChange={(name) => onChange({ country, region, city: name })}
            disabled={disabled || !countryCode}
          />
        )}
      </div>
    </div>
  );
}
