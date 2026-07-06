import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { GLOSSARY } from "@/data/glossary";

export default defineTool({
  name: "search_glossary",
  title: "Search ORSH glossary",
  description:
    "Search the ORSH platform glossary of operational-readiness acronyms and terms (ORA, VCR, PSSR, P2A, SoF, PAC, etc.). Returns matching term + definition pairs.",
  inputSchema: {
    query: z
      .string()
      .min(1)
      .describe("Term, acronym or keyword to search for (case-insensitive substring match)."),
    limit: z
      .number()
      .int()
      .describe("Max results to return (1–50, default 10).")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const q = query.trim().toLowerCase();
    const cap = Math.max(1, Math.min(50, limit ?? 10));
    const hits = Object.entries(GLOSSARY)
      .filter(
        ([term, def]) =>
          term.toLowerCase().includes(q) || def.toLowerCase().includes(q),
      )
      .slice(0, cap)
      .map(([term, definition]) => ({ term, definition }));

    if (hits.length === 0) {
      return {
        content: [{ type: "text", text: `No glossary matches for "${query}".` }],
        structuredContent: { query, results: [] },
      };
    }

    const text = hits.map((h) => `${h.term} — ${h.definition}`).join("\n\n");
    return {
      content: [{ type: "text", text }],
      structuredContent: { query, results: hits },
    };
  },
});
