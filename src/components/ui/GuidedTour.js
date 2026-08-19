import React, { useEffect, useLayoutEffect, useState } from 'react';
import { X } from 'lucide-react';

const HOLE_PAD = 8;
const CARD_WIDTH = 300;
const VIEWPORT_MARGIN = 16;

function measure(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * A small, self-contained "spotlight" walkthrough: dims the page, cuts a see-through
 * hole around one element at a time, and shows a short callout next to it. Steps whose
 * target isn't currently in the DOM (e.g. a teacher-only control for a student view) are
 * skipped automatically rather than breaking the tour.
 *
 * steps: [{ selector: '[data-tour="x"]', title, body }]
 */
export default function GuidedTour({ steps, open, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setReady(false);
    }
  }, [open]);

  // Recompute the target's position; skip forward past any step whose element isn't
  // currently rendered, and close the tour if none of the remaining steps resolve.
  useLayoutEffect(() => {
    if (!open) return;
    let i = index;
    let found = null;
    while (i < steps.length) {
      found = measure(steps[i].selector);
      if (found) break;
      i += 1;
    }
    if (i !== index) {
      setIndex(i);
      return;
    }
    if (!found) {
      onClose?.();
      return;
    }
    setRect(found);
    setReady(true);
    const target = document.querySelector(steps[i].selector);
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, steps.length]);

  useEffect(() => {
    if (!open) return undefined;
    const recompute = () => {
      const step = steps[index];
      if (step) setRect(measure(step.selector) || rect);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, steps.length]);

  if (!open || !rect) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const hole = {
    top: rect.top - HOLE_PAD,
    left: rect.left - HOLE_PAD,
    width: rect.width + HOLE_PAD * 2,
    height: rect.height + HOLE_PAD * 2,
  };

  // Prefer placing the callout below the target; flip above if there isn't room.
  const spaceBelow = window.innerHeight - (hole.top + hole.height);
  const placeAbove = spaceBelow < 190 && hole.top > 190;
  const cardTop = placeAbove ? Math.max(VIEWPORT_MARGIN, hole.top - 10) : hole.top + hole.height + 10;
  const cardLeftRaw = hole.left + hole.width / 2 - CARD_WIDTH / 2;
  const cardLeft = Math.min(
    Math.max(VIEWPORT_MARGIN, cardLeftRaw),
    window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN
  );

  return (
    <div aria-live="polite">
      <div
        className="fixed inset-0 z-[70]"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="fixed z-[71] rounded-xl pointer-events-none transition-all duration-300 ease-out"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(17, 17, 20, 0.55), 0 0 0 2px rgba(255,255,255,0.95), 0 0 22px rgba(0,113,227,0.35)',
          opacity: ready ? 1 : 0,
        }}
      />
      <div
        className="fixed z-[72] rounded-card bg-surface border border-hairline-soft shadow-xl p-4 transition-all duration-300 ease-out"
        style={{ top: cardTop, left: cardLeft, width: CARD_WIDTH, opacity: ready ? 1 : 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="false"
        aria-label={`Guide, step ${index + 1} of ${steps.length}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-cap font-semibold uppercase tracking-wide text-muted">
            Step {index + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="p-0.5 -mr-1 -mt-0.5 text-muted hover:text-fg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-small font-semibold text-fg mt-1.5">{step.title}</p>
        <p className="text-small text-secondary mt-1">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <span
                key={s.selector}
                className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-fg' : 'bg-hairline'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="h-8 px-3 text-small text-secondary rounded-pill border border-hairline bg-surface hover:bg-canvas transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onClose?.() : setIndex((i) => i + 1))}
              className="h-8 px-3 text-small text-white bg-fg rounded-pill hover:opacity-90 transition-opacity"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
