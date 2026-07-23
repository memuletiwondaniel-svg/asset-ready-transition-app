import React, { useEffect, useMemo, useRef, useState } from 'react';

interface BackgroundSlideshowProps {
  /** Legacy prop, kept for API compat. */
  showFunFacts?: boolean;
}

const assetModules = import.meta.glob<{ default: { url: string } }>(
  '../assets/login-slideshow/*.asset.json',
  { eager: true }
);

/**
 * Category tagging so two visually-similar frames never play back-to-back
 * (e.g. tanker after tanker). Keys are the filename stem (login-bg-NN).
 */
type Category =
  | 'ship_tanker'
  | 'platform_rig'
  | 'tank_sphere'
  | 'aerial_plant'
  | 'human';

const CATEGORY_BY_STEM: Record<string, Category> = {
  'login-bg-01': 'tank_sphere',
  'login-bg-02': 'platform_rig',
  'login-bg-03': 'aerial_plant',
  'login-bg-04': 'ship_tanker',
  'login-bg-05': 'ship_tanker',
  'login-bg-06': 'human',
  'login-bg-07': 'platform_rig',
  'login-bg-08': 'platform_rig',
  'login-bg-09': 'platform_rig',
  'login-bg-11': 'human',
  'login-bg-12': 'platform_rig',
  'login-bg-13': 'aerial_plant',
  'login-bg-14': 'ship_tanker',
  'login-bg-15': 'ship_tanker',
};

interface Slide {
  url: string;
  category: Category;
}

const SLIDES: Slide[] = Object.keys(assetModules)
  .sort()
  .map((k) => {
    const stem = k.split('/').pop()!.replace(/\..*$/, '');
    return {
      url: assetModules[k].default.url,
      category: CATEGORY_BY_STEM[stem] ?? 'aerial_plant',
    };
  });

const DISPLAY_MS = 8000;
const FADE_MS = 2500;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Preload + decode an image. Resolves only when the browser has the
 * pixels ready to paint, so the fade never starts on an empty layer.
 */
const preloadAndDecode = (src: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(done, done);
      } else {
        done();
      }
    };
    img.onerror = () => done();
    img.src = src;
  });

/** Pick the next index whose category differs from the current index. */
const pickNextIndex = (currentIdx: number): number => {
  if (SLIDES.length < 2) return 0;
  const currentCat = SLIDES[currentIdx].category;
  // Candidates in a different category.
  const candidates: number[] = [];
  for (let i = 0; i < SLIDES.length; i++) {
    if (i === currentIdx) continue;
    if (SLIDES[i].category !== currentCat) candidates.push(i);
  }
  const pool = candidates.length ? candidates : SLIDES.map((_, i) => i).filter((i) => i !== currentIdx);
  return pool[Math.floor(Math.random() * pool.length)];
};

const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = () => {
  const reduced = useMemo(prefersReducedMotion, []);
  const startIndex = useMemo(
    () => (SLIDES.length ? Math.floor(Math.random() * SLIDES.length) : 0),
    []
  );

  // Two stacked layers: base (always visible at opacity 1) and overlay
  // (fades 0 -> 1 on top). After the fade completes, overlay becomes
  // the new base. This guarantees at least one layer is always opaque.
  const [baseIndex, setBaseIndex] = useState(startIndex);
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);
  const [overlayOn, setOverlayOn] = useState(false);
  const [, setReadySet] = useState<Set<number>>(new Set());

  const cycleRef = useRef<number | null>(null);
  const nextRef = useRef<number>(pickNextIndex(startIndex));

  // Eager preload every image up front — only ~14 compressed files.
  useEffect(() => {
    if (!SLIDES.length) return;
    let cancelled = false;
    (async () => {
      await preloadAndDecode(SLIDES[startIndex].url);
      if (cancelled) return;
      setReadySet((p) => new Set(p).add(startIndex));
      SLIDES.forEach((s, i) => {
        if (i === startIndex) return;
        preloadAndDecode(s.url).then(() => {
          if (!cancelled) setReadySet((p) => new Set(p).add(i));
        });
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [startIndex]);

  // Rotation loop. Only advances when the next image is fully decoded.
  useEffect(() => {
    if (SLIDES.length < 2) return;

    let stopped = false;
    let fadeTimer: number | null = null;

    const scheduleNext = () => {
      if (stopped) return;
      cycleRef.current = window.setTimeout(async () => {
        if (stopped) return;
        const nextIdx = nextRef.current;
        await preloadAndDecode(SLIDES[nextIdx].url);
        if (stopped) return;

        setOverlayIndex(nextIdx);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (stopped) return;
            setOverlayOn(true);
          });
        });

        const fadeMs = reduced ? 0 : FADE_MS;
        fadeTimer = window.setTimeout(() => {
          if (stopped) return;
          setBaseIndex(nextIdx);
          setOverlayOn(false);
          setOverlayIndex(null);
          nextRef.current = pickNextIndex(nextIdx);
          scheduleNext();
        }, fadeMs + 50);
      }, DISPLAY_MS);
    };

    scheduleNext();
    return () => {
      stopped = true;
      if (cycleRef.current) window.clearTimeout(cycleRef.current);
      if (fadeTimer) window.clearTimeout(fadeTimer);
    };
  }, [reduced]);

  if (!SLIDES.length) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    );
  }

  const fadeMs = reduced ? 0 : FADE_MS;
  const kenBurns = !reduced;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
      {/* Base layer — always fully opaque. */}
      <img
        key={`base-${baseIndex}`}
        src={SLIDES[baseIndex].url}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover object-center ${kenBurns ? 'animate-ken-burns' : ''}`}
        style={{ opacity: 1, willChange: 'transform' }}
      />
      {/* Overlay layer — fades 0 -> 1 on top of base, then promoted. */}
      {overlayIndex !== null && (
        <img
          key={`overlay-${overlayIndex}`}
          src={SLIDES[overlayIndex].url}
          alt=""
          aria-hidden
          className={`absolute inset-0 w-full h-full object-cover object-center ${kenBurns ? 'animate-ken-burns' : ''}`}
          style={{
            opacity: overlayOn ? 1 : 0,
            transition: `opacity ${fadeMs}ms ease-in-out`,
            willChange: 'opacity',
          }}
        />
      )}
      {/* Legibility overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
    </div>
  );
};

export default BackgroundSlideshow;
