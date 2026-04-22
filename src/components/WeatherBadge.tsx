import { useWeather } from "@/hooks/useWeather";

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
 * Renders nothing when weather is unavailable to keep layouts clean.
 */
const WeatherBadge = ({
  location,
  date,
  startTime,
  showTemp = false,
  showLabel = false,
  className = "",
}: WeatherBadgeProps) => {
  const weather = useWeather(location, date, startTime);
  if (!weather) return null;

  const title = `${weather.label}${weather.tempC !== null ? ` · ${weather.tempC}°C` : ""}${
    location ? ` · ${location}` : ""
  }`;

  return (
    <span
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
};

export default WeatherBadge;
