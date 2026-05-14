import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

/**
 * hourly-task-fetcher
 * Called by pg_cron every hour (via cron-proxy).
 *
 * Responsibilities:
 *   1. Query pending/in-progress tasks from the tasks table
 *   2. Check for tasks eligible for auto-advance (stale stages)
 *   3. Send a structured heartbeat to Eliza-Cloud via eliza-relay
 *   4. Optionally dispatch tasks to the local relay (Eliza-Dev)
 *   5. Log execution to cron_execution_log table
 *
 * Flow: pg_cron → cron-proxy → hourly-task-fetcher
 *
 * POST /functions/v1/hourly-task-fetcher
 * Body: { "dry_run": false, "notify_eliza": true }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const notifyEliza = body.notify_eliza !== false;

    console.log(`⏰ hourly-task-fetcher triggered${dryRun ? " (DRY RUN)" : ""}`);

    // ──────────────────────────────────────────────────
    // 1. Count tasks by status and priority
    // ──────────────────────────────────────────────────
    const { data: taskCounts, error: countError } = await supabase
      .from("tasks")
      .select("status, priority, id", { count: "exact", head: false });

    if (countError) {
      console.error("Failed to query tasks:", countError.message);
      throw countError;
    }

    const counts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    let totalPending = 0;
    let staleTasks = 0;

    for (const task of taskCounts || []) {
      const status = task.status || "UNKNOWN";
      counts[status] = (counts[status] || 0) + 1;
      if (status === "PENDING" || status === "IN_PROGRESS") {
        totalPending++;
        const p = String(task.priority || 5);
        priorityCounts[p] = (priorityCounts[p] || 0) + 1;
      }
    }

    // ──────────────────────────────────────────────────
    // 2. Find stale tasks (in a stage for too long)
    // ──────────────────────────────────────────────────
    const staleThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(); // 4 hours

    const { data: staleTasksData, error: staleError } = await supabase
      .from("tasks")
      .select("id, title, stage, stage_started_at, priority, status")
      .in("status", ["PENDING", "IN_PROGRESS"])
      .not("stage_started_at", "is", null)
      .lt("stage_started_at", staleThreshold)
      .order("priority", { ascending: false })
      .limit(20);

    if (staleError) {
      console.warn("Failed to query stale tasks:", staleError.message);
    }

    const staleList = staleTasksData || [];
    staleTasks = staleList.length;

    // ──────────────────────────────────────────────────
    // 3. Get pending high-priority tasks (for dispatching)
    // ──────────────────────────────────────────────────
    const { data: highPriorityTasks, error: hpError } = await supabase
      .from("tasks")
      .select("id, title, description, stage, priority, agent, metadata, created_at")
      .eq("status", "PENDING")
      .gte("priority", 5)
      .order("priority", { ascending: false })
      .limit(10);

    if (hpError) {
      console.warn("Failed to query high-priority tasks:", hpError.message);
    }

    // ──────────────────────────────────────────────────
    // 4. Determine which tasks should go to Eliza-Dev relay
    // ──────────────────────────────────────────────────
    const elizaDevTasks = (highPriorityTasks || []).filter(
      (t) => !t.agent || t.agent === "eliza-dev" || t.agent === "relay"
    );

    // ──────────────────────────────────────────────────
    // 5. Notify Eliza-Cloud via eliza-relay (if not dry run)
    // ──────────────────────────────────────────────────
    let notificationResult = null;

    if (notifyEliza && !dryRun) {
      const message = buildHeartbeatMessage(counts, priorityCounts, staleList, elizaDevTasks);

      try {
        const relayRes = await fetch(
          `${supabaseUrl}/functions/v1/eliza-relay`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: "send",
              message,
              relay_tag: `hourly-cron-${Date.now().toString(36)}`,
              agent_name: "HourlyCron",
              metadata: {
                source: "hourly-task-fetcher",
                task_counts: counts,
                stale_count: staleTasks,
                high_priority_count: elizaDevTasks.length,
                dry_run: dryRun,
              },
            }),
          }
        );

        if (relayRes.ok) {
          notificationResult = await relayRes.json();
          console.log("✅ Notification sent to Eliza-Cloud");
        } else {
          const errText = await relayRes.text();
          console.warn("⚠️ eliza-relay returned:", relayRes.status, errText.slice(0, 200));
          notificationResult = { error: `HTTP ${relayRes.status}` };
        }
      } catch (e) {
        console.warn("⚠️ Failed to notify Eliza-Cloud:", e.message);
        notificationResult = { error: e.message };
      }
    }

    // ──────────────────────────────────────────────────
    // 6. Optionally call task-auto-advance for stale tasks
    // ──────────────────────────────────────────────────
    let autoAdvanceResult = null;

    if (staleTasks > 0 && !dryRun) {
      try {
        const aaRes = await fetch(
          `${supabaseUrl}/functions/v1/task-auto-advance`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ action: "auto_advance" }),
          }
        );

        if (aaRes.ok) {
          autoAdvanceResult = await aaRes.json();
          console.log("✅ Auto-advance completed");
        }
      } catch (e) {
        console.warn("⚠️ auto-advance failed:", e.message);
      }
    }

    // ──────────────────────────────────────────────────
    // 7. Try to notify local Eliza-Dev relay (best-effort)
    // ──────────────────────────────────────────────────
    let localRelayResult = null;

    if (elizaDevTasks.length > 0 && !dryRun) {
      const relayUrl = Deno.env.get("LOCAL_RELAY_URL") || "http://192.168.14.164:8080";
      try {
        const localRes = await fetch(`${relayUrl}/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `[HourlyCron] ${elizaDevTasks.length} task(s) pending for local relay. Highest priority: ${elizaDevTasks[0]?.title || "none"}`,
            source: "hourly-cron",
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (localRes.ok) {
          localRelayResult = await localRes.json();
          console.log("✅ Local relay notified");
        }
      } catch (e) {
        // Local relay might be offline — that's fine
        console.log("ℹ️ Local relay unreachable:", e.message.slice(0, 80));
      }
    }

    // ──────────────────────────────────────────────────
    // 8. Log execution
    // ──────────────────────────────────────────────────
    const duration = Date.now() - startTime;

    if (!dryRun) {
      try {
        await supabase.from("cron_execution_log").insert({
          function_name: "hourly-task-fetcher",
          schedule: "hourly",
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          status: "completed",
          summary: {
            task_counts: counts,
            total_pending: totalPending,
            stale_tasks: staleTasks,
            high_priority_count: highPriorityTasks?.length || 0,
            notified_eliza: !!notificationResult,
            local_relay_reachable: !!localRelayResult,
            auto_advanced: !!autoAdvanceResult,
          },
        });
      } catch (e) {
        console.warn("⚠️ Failed to log execution:", e.message);
      }
    }

    // ──────────────────────────────────────────────────
    // 9. Return results
    // ──────────────────────────────────────────────────
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      dry_run: dryRun,
      summary: {
        task_counts: counts,
        total_pending: totalPending,
        stale_tasks: staleTasks,
        high_priority_tasks: (highPriorityTasks || []).map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          stage: t.stage,
        })),
      },
      actions_taken: {
        notified_eliza_cloud: !!notificationResult,
        eliza_cloud_response: notificationResult?.reply?.slice(0, 200) || null,
        called_auto_advance: !!autoAdvanceResult,
        auto_advance_result: autoAdvanceResult?.updated
          ? `${autoAdvanceResult.updated} tasks updated`
          : null,
        notified_local_relay: !!localRelayResult,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ hourly-task-fetcher error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Build a structured heartbeat message for Eliza-Cloud
 */
