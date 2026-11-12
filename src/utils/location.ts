// GPS helpers: live position for the map / check-in, one-shot position for punch, shift tracking.
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { crmService } from '../services';
import type { LatLng, LocationPingsInput } from '../types';

/** A GPS reading. approx = not precise (old reading or accuracy worse than 50 m): "nearest location". */
export interface Fix extends LatLng {
  accuracy: number | null;
  at: number; // ms timestamp of the reading
  approx: boolean;
}

export type LiveLocation =
  | { status: 'checking'; fix: Fix | null }
  | { status: 'ok'; fix: Fix }
  | { status: 'denied' | 'error'; fix: null };

const PRECISE_M = 50;

const toFix = (p: Location.LocationObject, old = false): Fix => ({
  latitude: p.coords.latitude,
  longitude: p.coords.longitude,
  accuracy: p.coords.accuracy ?? null,
  at: p.timestamp,
  approx: old || (p.coords.accuracy ?? Infinity) > PRECISE_M,
});

/**
 * Follows the phone's position while the screen is open.
 * Shows the last known (nearest) position at once, then switches to the live GPS fix.
 * Change `retryKey` to ask again after "denied" / "error".
 */
export function useLiveLocation(retryKey = 0): LiveLocation {
  const [state, setState] = useState<LiveLocation>({ status: 'checking', fix: null });

  useEffect(() => {
    let active = true;
    let sub: Location.LocationSubscription | null = null;
    let gotLive = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (status !== 'granted') return setState({ status: 'denied', fix: null });
        setState((s) => (s.status === 'ok' ? s : { status: 'checking', fix: null })); // after a retry

        // 1) Quick: last known position (may be a few minutes old) -> shown as approximate.
        const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 }).catch(
          () => null,
        );
        if (active && last && !gotLive) setState({ status: 'ok', fix: toFix(last, true) });

        // 2) Live: keep following the GPS.
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 3 },
          (p) => {
            gotLive = true;
            if (active) setState({ status: 'ok', fix: toFix(p) });
          },
        );
        if (!active) sub.remove();

        // 3) No GPS fix at all after 20 s (indoors / GPS off) -> try network location once.
        setTimeout(async () => {
          if (!active || gotLive) return;
          const p = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          }).catch(() => null);
          if (!active || gotLive) return;
          setState(
            p
              ? { status: 'ok', fix: toFix(p, true) }
              : (s) => (s.fix ? s : { status: 'error', fix: null }),
          );
        }, 20_000);
      } catch {
        if (active) setState({ status: 'error', fix: null }); // location services off
      }
    })();

    return () => {
      active = false;
      sub?.remove();
    };
  }, [retryKey]);

  return state;
}

/** Street address for a position. Looked up again only after moving ~100 m. */
export function useAddress(fix: Fix | null): string | null {
  const [address, setAddress] = useState<{ at: LatLng; text: string } | null>(null);
  const moved = !address || !fix || distanceM(address.at, fix) > 100;
  const lat = fix?.latitude;
  const lng = fix?.longitude;

  useEffect(() => {
    if (!moved || lat === undefined || lng === undefined) return;
    let active = true;
    Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      .then(([a]) => {
        if (!active || !a) return;
        const parts = [a.name, a.street, a.district, a.city, a.postalCode].filter(
          (p, i, all): p is string => !!p && all.indexOf(p) === i,
        );
        setAddress({ at: { latitude: lat, longitude: lng }, text: parts.join(', ') });
      })
      .catch(() => {}); // no address service: lat/lng is still shown
    return () => {
      active = false;
    };
  }, [moved, lat, lng]);

  return address?.text ?? null;
}

/** One position for punch in/out: last known if fresh, else a quick reading. Never throws; null if unavailable. */
export async function quickLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000 });
    const p =
      last ??
      (await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((r) => setTimeout(() => r(null), 8000)),
      ]));
    return p ? { latitude: p.coords.latitude, longitude: p.coords.longitude } : null;
  } catch {
    return null;
  }
}

type Ping = LocationPingsInput['pings'][number];

/**
 * While punched in (and the app is open), sends the position about once a minute.
 * Points that fail to send are kept and sent with the next one.
 */
export function useShiftTracking(punchedIn: boolean) {
  useEffect(() => {
    if (!punchedIn) return;
    let active = true;
    let sub: Location.LocationSubscription | null = null;
    let queue: Ping[] = [];
    let sending = false;

    const flush = async () => {
      if (sending || !queue.length) return;
      sending = true;
      const batch = queue.slice(0, 120);
      try {
        await crmService.sendLocations({ pings: batch });
        queue = queue.slice(batch.length);
      } catch {
        // offline: keep the points (at most 2 hours) and retry with the next one
        queue = queue.slice(-120);
      } finally {
        sending = false;
      }
    };

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync().catch(() => ({
        status: 'denied',
      }));
      if (!active || status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 60_000, distanceInterval: 0 },
        (p) => {
          queue.push({
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy ?? null,
            recordedAt: new Date(p.timestamp).toISOString(),
          });
          flush();
        },
      ).catch(() => null);
      if (!active) sub?.remove();
    })();

    return () => {
      active = false;
      sub?.remove();
      flush();
    };
  }, [punchedIn]);
}

/** Straight-line distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
