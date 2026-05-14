/**
 * gohub-discover
 *
 * Crawls the live GoCompletions (GoTechnology Hub2) instance to map out
 * every page, table, and field exposed to our user. Output is a Markdown
 * schema reference that Fred can use as domain knowledge.
 *
 * Strategy:
 *   1. Login → get home page
 *   2. Enumerate every project tile
 *   3. For each tile: select it, snapshot the landing page, harvest all
 *      internal links (.aspx), follow each unique link, and capture:
 *        - page title
 *        - all RadGrid table headers
 *        - first 2 sample rows
 *        - all ASMX endpoints referenced from the page
 *   4. Probe each ASMX endpoint with a benign payload to capture field
 *      names from the JSON response.
 *
 * Returns: { projects: [...], pages: [...], asmx: [...], markdown }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  loginGoCompletions,
  extractAllProjectTiles,
  selectProjectTile,
  followRedirects,
  parseRadGridTable,
  formatCookies,
  parseCookiesFromResponse,
  decodeHtmlEntities,
  BROWSER_UA,
  getGoCompletionsCredentials,
  type ProjectTile,
} from "../_shared/gocompletions-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PageReport {
  project: string;
  url: string;
  title: string;
  tables: { headers: string[]; sampleRows: Record<string, string>[] }[];
  asmxEndpoints: string[];
  links: string[];
  error?: string;
}

const SKIP_PATTERNS = [
  /Logout/i, /SignOut/i, /Help/i, /\.pdf$/i, /\.xlsx?$/i, /\.docx?$/i,
  /javascript:/i, /mailto:/i, /#$/,
];

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtmlEntities(m[1]).trim() : "";
}

const NOISE_HEADERS = new Set(["RadDatePicker", "M", "T", "W", "F", "S", ""]);
function isNoiseTable(headers: string[]): boolean {
  if (headers.length < 2) return true;
  const first = headers[0]?.replace(/&nbsp;/g, "").trim();
  if (first === "RadDatePicker" || first === "" || /^\d+$/.test(first)) {
    // check if mostly day letters / numbers
    const noisy = headers.filter(h => NOISE_HEADERS.has(h.trim()) || /^\d{1,2}$/.test(h.trim()) || h.includes("Title and navigation")).length;
    if (noisy >= headers.length / 2) return true;
  }
  return false;
}

function extractAllTables(html: string): { headers: string[]; sampleRows: Record<string, string>[] }[] {
  const out: { headers: string[]; sampleRows: Record<string, string>[] }[] = [];
  // RadGrid tables
  const rgRegex = /<table[^>]*class="[^"]*rgMasterTable[^"]*"[^>]*>[\s\S]*?<\/table>/gi;
  for (const m of html.matchAll(rgRegex)) {
    const rows = parseRadGridTable(m[0]);
    if (rows.length > 0) {
      out.push({ headers: Object.keys(rows[0]), sampleRows: rows.slice(0, 2) });
    } else {
      // headers only
      const headerMatch = m[0].match(/<tr[^>]*class="[^"]*rgHeader[^"]*"[^>]*>([\s\S]*?)<\/tr>/i);
      if (headerMatch) {
        const headers: string[] = [];
        const thRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
        let t;
        while ((t = thRegex.exec(headerMatch[1])) !== null) {
          const text = t[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          if (text) headers.push(text);
        }
        if (headers.length) out.push({ headers, sampleRows: [] });
      }
    }
  }
  // Generic data tables (fallback)
  if (out.length === 0) {
    const tblRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    for (const m of html.matchAll(tblRegex)) {
      const headers: string[] = [];
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let t;
      while ((t = thRegex.exec(m[1])) !== null) {
        const text = t[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (text) headers.push(text);
      }
      if (headers.length >= 2) out.push({ headers, sampleRows: [] });
    }
  }
  return out.filter(t => !isNoiseTable(t.headers));
}

/** Pull `/<instance>/List/*.aspx` URLs out of a ReferenceTables grid. */
function extractReferenceListPaths(html: string, baseUrl: string): string[] {
  const set = new Set<string>();
  const re = /href=["']([^"']*\/List\/[A-Za-z0-9_]+\.aspx)["']/gi;
  for (const m of html.matchAll(re)) {
    try { set.add(new URL(decodeHtmlEntities(m[1]), baseUrl).toString()); } catch (_) { /* ignore */ }
  }
  // Also harvest absolute paths printed in the ListActionPath column
  const re2 = /\/[A-Za-z0-9_]+\/List\/[A-Za-z0-9_]+\.aspx/g;
  for (const m of html.matchAll(re2)) {
    try { set.add(new URL(m[0], baseUrl).toString()); } catch (_) { /* ignore */ }
  }
  return [...set];
}

