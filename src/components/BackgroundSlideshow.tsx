import React, { useEffect, useMemo, useRef, useState } from 'react';

interface BackgroundSlideshowProps {
  /** Legacy prop, kept for API compat. No longer renders any BGC copy. */
  showFunFacts?: boolean;
}

// Vite glob import — pull every login background asset pointer
const assetModules = import.meta.glob<{ default: { url: string } }>(
  '../assets/login-slideshow/*.asset.json',
  { eager: true }
);

const IMAGES: string[] = Object.keys(assetModules)
  .sort()
  .map((k) => assetModules[k].default.url);

const DISPLAY_MS = 7000;
const FADE_MS = 1500;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = () => {
  const reduced = useMemo(prefersReducedMotion, []);
  const startIndex = useMemo(
    () => (IMAGES.length ? Math.floor(Math.random() * IMAGES.length) : 0),
    []
  );

  const [current, setCurrent] = useState(startIndex);
  const [previous, setPrevious] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([startIndex]));
  const timerRef = useRef<number | null>(null);

  // Preload first image eagerly, others lazily after mount
  useEffect(() => {
    if (!IMAGES.length) return;
    const first = new Image();
    first.fetchPriority = 'high';
    first.onload = () => setLoaded((p) => new Set(p).add(startIndex));
    first.src = IMAGES[startIndex];

    const idle = (cb: () => void) =>
      'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(cb)
        : window.setTimeout(cb, 500);

    idle(() => {
      IMAGES.forEach((src, i) => {
        if (i === startIndex) return;
        const img = new Image();
        img.loading = 'lazy';
        img.onload = () => setLoaded((p) => new Set(p).add(i));
        img.src = src;
      });
    });
  }, [startIndex]);

  // Rotation
  useEffect(() => {
    if (IMAGES.length < 2) return;
    timerRef.current = window.setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % IMAGES.length;
        setPrevious(c);
        window.setTimeout(() => setPrevious(null), FADE_MS + 100);
        return next;
      });
    }, DISPLAY_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  if (!IMAGES.length) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    );
  }

  const fadeMs = reduced ? 0 : FADE_MS;
  const kenBurns = !reduced;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
      {previous !== null && (
        <img
          key={`prev-${previous}`}
          src={IMAGES[previous]}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover object-center ${kenBurns ? 'animate-ken-burns' : ''}`}
          style={{
            opacity: 0,
            transition: `opacity ${fadeMs}ms ease-in-out`,
            willChange: 'opacity',
          }}
        />
      )}
      <img
        key={`cur-${current}`}
        src={IMAGES[current]}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover object-center ${kenBurns ? 'animate-ken-burns' : ''}`}
        style={{
          opacity: loaded.has(current) ? 1 : 0,
          transition: `opacity ${fadeMs}ms ease-in-out`,
          willChange: 'opacity',
        }}
        onLoad={() => setLoaded((p) => new Set(p).add(current))}
      />
      {/* Legibility overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
    </div>
  );
};

export default BackgroundSlideshow;
