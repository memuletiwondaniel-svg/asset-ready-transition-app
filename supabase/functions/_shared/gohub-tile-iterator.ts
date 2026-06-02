// Shared per-tile iteration for GoCompletions/GoHub.
//
// Why this exists:
//   GoCompletions binds a session to ONE active project tile server-side.
//   Re-using cookies across tiles silently returns the first tile's data
//   (or nothing). The only reliable way to switch tiles is to establish a
//   FRESH login session for each tile, re-extract the live postback tokens
//   from that fresh home page, then select + navigate.
//
// Both `gohub-sync-counts` (admin Sync Projects) and `gohub-import`
// (P2A wizard CMS Import) call into this so the fix can't diverge again.

import {
  loginGoCompletions,
  extractAllProjectTiles,
  selectProjectTile,
  navigateToCompletionsGrid,
  type ProjectTile,
} from "./gocompletions-auth.ts";

export type TileStatus = "ok" | "empty" | "load_failed" | "error";

export interface TileOutcome<T> {
  name: string;
  status: TileStatus;
  note?: string;
  result: T | null;
}

export interface TileIterationOutput<T> {
  tiles: ProjectTile[];      // tiles as seen on the initial login (names only are meaningful)
  outcomes: TileOutcome<T>[]; // one per tile, in the same order
  homePageHtml: string;       // initial home page (kept for "no tiles" fallbacks)
  homePageUrl: string;
  initialCookies: Record<string, string>;
}

/**
 * Per-tile processor. Receives the freshly-loaded CompletionsGrid for ONE
 * tile and returns a domain-specific payload plus an explicit status:
 *   - "ok": grid returned data
 *   - "empty": grid loaded but truly contained no rows
 *   - "load_failed": grid call returned nothing — tile likely didn't switch
 *
 * The iterator wraps login/select/navigation errors with status "load_failed"
 * or "error"; the processor only needs to classify the data outcome.
 */
export type TileProcessor<T> = (ctx: {
  tile: ProjectTile;
  cookies: Record<string, string>;
  gridPageUrl: string;
  gridHtml: string;
}) => Promise<{ result: T; status: "ok" | "empty" | "load_failed"; note?: string }>;

export interface IterateOptions {
  logPrefix?: string;
}

/**
 * Login once to enumerate tiles, then for each tile establish a FRESH session
 * (fresh login → re-extract tile postback → select → grid nav → process).
 */
export async function iterateProjectTilesFreshSession<T>(
  portalUrl: string,
  username: string,
  password: string,
  process: TileProcessor<T>,
  options: IterateOptions = {},
): Promise<TileIterationOutput<T>> {
  const prefix = options.logPrefix || "TileIter";

  const initial = await loginGoCompletions(portalUrl, username, password);
  const tiles = extractAllProjectTiles(initial.homePageHtml);
  const outcomes: TileOutcome<T>[] = [];

  for (const tile of tiles) {
    try {
      // FRESH LOGIN PER TILE — see file header for why.
      const fresh = await loginGoCompletions(portalUrl, username, password);
      const refreshedTiles = extractAllProjectTiles(fresh.homePageHtml);
      const liveTile = refreshedTiles.find((t) => t.name === tile.name) || tile;

      let projectCookies: Record<string, string>;
      let responseHtml: string;
      let responseUrl: string;
      try {
        const sel = await selectProjectTile(
          fresh.cookies,
          fresh.homePageHtml,
          fresh.homePageUrl,
          liveTile,
        );
        projectCookies = sel.cookies;
        responseHtml = sel.responseHtml;
        responseUrl = sel.responseUrl;
      } catch (selErr) {
        console.log(`${prefix}: tile "${tile.name}" — select failed: ${selErr}`);
        outcomes.push({
          name: tile.name,
          status: "load_failed",
          note: "tile select failed (session did not switch)",
          result: null,
        });
        continue;
      }

      let gridHtml: string;
      let gridPageUrl: string;
      let gridCookies: Record<string, string>;
      try {
        const grid = await navigateToCompletionsGrid(
          projectCookies,
          portalUrl,
          responseHtml,
          responseUrl,
        );
        gridHtml = grid.html;
        gridPageUrl = grid.url;
        gridCookies = grid.cookies;
      } catch (navErr) {
        console.log(`${prefix}: tile "${tile.name}" — grid nav failed: ${navErr}`);
        outcomes.push({
          name: tile.name,
          status: "load_failed",
          note: "grid navigation failed",
          result: null,
        });
        continue;
      }

      const processed = await process({
        tile: liveTile,
        cookies: gridCookies,
        gridPageUrl,
        gridHtml,
      });
      outcomes.push({
        name: tile.name,
        status: processed.status,
        note: processed.note ?? (processed.status === "load_failed"
          ? "grid returned no data — tile likely not active"
          : undefined),
        result: processed.result,
      });
      console.log(`${prefix}: tile "${tile.name}" — status=${processed.status}`);
    } catch (e) {
      console.log(`${prefix}: tile "${tile.name}" — error: ${e}`);
      outcomes.push({
        name: tile.name,
        status: "error",
        note: String(e).slice(0, 200),
        result: null,
      });
    }
  }

  return {
    tiles,
    outcomes,
    homePageHtml: initial.homePageHtml,
    homePageUrl: initial.homePageUrl,
    initialCookies: initial.cookies,
  };
}