function buildHeartbeatMessage(
  counts: Record<string, number>,
  priorityCounts: Record<string, number>,
  staleTasks: any[],
  highPriorityTasks: any[]
): string {
  const lines: string[] = [];
  lines.push(`⏰ **Hourly Cron — Task Status Report**`);
  lines.push(``);

  // Task counts
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  lines.push(`**Tasks:** ${total} total`);
  for (const [status, count] of Object.entries(counts)) {
    lines.push(`  - ${status}: ${count}`);
  }
  lines.push(``);

  // Priority breakdown
  if (Object.keys(priorityCounts).length > 0) {
    lines.push(`**Pending by priority:**`);
    const sorted = Object.entries(priorityCounts).sort(([a], [b]) => Number(b) - Number(a));
    for (const [priority, count] of sorted) {
      const stars = "⭐".repeat(Math.min(Number(priority), 5));
      lines.push(`  P${priority} ${stars}: ${count}`);
    }
    lines.push(``);
  }

  // Stale tasks
  if (staleTasks.length > 0) {
    lines.push(`**⚠️ Stale tasks (${staleTasks.length}):**`);
    for (const task of staleTasks.slice(0, 5)) {
      const hoursStale = Math.round(
        (Date.now() - new Date(task.stage_started_at).getTime()) / 3600000
      );
      lines.push(`  - [P${task.priority}] "${task.title}" — ${hoursStale}h in ${task.stage}`);
    }
    if (staleTasks.length > 5) {
      lines.push(`  ... and ${staleTasks.length - 5} more`);
    }
    lines.push(``);
  }

  // High-priority tasks for Eliza-Dev
  if (highPriorityTasks.length > 0) {
    lines.push(`**🎯 Tasks needing local relay attention:**`);
    for (const task of highPriorityTasks.slice(0, 5)) {
      lines.push(`  - [P${task.priority}] "${task.title}"`);
    }
    if (highPriorityTasks.length > 5) {
      lines.push(`  ... and ${highPriorityTasks.length - 5} more`);
    }
  }

  if (staleTasks.length === 0 && highPriorityTasks.length === 0) {
    lines.push(`✅ No pending or stale tasks. All clear.`);
  }

  lines.push(``);
  lines.push(`_Next check in ~60 minutes._`);

  return lines.join("\n");
}
