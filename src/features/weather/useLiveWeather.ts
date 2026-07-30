import { useCallback, useEffect, useState } from "react";

export type LocationMode = "automatic" | "manual";

export type LiveWeather = {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  observedAt: string;
  latitude: number;
  longitude: number;
};

const STORAGE_KEY = "greencrop-weather-location";
const REFRESH_MS = 10 * 60 * 1000;

const readSavedLocation = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      mode: saved.mode === "manual" ? "manual" as const : "automatic" as const,
      latitude: Number.isFinite(Number(saved.latitude)) ? String(saved.latitude) : "13.7563",
      longitude: Number.isFinite(Number(saved.longitude)) ? String(saved.longitude) : "100.5018",
    };
  } catch {
    return { mode: "automatic" as const, latitude: "13.7563", longitude: "100.5018" };
  }
};

export function useLiveWeather() {
  const [saved] = useState(readSavedLocation);
  const [mode, setModeState] = useState<LocationMode>(saved.mode);
  const [latitude, setLatitude] = useState(saved.latitude);
  const [longitude, setLongitude] = useState(saved.longitude);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day",
        timezone: "auto",
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error(`Weather API ${response.status}`);
      const data = await response.json();
      setWeather({
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        precipitation: data.current.precipitation,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        observedAt: data.current.time,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    } catch {
      setError("weather_unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (mode === "manual") {
      const lat = Number(latitude);
      const lon = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        setError("invalid_coordinates");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, latitude, longitude }));
      void fetchWeather(lat, lon);
      return;
    }

    if (!navigator.geolocation) {
      setError("location_unsupported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          mode,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        void fetchWeather(coords.latitude, coords.longitude);
      },
      () => {
        setLoading(false);
        setError("location_denied");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    );
  }, [fetchWeather, latitude, longitude, mode]);

  const setMode = (nextMode: LocationMode) => {
    setModeState(nextMode);
    setError("");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: nextMode, latitude, longitude }));
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return {
    mode, setMode, latitude, setLatitude, longitude, setLongitude,
    weather, loading, error, refresh,
  };
}
