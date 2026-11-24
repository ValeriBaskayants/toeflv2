const FALLBACK_TIME_ZONE = 'UTC';

export function isValidTimeZone(timeZone: string): boolean {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).resolvedOptions().timeZone.length > 0;
  } catch (err: unknown) {
    if (err instanceof RangeError) {
      return false;
    }
    throw err;
  }
}

export function resolveTimeZone(timeZone: string | undefined): string {
  return timeZone !== undefined && isValidTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE;
}

export function localDateString(timeZone: string | undefined, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}