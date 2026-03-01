import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// AgentMail webhook — called when a vendor replies to an email
http.route({
  path: "/agentmail-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // AgentMail sends: { inbox_id, message: { from, subject, text, html } }
    const inboxId = body.inbox_id as string;
    const message = body.message as {
      from?: string;
      subject?: string;
      text?: string;
      html?: string;
    };

    if (!inboxId || !message) {
      return new Response("Missing fields", { status: 400 });
    }

    // Find vendor by agentmailInboxId
    const vendors = await ctx.runQuery(api.vendors.listByUser, {
      userId: "placeholder" as Id<"users">, // will be replaced with actual lookup
    });

    // TODO: add a listByInboxId query — for now, search manually
    // This is a stub that will be wired up properly
    console.log("AgentMail webhook received:", { inboxId, message });

    return new Response("OK", { status: 200 });
  }),
});

// Health check
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
