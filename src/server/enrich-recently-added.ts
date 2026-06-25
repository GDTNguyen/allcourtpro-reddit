import { buildChartingComparisonForLine } from './charting-h2h';
import { comparisonToMarkdown } from './charting-h2h-markdown';
import type { RecentlyAddedResult } from '../shared/api';

type MatchLine = {
  eventKey: string;
  line: string;
  date: string;
  time: string | null;
  detectedAt: string;
};

export async function enrichMatchWithComparison(
  match: MatchLine,
  supabaseKey: string,
): Promise<RecentlyAddedResult> {
  const comparison = await buildChartingComparisonForLine(match.line, supabaseKey);
  if (!comparison) {
    return {
      ...match,
      comparisonAvailable: false,
      comparisonMarkdown: null,
    };
  }

  return {
    ...match,
    comparisonAvailable: true,
    comparisonMarkdown: comparisonToMarkdown(comparison),
  };
}
