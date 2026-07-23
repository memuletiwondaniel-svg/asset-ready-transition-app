import React, { useEffect, useMemo, useRef, useState } from 'react';

interface BackgroundSlideshowProps {
  /** Legacy prop, kept for API compat. */
  showFunFacts?: boolean;
}

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

const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = () => {
  const reduced = useMemo(prefersReducedMotion, []);
  const startIndex = useMemo(
    () => (IMAGES.length ? Math.floor(Math.random() * IMAGES.length) : 0),
    []
  );

  // Two stacked layers: base (always visible at opacity 1) and overlay
  // (fades 0 -> 1 on top). After the fade completes, overlay becomes
  // the new base. This guarantees at least one layer is always opaque.
  const [baseIndex, setBaseIndex] = useState(startIndex);
  const [overlayIndex, setOverlayIndex] = useState<number | null>(null);
  const [overlayOn, setOverlayOn] = useState(false);
  const [readySet, setReadySet] = useState<Set<number>>(new Set());

  const cycleRef = useRef<number | null>(null);
  const nextRef = useRef<number>((startIndex + 1) % Math.max(IMAGES.length, 1));

  // Eager preload every image up front — only ~15 compressed files.
  useEffect(() => {
    if (!IMAGES.length) return;
    let cancelled = false;
    (async () => {
      // Prioritise the first frame.
      await preloadAndDecode(IMAGES[startIndex]);
      if (cancelled) return;
      setReadySet((p) => new Set(p).add(startIndex));
      // Then the rest, in parallel.
      IMAGES.forEach((src, i) => {
        if (i === startIndex) return;
        preloadAndDecode(src).then(() => {
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
    if (IMAGES.length < 2) return;

    let stopped = false;
    let fadeTimer: number | null = null;

    const scheduleNext = () => {
      if (stopped) return;
      cycleRef.current = window.setTimeout(async () => {
        if (stopped) return;
        const nextIdx = nextRef.current;
        // Ensure the next image is decoded before starting the fade.
        await preloadAndDecode(IMAGES[nextIdx]);
        if (stopped) return;

        setOverlayIndex(nextIdx);
        // Next tick: flip opacity to trigger transition.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (stopped) return;
            setOverlayOn(true);
          });
        });

        const fadeMs = reduced ? 0 : FADE_MS;
        fadeTimer = window.setTimeout(() => {
          if (stopped) return;
          // Promote overlay -> base atomically, then hide overlay.
          setBaseIndex(nextIdx);
          setOverlayOn(false);
          setOverlayIndex(null);
          nextRef.current = (nextIdx + 1) % IMAGES.length;
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

  if (!IMAGES.length) {
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
        src={IMAGES[baseIndex]}
        alt=""
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover object-center ${kenBurns ? 'animate-ken-burns' : ''}`}
        style={{ opacity: 1, willChange: 'transform' }}
      />
      {/* Overlay layer — fades 0 -> 1 on top of base, then promoted. */}
      {overlayIndex !== null && (
        <img
          key={`overlay-${overlayIndex}`}
          src={IMAGES[overlayIndex]}
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
