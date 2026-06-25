export function normalizeTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(name);
  }

  return normalized;
}

export function mergeTagNames(current: string[], additions: string[]): string[] {
  return normalizeTagNames([...current, ...additions]);
}

export function sameTagNames(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name, index) => name === b[index]);
}

export function shouldAdoptIncomingTextDraft(
  currentDraft: string,
  lastLoaded: string,
  incoming: string,
): boolean {
  return currentDraft === lastLoaded && incoming !== lastLoaded;
}

export function shouldAdoptIncomingTagDraft(
  currentDraft: string[],
  lastLoaded: string[],
  incoming: string[],
): boolean {
  return sameTagNames(currentDraft, lastLoaded) && !sameTagNames(incoming, lastLoaded);
}
