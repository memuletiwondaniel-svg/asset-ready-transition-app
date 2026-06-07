import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle } from "lucide-react";
import { useIsAdminPermission } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";

type Status = "pass" | "fail" | "blocked" | "pending" | "error";

interface Result {
  id: string;
  name: string;
  status: Status;
  blockedBy?: string[];
  error?: string;
  durationMs?: number;
}

interface HarnessResponse {
  runId?: string;
  results?: Result[];
  teardown?: { status?: string; error?: string } | string | null;
  error?: string;
}

const statusClass = (s: Status) => {
  switch (s) {
    case "pass":
      return "text-green-600 dark:text-green-400 font-semibold";
    case "fail":
    case "error":
      return "text-red-600 dark:text-red-400 font-bold";
    case "blocked":
      return "text-amber-600 dark:text-amber-400 font-semibold";
    default:
      return "text-muted-foreground";
  }
};

const rowClass = (s: Status) => {
  if (s === "fail" || s === "error") return "bg-red-50 dark:bg-red-950/30";
  if (s === "blocked") return "bg-amber-50 dark:bg-amber-950/30";
  return "";
};

export default function HarnessRunner() {
  const { isAdmin, isLoading: permLoading } = useIsAdminPermission();
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<HarnessResponse | null>(null);
  const [invokeError, setInvokeError] = useState<string | null>(null);

  if (permLoading) {
    return (
      <div className="p-8 text-muted-foreground">Loading…</div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  const run = async () => {
    setRunning(true);
    setInvokeError(null);
    setData(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke("test-workflow-e2e", {
        body: { mode: "full" },
      });
      if (error) {
        setInvokeError(error.message || String(error));
      } else {
        setData(resp as HarnessResponse);
      }
    } catch (e: any) {
      setInvokeError(e?.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const results = data?.results ?? [];
  const summary = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { pass: 0, fail: 0, blocked: 0, pending: 0, error: 0 } as Record<Status, number>,
  );

  const teardown = data?.teardown;
  const teardownStatus =
    typeof teardown === "string"
      ? teardown
      : teardown && typeof teardown === "object"
      ? teardown.status || (teardown.error ? `error: ${teardown.error}` : JSON.stringify(teardown))
      : "—";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflow Harness Runner</h1>
          <p className="text-sm text-muted-foreground">
            Invokes <code>test-workflow-e2e</code> with mode <code>full</code> using your session JWT.
          </p>
        </div>
        <Button onClick={run} disabled={running} size="lg">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4" />
              Run workflow harness
            </>
          )}
        </Button>
      </div>

      {invokeError && (
        <div className="rounded-md border border-red-500 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300">
          <div className="font-bold">Invocation failed</div>
          <pre className="text-xs whitespace-pre-wrap mt-2">{invokeError}</pre>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              runId: <code className="font-mono">{data.runId ?? "—"}</code>
            </span>
            <span className="text-green-600 dark:text-green-400 font-semibold">
              {summary.pass} passed
            </span>
            <span className="text-red-600 dark:text-red-400 font-bold">
              {summary.fail + summary.error} failed
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {summary.blocked} blocked
            </span>
            {summary.pending > 0 && (
              <span className="text-muted-foreground">{summary.pending} pending</span>
            )}
            <span className="ml-auto">
              teardown:{" "}
              <code
                className={
                  String(teardownStatus).toLowerCase().includes("error")
                    ? "text-red-600 dark:text-red-400 font-bold"
                    : "text-foreground"
                }
              >
                {teardownStatus}
              </code>
            </span>
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 w-20">ID</th>
                  <th className="text-left p-2">Scenario</th>
                  <th className="text-left p-2 w-24">Status</th>
                  <th className="text-left p-2 w-20">ms</th>
                  <th className="text-left p-2">Blocked by / Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className={`border-t ${rowClass(r.status)}`}>
                    <td className="p-2 font-mono text-xs">{r.id}</td>
                    <td className="p-2">{r.name}</td>
                    <td className={`p-2 ${statusClass(r.status)}`}>{r.status.toUpperCase()}</td>
                    <td className="p-2 text-muted-foreground">{r.durationMs ?? 0}</td>
                    <td className="p-2 text-xs">
                      {r.error ? (
                        <span className="text-red-700 dark:text-red-300 whitespace-pre-wrap">
                          {r.error}
                        </span>
                      ) : r.blockedBy?.length ? (
                        <span className="text-amber-700 dark:text-amber-300">
                          {r.blockedBy.join(", ")}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No results returned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Raw response</summary>
            <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