function extractAsmxEndpoints(html: string, baseUrl: string): string[] {
  const set = new Set<string>();
  const re = /(?:src|href|url)=["']([^"']*\.asmx(?:\/[A-Za-z0-9_]+)?)["']/gi;
  for (const m of html.matchAll(re)) {
    try { set.add(new URL(m[1], baseUrl).toString()); } catch (_) { /* ignore */ }
  }
  // also look for ajax method names in inline scripts: PageMethods.SomeMethod or "/Service.asmx/Method"
  const asmxLiteral = /["']([^"']*\.asmx\/[A-Za-z0-9_]+)["']/g;
  for (const m of html.matchAll(asmxLiteral)) {
    try { set.add(new URL(m[1], baseUrl).toString()); } catch (_) { /* ignore */ }
  }
  return [...set];
}

function extractInternalLinks(html: string, baseUrl: string, instance: string): string[] {
  const set = new Set<string>();
  const re = /href=["']([^"']+\.aspx[^"']*)["']/gi;
  for (const m of html.matchAll(re)) {
    const href = decodeHtmlEntities(m[1]);
    if (SKIP_PATTERNS.some(r => r.test(href))) continue;
    try {
      const abs = new URL(href, baseUrl).toString();
      if (!abs.includes(`/${instance}/`)) continue;
      // strip query string
      const clean = abs.split("?")[0].split("#")[0];
      set.add(clean);
    } catch (_) { /* ignore */ }
  }
  return [...set];
}

async function fetchPage(url: string, cookies: Record<string, string>) {
  try {
    const r = await followRedirects(url, cookies);
    return { html: r.html, url: r.url, cookies: r.cookies };
  } catch (e: any) {
    return { html: "", url, cookies, error: e.message };
  }
}

