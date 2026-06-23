import type { RecentlyAddedResponse } from '../shared/api';

const SAMPLE_COMPARISON = `## Kimberly Birrell vs Barbora Krejcikova

> WTA career stats · Match Charting Project
> 13 charted (Birrell) · 28 charted (Krejcikova)

- **Aces / match** — 0.8 (Birrell) · **4.6** (Krejcikova)
- **Winners / match** — 12.2 (Birrell) · **22.0** (Krejcikova)

**Verdict**

- **Krejcikova** leads aces / match: **4.6** vs 0.8`;

export function mockRecentlyAddedResponse(limit: number): RecentlyAddedResponse {
  const now = new Date().toISOString();
  const results = [
    {
      eventKey: '12139176',
      line: 'Eastbourne WTA: K. Birrell Def B. Krejcikova 6-3, 7-6(6)',
      date: '2026-06-23',
      time: '17:20',
      detectedAt: now,
      comparisonAvailable: true,
      comparisonMarkdown: SAMPLE_COMPARISON,
    },
    {
      eventKey: '12139006',
      line: 'Eastbourne WTA Doubles: Haverlag/ Lumsden Def Kozyreva/ Piter 3-6, 6-4, 10-4',
      date: '2026-06-23',
      time: '18:00',
      detectedAt: now,
      comparisonAvailable: false,
      comparisonMarkdown: null,
    },
    {
      eventKey: '12139753',
      line: 'Eastbourne WTA Doubles: Chong/ Tjen Def Errani/ Paolini 7-6(2), 6-3',
      date: '2026-06-23',
      time: '17:50',
      detectedAt: now,
      comparisonAvailable: false,
      comparisonMarkdown: null,
    },
  ].slice(0, limit);

  return {
    type: 'recently-added',
    source: 'mock',
    notice:
      'Sample data — Reddit has not approved www.allcourt.pro for HTTP fetch yet. Check Developer Settings after playtest/upload.',
    queriedAt: now,
    newMatchMaxAgeMinutes: 10,
    cutoffAt: null,
    ageFilterApplied: false,
    results,
  };
}
