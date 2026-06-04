# Selma V12 captured Assai fixtures (READ-ONLY)

Committed snapshots of real Assai responses. Used by `search-engine.test.ts`
to lock the `classifyResponse` / `parseDocuments` / `mapFormFields` contract.

**Do not let any capture script write into this directory.** The
`selma-capture-fixtures` edge function only RETURNS captured HTML in its JSON
response body — it does NOT write to disk. To refresh a fixture, invoke the
function, then copy the relevant entry's `full` field into the file by hand
(or via a one-off script that writes to a scratch path you then `mv` in).
