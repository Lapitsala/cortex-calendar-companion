import { forwardRef, useEffect, useState } from "react";
import { fetchWeatherFor, fetchWeatherForCoords, WeatherInfo } from "@/lib/weather";
import { useUserLocation } from "@/hooks/useUserLocation";

interface WeatherBadgeProps {
  location?: string | null;
  date: string;
  startTime?: string | null;
  /** Show temperature next to emoji */
  showTemp?: boolean;
  /** Show short label (e.g. "Rain") next to emoji */
  showLabel?: boolean;
  className?: string;
}

/**
 * Inline weather indicator (emoji + optional temp) for an event.
 * Falls back to the user's browser geolocation when the event has no location.
 * Renders a placeholder dot when weather is genuinely unavailable
 * (e.g. event is more than 16 days out — Open-Meteo's forecast horizon).
 */
const WeatherBadge = forwardRef<HTMLSpanElement, WeatherBadgeProps>(
  ({ location, date, startTime, showTemp = false, showLabel = false, className = "" }, ref) => {
    const userCoords = useUserLocation();
    const [weather, setWeather] = useState<WeatherInfo | null>(null);

    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        let info: WeatherInfo | null = null;
        if (location && location.trim()) {
          info = await fetchWeatherFor(location, date, startTime);
        }
        // Fallback: use browser-provided coords when event has no location or geocoding failed.
        if (!info && userCoords) {
          info = await fetchWeatherForCoords(userCoords.latitude, userCoords.longitude, date, startTime);
        }
        if (!cancelled) setWeather(info);
      };
      load();
      return () => {
        cancelled = true;
      };
    }, [location, date, startTime, userCoords]);

    if (!weather) return null;

    const title = `${weather.label}${weather.tempC !== null ? ` · ${weather.tempC}°C` : ""}${
      location ? ` · ${location}` : " · your area"
    }`;

    return (
      <span
        ref={ref}
        title={title}
        aria-label={title}
        className={`inline-flex items-center gap-0.5 ${className}`}
      >
        <span className="leading-none">{weather.emoji}</span>
        {showTemp && weather.tempC !== null && (
          <span className="font-medium">{weather.tempC}°</span>
        )}
        {showLabel && <span>{weather.label}</span>}
      </span>
    );
  },
);
WeatherBadge.displayName = "WeatherBadge";

export default WeatherBadge;
