// Open-Meteo weather utilities — free, no API key required.
// Docs: https://open-meteo.com/

export interface WeatherInfo {
  emoji: string;
  label: string;
  tempC: number | null;
  code: number;
}

// WMO weather interpretation codes → emoji + label
// https://open-meteo.com/en/docs#weathervariables
export const wmoToWeather = (code: number, isDay = true): { emoji: string; label: string } => {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code === 1) return { emoji: isDay ? "🌤️" : "🌙", label: "Mostly clear" };
  if (code === 2) return { emoji: "⛅", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Fog" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Rain" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "Snow" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "Rain showers" };
  if (code >= 85 && code <= 86) return { emoji: "🌨️", label: "Snow showers" };
  if (code === 95) return { emoji: "⛈️", label: "Thunderstorm" };
  if (code === 96 || code === 99) return { emoji: "⛈️", label: "Thunderstorm w/ hail" };
  return { emoji: "🌡️", label: "Unknown" };
};

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
}

const geoCache = new Map<string, GeoResult | null>();

export const geocodeLocation = async (location: string): Promise<GeoResult | null> => {
  const key = location.trim().toLowerCase();
  if (!key) return null;
  if (geoCache.has(key)) return geoCache.get(key) ?? null;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      geoCache.set(key, null);
      return null;
    }
    const json = await res.json();
    const r = json?.results?.[0];
    if (!r) {
      geoCache.set(key, null);
      return null;
    }
    const result = { latitude: r.latitude, longitude: r.longitude, name: r.name };
    geoCache.set(key, result);
    return result;
  } catch {
    geoCache.set(key, null);
    return null;
  }
};

// Open-Meteo forecast covers ~16 days. Older / further dates return null.
const isInForecastRange = (dateStr: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 15;
};

const weatherCache = new Map<string, WeatherInfo | null>();

/**
 * Fetch weather forecast for a given location string + date (YYYY-MM-DD) + optional hour.
 * Returns null if location can't be geocoded or date is outside forecast range.
 */
export const fetchWeatherFor = async (
  location: string | null | undefined,
  date: string,
  startTime?: string | null,
): Promise<WeatherInfo | null> => {
  if (!location || !isInForecastRange(date)) return null;
  const cacheKey = `${location.toLowerCase()}|${date}|${startTime || ""}`;
  if (weatherCache.has(cacheKey)) return weatherCache.get(cacheKey) ?? null;

  const geo = await geocodeLocation(location);
  if (!geo) {
    weatherCache.set(cacheKey, null);
    return null;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&hourly=weathercode,temperature_2m,is_day&start_date=${date}&end_date=${date}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) {
      weatherCache.set(cacheKey, null);
      return null;
    }
    const json = await res.json();
    const times: string[] = json?.hourly?.time || [];
    const codes: number[] = json?.hourly?.weathercode || [];
    const temps: number[] = json?.hourly?.temperature_2m || [];
    const isDayArr: number[] = json?.hourly?.is_day || [];
    if (times.length === 0) {
      weatherCache.set(cacheKey, null);
      return null;
    }

    // Pick hour closest to event start (or noon as fallback)
    let targetHour = 12;
    if (startTime) {
      const cleaned = startTime.trim().toLowerCase();
      const isPM = cleaned.includes("pm");
      const isAM = cleaned.includes("am");
      const numeric = cleaned.replace(/[ap]m/i, "").trim();
      let h = parseInt(numeric.split(":")[0]) || 12;
      if (isPM && h !== 12) h += 12;
      if (isAM && h === 12) h = 0;
      if (!isPM && !isAM && h < 6) h += 12;
      targetHour = Math.min(23, Math.max(0, h));
    }

    let bestIdx = 0;
    let bestDiff = Infinity;
    times.forEach((t, i) => {
      const hour = parseInt(t.split("T")[1]?.split(":")[0] ?? "0");
      const diff = Math.abs(hour - targetHour);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    });

    const code = codes[bestIdx];
    const { emoji, label } = wmoToWeather(code, isDayArr[bestIdx] !== 0);
    const info: WeatherInfo = {
      emoji,
      label,
      tempC: typeof temps[bestIdx] === "number" ? Math.round(temps[bestIdx]) : null,
      code,
    };
    weatherCache.set(cacheKey, info);
    return info;
  } catch {
    weatherCache.set(cacheKey, null);
    return null;
  }
};
