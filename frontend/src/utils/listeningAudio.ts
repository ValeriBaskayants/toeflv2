const urls = new Map<string, string>();

export async function registerAudio(sessionId: string, base64: string): Promise<void> {
  const response = await fetch(`data:audio/mpeg;base64,${base64}`);
  const blob = await response.blob();
  const previous = urls.get(sessionId);
  if (previous !== undefined) URL.revokeObjectURL(previous);
  urls.set(sessionId, URL.createObjectURL(blob));
}

export function getAudioUrl(sessionId: string): string | null {
  return urls.get(sessionId) ?? null;
}

export function releaseAllAudio(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
}