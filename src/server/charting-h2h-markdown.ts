import type { ChartingComparison } from './charting-h2h';

function lastName(fullName: string): string {
  const parts = fullName.replace(/\s+/g, ' ').trim().split(' ');
  return parts[parts.length - 1] ?? fullName;
}

function playerValue(display: string, fullName: string, isLeader: boolean): string {
  const label = lastName(fullName);
  return isLeader ? `**${display}** (${label})` : `${display} (${label})`;
}

/** Renders a charting comparison as Reddit-friendly markdown. */
export function comparisonToMarkdown(comparison: ChartingComparison): string {
  const { tour, playerA, playerB, rows, facts } = comparison;
  const statRows = rows.filter((row) => row.key !== 'matches');

  const lines: string[] = [
    `## ${playerA.fullName} vs ${playerB.fullName}`,
    '',
    `> ${tour} career stats · Match Charting Project`,
    `> ${playerA.matches} charted (${lastName(playerA.fullName)}) · ${playerB.matches} charted (${lastName(playerB.fullName)})`,
    '',
  ];

  for (const row of statRows) {
    const aPart = playerValue(row.aDisplay, playerA.fullName, row.leader === 'a');
    const bPart = playerValue(row.bDisplay, playerB.fullName, row.leader === 'b');
    lines.push(`- **${row.label}** — ${aPart} · ${bPart}`);
  }

  if (facts.length > 0) {
    lines.push('', '**Verdict**', '');
    for (const fact of facts) {
      lines.push(
        `- **${lastName(fact.leaderName)}** leads ${fact.label.toLowerCase()}: **${fact.leaderDisplay}** vs ${fact.trailDisplay}`,
      );
    }
  }

  return lines.join('\n');
}
