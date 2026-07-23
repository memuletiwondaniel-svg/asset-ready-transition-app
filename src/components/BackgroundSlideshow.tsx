import React, { useEffect, useMemo, useRef, useState } from 'react';

interface BackgroundSlideshowProps {
  showFunFacts?: boolean;
}

const assetModules = import.meta.glob<{ default: { url: string } }>(
  '../assets/login-slideshow/*.asset.json',
  { eager: true }
);

type Category = 'vessel' | 'offshore_platform' | 'tank' | 'aerial_plant' | 'human';

/**
 * EXPLICIT per-image category map. Do NOT infer from filename or contents.
 * Anything on water that is a hull (LNG carrier, tanker, accommodation vessel)
 * is `vessel` — even if it carries spherical tanks on deck.
 */
const CATEGORY_BY_STEM: Record<string, Category> = {
  'login-bg-01': 'tank',             // white land storage tanks + curved staircases
  'login-bg-02': 'offshore_platform',// aerial offshore drilling platform w/ helipad
  'login-bg-03': 'aerial_plant',     // top-down 4 spheres on fenced lawn
  'login-bg-04': 'vessel',           // LNG carrier w/ spheres at sunset
  'login-bg-05': 'vessel',           // aerial LNG carrier docked at pier
  'login-bg-06': 'human',            // worker w/ tablet in factory
  'login-bg-07': 'offshore_platform',// interconnected offshore platforms
  'login-bg-08': 'offshore_platform',// platform on concrete pillar
  'login-bg-09': 'offshore_platform',// platform w/ yellow legs, orange lifeboats
  'login-bg-11': 'human',            // worker w/ tablet at refinery sunset
  'login-bg-12': 'offshore_platform',// offshore platform w/ walkway at sunset
  'login-bg-13': 'aerial_plant',     // top-down refinery piping + tanks
  'login-bg-14': 'vessel',           // aerial LNG tanker docked
  'login-bg-15': 'vessel',           // aerial LNG carrier docked at long pier
};

interface Slide {
  url: string;
  category: Category;
  stem: string;
  objectPosition: string;
}

/**
 * Per-image object-position so the subject sits on the RIGHT of the frame
 * (text panel occupies the left ~58%). Never flip — some frames carry
 * hull markings / plant signage.
 */
const OBJECT_POSITION_BY_STEM: Record<string, string> = {
  'login-bg-01': '78% center',
  'login-bg-02': '72% center',
  'login-bg-03': '65% center',
  'login-bg-04': '80% center', // LNG carrier w/ spheres — keep subject right, no flip
  'login-bg-05': '78% center', // LNG carrier docked
  'login-bg-06': '82% center', // worker w/ tablet — keep on the right
  'login-bg-07': '75% center',
  'login-bg-08': '75% center',
  'login-bg-09': '75% center',
  'login-bg-11': '82% center', // worker at refinery sunset — subject right
  'login-bg-12': '75% center',
  'login-bg-13': '60% center',
  'login-bg-14': '78% center',
  'login-bg-15': '80% center',
};

const SLIDES: Slide[] = Object.keys(assetModules)
  .sort()
  .map((k) => {
    const stem = k.split('/').pop()!.replace(/\..*$/, '');
    return {
      url: assetModules[k].default.url,
      category: CATEGORY_BY_STEM[stem] ?? 'aerial_plant',
      stem,
      objectPosition: OBJECT_POSITION_BY_STEM[stem] ?? '75% center',
    };
  });

const DISPLAY_MS = 8000;
const FADE_MS = 2500;
// Ken-Burns runs across the full visible life of a slide (fade-in + display + fade-out)
// so the transform never snaps mid-view.
const MOTION_MS = DISPLAY_MS + FADE_MS * 2 + 500;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const preloadAndDecode = (src: string): Promise<void> =>
  new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    img.onerror = () => done();
    img.src = src;
  });

const pickNextIndex = (currentIdx: number): number => {
  if (SLIDES.length < 2) return 0;
  const currentCat = SLIDES[currentIdx].category;
  const candidates: number[] = [];
  for (let i = 0; i < SLIDES.length; i++) {
    if (i === currentIdx) continue;
    if (SLIDES[i].category !== currentCat) candidates.push(i);
  }
  const pool = candidates.length
    ? candidates
    : SLIDES.map((_, i) => i).filter((i) => i !== currentIdx);
  return pool[Math.floor(Math.random() * pool.length)];
};

/** Generate a fresh random Ken-Burns from/to transform pair (larger, slower motion). */
const randomKenBurns = () => {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const sign = () => (Math.random() < 0.5 ? -1 : 1);
  const startScale = rand(1.0, 1.05);
  const endScale = rand(1.18, 1.28);
  const startX = sign() * rand(0, 2);
  const startY = sign() * rand(0, 2);
  const endX = sign() * rand(3, 6);
  const endY = sign() * rand(3, 6);
  return {
    from: `scale(${startScale}) translate(${startX}%, ${startY}%)`,
    to: `scale(${endScale}) translate(${endX}%, ${endY}%)`,
  };
};