async function probeAsmx(url: string, cookies: Record<string, string>, referer: string) {
  const payloads = [{}, { filter: "" }, { pageSize: 5, pageNumber: 1 }];
  for (const body of payloads) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Cookie: formatCookies(cookies),
          "User-Agent": BROWSER_UA,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json, text/javascript, */*; q=0.01",
          Referer: referer,
          Origin: new URL(url).origin,
        },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      if (resp.status !== 200 || text.length < 5) continue;
      let data: any;
      try { data = JSON.parse(text); } catch { continue; }
      if (data?.d !== undefined) data = typeof data.d === "string" ? JSON.parse(data.d) : data.d;
      let rows = data;
      if (!Array.isArray(rows)) {
        for (const k of ["Items", "data", "results", "Rows", "Data", "SubSystems"]) {
          if (rows?.[k] && Array.isArray(rows[k])) { rows = rows[k]; break; }
        }
      }
      if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === "object") {
        return { fields: Object.keys(rows[0]), sample: rows[0], count: rows.length, payload: body };
      }
      if (typeof data === "object" && data !== null) {
        return { fields: Object.keys(data), sample: data, count: 0, payload: body };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTs = Date.now();
  const url = new URL(req.url);
  const maxPagesPerProject = parseInt(url.searchParams.get("max_pages") || "12", 10);
  const projectFilter = url.searchParams.get("project"); // optional substring match
  const probeAsmxFlag = url.searchParams.get("probe_asmx") !== "false";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { portalUrl, username, password } = await getGoCompletionsCredentials(supabase);

    const parsed = new URL(portalUrl);
    const instance = parsed.pathname.split("/").filter(Boolean)[0] || "BGC";

    console.log(`[discover] login as ${username} → ${portalUrl}`);
    const login = await loginGoCompletions(portalUrl, username, password);
    let cookies = login.cookies;

    const allTiles = extractAllProjectTiles(login.homePageHtml);
    const tiles: ProjectTile[] = projectFilter
      ? allTiles.filter(t => t.name.toLowerCase().includes(projectFilter.toLowerCase()))
      : allTiles;

    console.log(`[discover] ${tiles.length}/${allTiles.length} tiles to crawl`);

    const projectReports: { name: string; pages: PageReport[] }[] = [];
    const asmxReports: Record<string, any> = {};

    for (const tile of tiles) {
      console.log(`[discover] === project ${tile.name} ===`);
      const pages: PageReport[] = [];
      try {
        const sel = await selectProjectTile(cookies, login.homePageHtml, login.homePageUrl, tile);
        cookies = sel.cookies;
        let landingHtml = sel.responseHtml;
        let landingUrl = sel.responseUrl;

        const visited = new Set<string>();
        const queue: string[] = [landingUrl];

        // Seed with common known pages
        const origin = parsed.origin;
        const seeds = [
          `${origin}/${instance}/GoHub/ReferenceTables/ReferenceTables.aspx`,
          `${origin}/${instance}/GoCompletions/Completions/CompletionsGrid.aspx`,
          `${origin}/${instance}/GoCompletions/SystemCompletion.aspx`,
          `${origin}/${instance}/GoHub/Reports/ReportFilters.aspx`,
          `${origin}/${instance}/GoHub/Default.aspx`,
        ];
        for (const s of seeds) queue.push(s);

        // Discover more from landing
        const landingLinks = extractInternalLinks(landingHtml, landingUrl, instance);
        for (const l of landingLinks) queue.push(l);

        let processed = 0;
        while (queue.length && processed < maxPagesPerProject) {
          const pageUrl = queue.shift()!;
          if (visited.has(pageUrl)) continue;
          visited.add(pageUrl);
          processed++;

          const r = await fetchPage(pageUrl, cookies);
          cookies = r.cookies;
          if (r.error || !r.html) {
            pages.push({ project: tile.name, url: pageUrl, title: "", tables: [], asmxEndpoints: [], links: [], error: r.error });
            continue;
          }
          if (r.html.includes("ApplicationLogin")) {
            // session lost – relogin
            const re = await loginGoCompletions(portalUrl, username, password);
            cookies = re.cookies;
            const sel2 = await selectProjectTile(cookies, re.homePageHtml, re.homePageUrl, tile);
            cookies = sel2.cookies;
            const r2 = await fetchPage(pageUrl, cookies);
            cookies = r2.cookies;
            if (!r2.html || r2.html.includes("ApplicationLogin")) continue;
            r.html = r2.html; r.url = r2.url;
          }

          const tables = extractAllTables(r.html);
          const asmxEndpoints = extractAsmxEndpoints(r.html, r.url);
          const links = extractInternalLinks(r.html, r.url, instance);
          const title = extractTitle(r.html);

          pages.push({ project: tile.name, url: pageUrl, title, tables, asmxEndpoints, links });
          console.log(`  [${processed}/${maxPagesPerProject}] ${title || pageUrl.split("/").pop()} — ${tables.length} table(s), ${asmxEndpoints.length} asmx`);

          // enqueue new links (but cap)
          for (const l of links) if (!visited.has(l) && queue.length < maxPagesPerProject * 3) queue.push(l);
          // If this is the ReferenceTables index, expand every list page
          if (/ReferenceTables/i.test(pageUrl)) {
            const refs = extractReferenceListPaths(r.html, r.url);
            for (const l of refs) if (!visited.has(l)) queue.push(l);
            console.log(`     reference tables expanded: ${refs.length} list pages queued`);
          }

          // probe asmx (deduped globally)
          if (probeAsmxFlag) {
            for (const ep of asmxEndpoints) {
              if (asmxReports[ep] !== undefined) continue;
              if (!/\/[A-Za-z0-9_]+$/.test(ep)) continue; // need explicit method
              const probed = await probeAsmx(ep, cookies, r.url);
              asmxReports[ep] = probed || { fields: [], sample: null, count: 0 };
              console.log(`     asmx ${ep} → ${probed ? probed.fields.length + " fields" : "no data"}`);
            }
          }
        }
      } catch (e: any) {
        console.error(`[discover] ${tile.name} error:`, e.message);
        pages.push({ project: tile.name, url: "", title: "", tables: [], asmxEndpoints: [], links: [], error: e.message });
      }
      projectReports.push({ name: tile.name, pages });
    }

    // ─── Build markdown reference ─────────────────────────────
    const md: string[] = [];
    md.push(`# GoCompletions Live Schema Reference`);
    md.push(`_Auto-generated by gohub-discover on ${new Date().toISOString()}_`);
    md.push(`_Instance: \`${instance}\` · Projects crawled: ${projectReports.length} · Pages/project cap: ${maxPagesPerProject}_\n`);

    md.push(`## Project Tiles\n`);
    for (const p of projectReports) md.push(`- **${p.name}** — ${p.pages.length} pages crawled`);

    // Aggregate unique pages by path
    const pageByPath = new Map<string, { title: string; tables: { headers: string[]; sampleRows: Record<string,string>[] }[]; projects: Set<string>; asmx: Set<string> }>();
    for (const p of projectReports) {
      for (const pg of p.pages) {
        if (!pg.url) continue;
        const key = new URL(pg.url).pathname.split(`/${instance}/`)[1] || pg.url;
        const existing = pageByPath.get(key) || { title: pg.title, tables: pg.tables, projects: new Set(), asmx: new Set() };
        existing.projects.add(p.name);
        for (const a of pg.asmxEndpoints) existing.asmx.add(a);
        if (!existing.tables.length && pg.tables.length) existing.tables = pg.tables;
        if (!existing.title && pg.title) existing.title = pg.title;
        pageByPath.set(key, existing);
      }
    }

    md.push(`\n## Pages & Tables\n`);
    for (const [path, info] of [...pageByPath.entries()].sort()) {
      md.push(`### \`${path}\``);
      if (info.title) md.push(`**${info.title}**`);
      md.push(`Available in: ${[...info.projects].join(", ")}`);
      if (info.tables.length === 0) {
        md.push(`_No data tables detected._`);
      } else {
        for (let i = 0; i < info.tables.length; i++) {
          const t = info.tables[i];
          md.push(`\n**Table ${i + 1} — fields (${t.headers.length}):**`);
          md.push(t.headers.map(h => `\`${h}\``).join(" · "));
          if (t.sampleRows.length) {
            md.push(`\nSample row:`);
            md.push("```json");
            md.push(JSON.stringify(t.sampleRows[0], null, 2));
            md.push("```");
          }
        }
      }
      if (info.asmx.size) {
        md.push(`\n_ASMX endpoints referenced:_`);
        for (const a of info.asmx) md.push(`- \`${a.replace(parsed.origin, "")}\``);
      }
      md.push("");
    }

    md.push(`\n## ASMX WebMethod Schemas\n`);
    for (const [ep, info] of Object.entries(asmxReports).sort()) {
      md.push(`### \`${ep.replace(parsed.origin, "")}\``);
      if (!info.fields?.length) {
        md.push(`_No fields discovered (endpoint may need authenticated POST or specific args)._`);
      } else {
        md.push(`Fields (${info.fields.length}): ${info.fields.map((f: string) => `\`${f}\``).join(" · ")}`);
        if (info.sample) {
          md.push(`\nSample:`);
          md.push("```json");
          md.push(JSON.stringify(info.sample, null, 2).slice(0, 1500));
          md.push("```");
        }
      }
      md.push("");
    }

    const markdown = md.join("\n");
    const elapsedMs = Date.now() - startTs;

    // Persist to storage so we can iterate without re-running
    try {
      const bucket = "gohub-schema";
      await supabase.storage.createBucket(bucket, { public: false }).catch(() => {});
      const path = `discover-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
      await supabase.storage.from(bucket).upload(path, new Blob([markdown], { type: "text/markdown" }), { upsert: true });
      await supabase.storage.from(bucket).upload("latest.md", new Blob([markdown], { type: "text/markdown" }), { upsert: true });
    } catch (e) {
      console.warn("[discover] storage upload failed:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      elapsed_ms: elapsedMs,
      instance,
      projects: projectReports.map(p => ({ name: p.name, pages: p.pages.length })),
      pages_unique: pageByPath.size,
      asmx_endpoints: Object.keys(asmxReports).length,
      markdown_chars: markdown.length,
      markdown,
    }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[discover] fatal:", e);
    return new Response(JSON.stringify({ success: false, error: e.message, stack: e.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
