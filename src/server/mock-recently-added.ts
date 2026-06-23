import type { RecentlyAddedResponse } from '../shared/api';

const ALTMAIER_COMPARISON = "## Daniel Altmaier vs Aleksandar Kovacevic\n\n> ATP career stats · Match Charting Project\n> 22 charted (Altmaier) · 12 charted (Kovacevic)\n\n- **Aces / match** — 6.7 (Altmaier) · **10.3** (Kovacevic)\n- **Double faults / match** — **2.2** (Altmaier) · 2.9 (Kovacevic)\n- **1st serve in %** — **64%** (Altmaier) · 59% (Kovacevic)\n- **1st serve won %** — 70% (Altmaier) · **77%** (Kovacevic)\n- **2nd serve won %** — 46% (Altmaier) · **48%** (Kovacevic)\n- **Break points saved %** — 51% (Altmaier) · **70%** (Kovacevic)\n- **Return points won %** — **33%** (Altmaier) · 32% (Kovacevic)\n- **Winners / match** — 27.5 (Altmaier) · **27.8** (Kovacevic)\n- **Unforced errors / match** — 30.1 (Altmaier) · **29.1** (Kovacevic)\n- **Winners : unforced ratio** — 0.91 (Altmaier) · **0.96** (Kovacevic)\n\n**Verdict**\n\n- **Kovacevic** leads aces / match: **10.3** vs 6.7\n- **Kovacevic** leads break points saved %: **70%** vs 51%\n- **Altmaier** leads double faults / match: **2.2** vs 2.9\n- **Kovacevic** leads 1st serve won %: **77%** vs 70%"

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
      eventKey: '12138873',
      line: 'Eastbourne ATP: D. Altmaier Def A. Kovacevic 6-4, 7-6(4)',
      date: '2026-06-23',
      time: '15:55',
      detectedAt: '2026-06-23T16:35:03.871+00:00',
      comparisonAvailable: true,
      comparisonMarkdown: ALTMAIER_COMPARISON,
    },
    {
      eventKey: '12138882',
      line: 'Eastbourne ATP Doubles: Cerundolo/ Ugo Carabelli Def Cash/ Glasspool 6-4, 7-6(5)',
      date: '2026-06-23',
      time: '16:10',
      detectedAt: '2026-06-23T16:29:04.143+00:00',
      comparisonAvailable: false,
      comparisonMarkdown: null,
    },
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
