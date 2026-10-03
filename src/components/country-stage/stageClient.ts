/**
 * Everything the stage needs that is too heavy for the page's first payload:
 * three.js, the engine, and the country coordinates (which live beside ~125KB
 * of coastline in `data/worldMap.ts`). The component imports this module on
 * mount, so none of it is paid for until the stage is actually on screen.
 */

import { countriesData, getCountrySlug, type Country } from "@/data/countries";
import { COUNTRY_LATLNG } from "@/data/worldMap";
import { countryCardImage, countryFallbackHue } from "@/lib/countryImagery";
import { formatGovernmentFee, isGovernmentFeeFree } from "@/lib/countryVisa";

import { pickRendition } from "./cardTexture";
import type { StageCountry } from "./stageEngine";

export { StageEngine } from "./stageEngine";

export function toStageCountries(countries: readonly Country[]): StageCountry[] {
  return countries.map((country) => {
    const slug = getCountrySlug(country.name);
    const photo = countryCardImage(slug);
    const latlng = COUNTRY_LATLNG[country.code];
    return {
      code: country.code,
      lat: latlng ? latlng[0] : null,
      lng: latlng ? latlng[1] : null,
      face: {
        name: country.name,
        code: country.code,
        visaType: country.visaType,
        validity: country.validity,
        feeLabel: isGovernmentFeeFree(country.fees) ? "Cost" : "Fees",
        feeValue: formatGovernmentFee(country.fees),
        hue: countryFallbackHue(country.code),
        photo: photo ? pickRendition(photo.src, photo.srcSet) : undefined,
      },
    };
  });
}

/** Every destination's dot on the planet, regardless of the current filter. */
export function markerPoints(): { lat: number; lng: number }[] {
  return countriesData
    .map((c) => COUNTRY_LATLNG[c.code])
    .filter((v): v is readonly [number, number] => Boolean(v))
    .map(([lat, lng]) => ({ lat, lng }));
}
