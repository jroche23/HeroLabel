import { useState, useEffect } from 'react';
import type { Task } from '@/types';

// Module-level cache shared across renders (persists for the session)
const geocodeCache = new Map<string, string>();
const inFlight = new Set<string>();

const LAT_KEYS = ['latitude', 'lat', 'Latitude', 'LAT', 'y'];
const LON_KEYS = ['longitude', 'lon', 'lng', 'Longitude', 'LON', 'LNG', 'x'];

function findLatLon(data: Record<string, unknown>): { lat: number; lon: number } | null {
  let lat: number | null = null;
  let lon: number | null = null;

  for (const key of LAT_KEYS) {
    if (data[key] != null) {
      const v = parseFloat(String(data[key]));
      if (!isNaN(v) && v >= -90 && v <= 90) { lat = v; break; }
    }
  }
  for (const key of LON_KEYS) {
    if (data[key] != null) {
      const v = parseFloat(String(data[key]));
      if (!isNaN(v) && v >= -180 && v <= 180) { lon = v; break; }
    }
  }

  return lat !== null && lon !== null ? { lat, lon } : null;
}

/** Round to 3 decimal places (~111m precision) for cache key */
function toKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/**
 * Given a list of tasks, reverse-geocodes any that contain lat/lon fields
 * and returns a map of taskId → "City, Region, Country" string.
 * Uses Nominatim (free, no key needed). Rate-limited to 1 req/s.
 */
export function useGeocoding(tasks: Task[]): Map<string, string> {
  const [locations, setLocations] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Group tasks by coordinate key to deduplicate requests
    const byKey = new Map<string, { lat: number; lon: number; taskIds: string[] }>();

    for (const task of tasks) {
      const coords = findLatLon(task.data as Record<string, unknown>);
      if (!coords) continue;
      const key = toKey(coords.lat, coords.lon);

      if (geocodeCache.has(key)) {
        // Already cached — update state immediately
        setLocations((prev) => {
          const next = new Map(prev);
          next.set(task.id, geocodeCache.get(key)!);
          return next;
        });
        continue;
      }

      if (!byKey.has(key)) {
        byKey.set(key, { lat: coords.lat, lon: coords.lon, taskIds: [] });
      }
      byKey.get(key)!.taskIds.push(task.id);
    }

    // Queue requests with 1.1s spacing to respect Nominatim's rate limit
    let delay = 0;
    for (const [key, { lat, lon, taskIds }] of byKey) {
      if (inFlight.has(key)) continue;
      inFlight.add(key);

      const timer = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`,
            { headers: { 'User-Agent': 'LabelStudioReplica/1.0' } }
          );
          const json = await res.json();
          const addr = json.address ?? {};
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
          const region = addr.state || addr.region || '';
          const country = addr.country || '';
          const parts = [city, region, country].filter(Boolean);
          const location = parts.join(', ') || 'Unknown';

          geocodeCache.set(key, location);
          setLocations((prev) => {
            const next = new Map(prev);
            for (const id of taskIds) next.set(id, location);
            return next;
          });
        } catch {
          geocodeCache.set(key, '—');
          setLocations((prev) => {
            const next = new Map(prev);
            for (const id of taskIds) next.set(id, '—');
            return next;
          });
        } finally {
          inFlight.delete(key);
        }
      }, delay);

      timers.push(timer);
      delay += 1100;
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [tasks]);

  return locations;
}

/** Returns true if any task in the list has recognisable lat/lon fields */
export function hasGeoData(tasks: Task[]): boolean {
  return tasks.some((t) => findLatLon(t.data as Record<string, unknown>) !== null);
}
