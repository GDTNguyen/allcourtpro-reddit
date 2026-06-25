export type ParsedResultPlayers = {
  tour: 'ATP' | 'WTA';
  isDoubles: boolean;
  winner: string;
  loser: string;
};

/** Result lines are `{tournament}: {winner} Def {loser} {scores…}`. */
export function parseResultPlayers(line: string): ParsedResultPlayers | null {
  const trimmed = line.trim();
  const colonIdx = trimmed.indexOf(': ');
  if (colonIdx < 0) return null;

  const header = trimmed.slice(0, colonIdx);
  const rest = trimmed.slice(colonIdx + 2);
  const defMatch = rest.match(/^(.+?)\sDef\s+(.+)$/i);
  if (!defMatch?.[1] || !defMatch[2]) return null;

  const winner = defMatch[1].trim();
  let loserPart = defMatch[2].trim();
  loserPart = loserPart
    .replace(/\s+(?:\d[\d.,()%-]*(?:\s+\d[\d.,()%-]*)*|W\/O|RET\.?|DEF\.?)\s*$/i, '')
    .trim();

  const tour = /\bWTA\b/i.test(header) ? 'WTA' : /\bATP\b/i.test(header) ? 'ATP' : null;
  if (!tour) return null;

  const isDoubles = /\bDoubles\b/i.test(header) || /[/]/.test(winner) || /[/]/.test(loserPart);
  if (!winner || !loserPart) return null;

  return { tour, isDoubles, winner, loser: loserPart };
}

export function primaryLastName(player: string): string {
  const cleaned = player.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  const last = parts[parts.length - 1] ?? cleaned;
  return last.replace(/\.$/, '');
}

export function parseNameInitials(player: string): string[] {
  return [...player.matchAll(/(?:^|\s)([A-Za-z])\./g)]
    .map((match) => match[1])
    .filter((initial): initial is string => initial != null)
    .map((initial) => initial.toUpperCase());
}
