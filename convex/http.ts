import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// AgentMail webhook — fires on "message.received" events
// Webhook registered at: https://optimistic-armadillo-182.convex.site/agentmail-webhook
// Actual payload shape (from AgentMail SDK types):
// {
//   type: "event",
//   event_type: "message.received",
//   event_id: "...",
//   message: {
//     inbox_id: "forage-mfg@agentmail.to",
//     from: "vendor@company.com",
//     to: [...],
//     subject: "Re: Sourcing inquiry...",
//     text: "...",
//     html: "...",
//     in_reply_to: "...",
//   },
//   thread: { ... }
// }
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

    // Only process message.received events
    if (body.event_type !== "message.received") {
      return new Response("OK", { status: 200 });
    }

    const message = body.message as {
      inbox_id?: string;
      from?: string;
      subject?: string;
      text?: string;
      html?: string;
      extracted_text?: string;
    } | undefined;

    if (!message?.inbox_id) {
      return new Response("Missing message.inbox_id", { status: 400 });
    }

    const fromEmail = message.from ?? "";
    const subject = message.subject ?? "(no subject)";
    // Prefer extracted_text (cleaned) over raw text/html
    const bodyText = message.extracted_text ?? message.text ?? message.html ?? "";

    await ctx.runAction(api.actions.agentmail.handleInboundEmail, {
      inboxId: message.inbox_id,
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
