import { STORAGE_KEYS } from '@/constants/listening';
import { readStorage, writeStorage } from './safeStorage';

export function readVolume(): number {
  const raw = readStorage(STORAGE_KEYS.volume);
  if (raw === null) return 1;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

export function writeVolume(volume: number): void {
  writeStorage(STORAGE_KEYS.volume, String(volume));
}

export function readShowTime(): boolean {
  return readStorage(STORAGE_KEYS.showTime) !== '0';
}

export function writeShowTime(show: boolean): void {
  writeStorage(STORAGE_KEYS.showTime, show ? '1' : '0');
}