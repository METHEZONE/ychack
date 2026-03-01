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

    // AgentMail webhook payload: { eventType, message: { inboxId, from, subject, text, html, ... } }
    const event = body as {
      eventType?: string;
      message?: {
        inboxId?: string;
        from?: string;
        subject?: string;
        text?: string;
        html?: string;
      };
    };

    const inboxId = event.message?.inboxId;
    const message = event.message;

    if (!inboxId || !message) {
      return new Response("Missing message.inboxId or message", { status: 400 });
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
