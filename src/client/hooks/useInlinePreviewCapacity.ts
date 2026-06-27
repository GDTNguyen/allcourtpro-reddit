import { useLayoutEffect, useState, type RefObject } from 'react';

const ESTIMATED_ROW_HEIGHT_PX = 72;
const MIN_VISIBLE_MATCHES = 5;
const MAX_VISIBLE_MATCHES = 20;
const OVERLAY_RESERVE_PX = 52;

export function useInlinePreviewCapacity(
  shellRef: RefObject<HTMLElement | null>,
  deps: readonly unknown[] = [],
): number {
  const [targetCount, setTargetCount] = useState(MIN_VISIBLE_MATCHES);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const measure = () => {
      const style = getComputedStyle(shell);
      const paddingY =
        Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);

      const fixedBlocks = shell.querySelectorAll('[data-inline-fixed]');
      let fixedHeight = 0;
      fixedBlocks.forEach((block) => {
        fixedHeight += block.getBoundingClientRect().height;
      });

      const available = shell.clientHeight - paddingY - fixedHeight - OVERLAY_RESERVE_PX;
      const nextCount = Math.max(
        MIN_VISIBLE_MATCHES,
        Math.min(MAX_VISIBLE_MATCHES, Math.ceil(available / ESTIMATED_ROW_HEIGHT_PX)),
      );

      setTargetCount((current) => (current === nextCount ? current : nextCount));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [shellRef, ...deps]);

  return targetCount;
}