interface LayerState {
  idx: number;
  motionId: number; // increments each time this layer receives a new image
  from: string;
  to: string;
}

const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = () => {
  const reduced = useMemo(prefersReducedMotion, []);
  const startIndex = useMemo(
     () => (SLIDES.length ? Math.floor(Math.random() * SLIDES.length) : 0),
    []
  );

  // Two persistent layers (A/B) that swap roles. Whichever is "front" is at
  // opacity 1; the other fades from 0 -> 1 on top, then becomes the new front.
  const initialKB = useMemo(randomKenBurns, []);
  const [layerA, setLayerA] = useState<LayerState>({
    idx: startIndex,
    motionId: 0,
    from: initialKB.from,
    to: initialKB.to,
  });
  const [layerB, setLayerB] = useState<LayerState | null>(null);
  const [frontLayer, setFrontLayer] = useState<'A' | 'B'>('A');
  const [overlayOn, setOverlayOn] = useState(false);
  const frontLayerRef = useRef<'A' | 'B'>('A');

  useEffect(() => {
    if (!SLIDES.length) return;
    let cancelled = false;
    (async () => {
      await preloadAndDecode(SLIDES[startIndex].url);
      if (cancelled) return;
      SLIDES.forEach((s, i) => {
        if (i !== startIndex) preloadAndDecode(s.url);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [startIndex]);

  useEffect(() => {
    if (SLIDES.length < 2) return;
    let stopped = false;
    let cycle: number | null = null;
    let fade: number | null = null;

    let currentIdx = startIndex;

    const scheduleNext = () => {
      if (stopped) return;
      cycle = window.setTimeout(async () => {
        if (stopped) return;
        const nextIdx = pickNextIndex(currentIdx);
        await preloadAndDecode(SLIDES[nextIdx].url);
        if (stopped) return;

        const back: 'A' | 'B' = frontLayerRef.current === 'A' ? 'B' : 'A';
        const kb = randomKenBurns();
        const setter = back === 'A' ? setLayerA : setLayerB;
        setter((prev) => ({
          idx: nextIdx,
          motionId: (prev?.motionId ?? 0) + 1,
          from: kb.from,
          to: kb.to,
        }));
        setOverlayOn(false);

        // Two RAFs so the new image mounts at opacity 0 (and starts its
        // Ken-Burns from `from`) before we flip to opacity 1 / `to`.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (stopped) return;
            setOverlayOn(true);
          });
        });

        const fadeMs = reduced ? 0 : FADE_MS;
        fade = window.setTimeout(() => {
          if (stopped) return;
          setFrontLayer(back);
          frontLayerRef.current = back;
          setOverlayOn(false);
          currentIdx = nextIdx;
          scheduleNext();
        }, fadeMs + 60);
      }, DISPLAY_MS);
    };

    scheduleNext();
    return () => {
      stopped = true;
      if (cycle) clearTimeout(cycle);
      if (fade) clearTimeout(fade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);


  if (!SLIDES.length) {
    return (
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
    );
  }

  const fadeMs = reduced ? 0 : FADE_MS;
  const motionMs = reduced ? 0 : MOTION_MS;

  const renderLayer = (
    state: LayerState | null,
    role: 'A' | 'B'
  ) => {
    if (!state) return null;
    const isFront = frontLayer === role;
    // Front layer is always fully opaque; back layer fades 0 -> 1 while overlayOn.
    const opacity = isFront ? 1 : overlayOn ? 1 : 0;
    return (
      <KenBurnsImage
        key={`${role}-${state.motionId}`}
        url={SLIDES[state.idx].url}
        from={state.from}
        to={state.to}
        motionMs={motionMs}
        style={{
          opacity,
          transition: `opacity ${fadeMs}ms ease-in-out`,
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-900">
      {renderLayer(layerA, 'A')}
      {renderLayer(layerB, 'B')}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
    </div>
  );
};

interface KenBurnsImageProps {
  url: string;
  from: string;
  to: string;
  motionMs: number;
  style: React.CSSProperties;
}

/**
 * Renders an <img> that continuously transitions its transform from `from`
 * to `to` over `motionMs` using ease-in-out. Because each new image mounts
 * with a fresh key, there is no keyframe loop and therefore no snap-back
 * at the boundary — the outgoing layer keeps drifting during the crossfade.
 */
const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  url,
  from,
  to,
  motionMs,
  style,
}) => {
  const [transform, setTransform] = useState(from);
  useEffect(() => {
    if (motionMs === 0) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransform(to));
    });
    return () => cancelAnimationFrame(id);
  }, [to, motionMs]);
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      className="absolute inset-0 w-full h-full object-cover object-center"
      style={{
        ...style,
        transform,
        transition: `${style.transition ?? ''}${style.transition ? ', ' : ''}transform ${motionMs}ms ease-in-out`,
        willChange: 'transform, opacity',
      }}
    />
  );
};

export default BackgroundSlideshow;
