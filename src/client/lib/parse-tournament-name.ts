/** Result lines are `{tournament}: {winner} Def {loser} {scores…}`. */
export function parseTournamentName(line: string): string | null {
  const colonIdx = line.indexOf(': ');
  if (colonIdx < 0) return null;

  const name = line.slice(0, colonIdx).trim();
  return name || null;
}

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
