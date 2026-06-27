import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ResultsInlinePreview } from './components/results-inline-preview';

export const Splash = () => (
  <ResultsInlinePreview onExpand={(e) => requestExpandedMode(e.nativeEvent, 'game')} />
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
