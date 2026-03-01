import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// AgentMail webhook — fires when a vendor replies to our email
// Register this URL in AgentMail dashboard: https://optimistic-armadillo-182.convex.site/agentmail-webhook
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

    // AgentMail webhook payload: { inbox_id, message: { from, subject, text, html } }
    const inboxId = body.inbox_id as string;
    const message = body.message as {
      from?: string;
      subject?: string;
      text?: string;
      html?: string;
    } | undefined;

    if (!inboxId || !message) {
      return new Response("Missing inbox_id or message", { status: 400 });
    }

    const fromEmail = message.from ?? "";
    const subject = message.subject ?? "(no subject)";
    const bodyText = message.text ?? message.html ?? "";

    await ctx.runAction(api.actions.agentmail.handleInboundEmail, {
      inboxId,
      fromEmail,
      subject,
      body: bodyText,
    });

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
