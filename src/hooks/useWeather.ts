import { useEffect, useState } from "react";
import { fetchWeatherFor, WeatherInfo } from "@/lib/weather";

/**
 * Returns weather info (emoji + temp) for an event location/date/time.
 * Returns null while loading or when unavailable (no location, out of range, etc.)
 */
export const useWeather = (
  location: string | null | undefined,
  date: string,
  startTime?: string | null,
) => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!location) {
      setWeather(null);
      return;
    }
    fetchWeatherFor(location, date, startTime).then((info) => {
      if (!cancelled) setWeather(info);
    });
    return () => {
      cancelled = true;
    };
  }, [location, date, startTime]);

  return weather;
};
