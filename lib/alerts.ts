type AlertSeverity = "info" | "warning" | "critical";

export async function sendAdminAlert(input: {
  title: string;
  severity?: AlertSeverity;
  actor?: string;
  source: "admin_ui" | "admin_api";
  details?: Record<string, unknown>;
}) {
  const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return;
  }

  const payload = {
    app: "eterna-admin",
    title: input.title,
    severity: input.severity ?? "info",
    actor: input.actor ?? "unknown",
    source: input.source,
    details: input.details ?? {},
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("[alerts] webhook returned non-OK status", response.status);
    }
  } catch (error) {
    console.error("[alerts] failed to send webhook", error);
  }
}
