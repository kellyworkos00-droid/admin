import { listAuditEvents } from "@/lib/audit";

type AuditPageProps = {
  searchParams?: {
    action?: string;
    entity?: string;
  };
};

function tryFormatMetadata(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
  const action = searchParams?.action?.trim() || undefined;
  const entityType = searchParams?.entity?.trim() || undefined;

  const events = await listAuditEvents({
    action,
    entityType,
    limit: 100,
  });

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
        <p className="mt-1 text-sm text-gray-600">Track all sensitive admin changes for products, orders, promos, content, and users.</p>
      </section>

      <section className="admin-card">
        <form className="grid gap-3 md:grid-cols-3">
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="Action (e.g. ORDER_STATUS_UPDATED)"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="entity"
            defaultValue={entityType ?? ""}
            placeholder="Entity (e.g. order, product)"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 md:w-fit"
          >
            Filter Logs
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {events.map((event) => (
          <article key={event.id} className="admin-card">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">{event.action}</span>
              <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">{event.entityType}</span>
              <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">{event.actorRole}</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">{event.channel}</span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
              <p><span className="font-semibold">Actor:</span> {event.actor}</p>
              <p><span className="font-semibold">Time:</span> {new Date(event.createdAt).toLocaleString()}</p>
              <p><span className="font-semibold">Entity ID:</span> {event.entityId ?? "-"}</p>
            </div>

            <details className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-gray-800">Metadata</summary>
              <pre className="mt-2 overflow-auto text-xs text-gray-700">{tryFormatMetadata(event.metadata)}</pre>
            </details>
          </article>
        ))}

        {events.length === 0 ? (
          <section className="admin-card text-sm text-gray-600">No audit events found for this filter.</section>
        ) : null}
      </section>
    </main>
  );
}
