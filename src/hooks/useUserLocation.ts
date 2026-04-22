import { useEffect, useState } from "react";

export interface UserCoords {
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = "user_geo_coords_v1";

let cached: UserCoords | null = null;
let pending: Promise<UserCoords | null> | null = null;

const loadCachedCoords = (): UserCoords | null => {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
        cached = parsed;
        return cached;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
};

const requestCoords = (): Promise<UserCoords | null> => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);

  pending = new Promise<UserCoords | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        cached = coords;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
        } catch {
          /* ignore */
        }
        resolve(coords);
      },
      () => resolve(null),
      { timeout: 8000, maximumAge: 60 * 60 * 1000 },
    );
  });
  return pending;
};

/** Returns the user's coarse coordinates, requesting permission once. */
export const useUserLocation = () => {
  const [coords, setCoords] = useState<UserCoords | null>(loadCachedCoords());

  useEffect(() => {
    if (coords) return;
    let cancelled = false;
    requestCoords().then((c) => {
      if (!cancelled && c) setCoords(c);
    });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  return coords;
};
