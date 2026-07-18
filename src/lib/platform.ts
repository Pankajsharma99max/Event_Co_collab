export type EventPlatform = "LUMA";

/**
 * Determines which co-host verification strategy applies to a submitted event.
 * Since this is a Luma-only platform now, it always returns "LUMA".
 */
export function detectPlatform(url: string): EventPlatform {
  return "LUMA";
}
