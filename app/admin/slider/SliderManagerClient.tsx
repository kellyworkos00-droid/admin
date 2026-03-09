"use client";

import { useMemo, useState } from "react";

type SliderManagerRow = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  isFeatured: boolean;
  sliderOrder: number;
  startAt: string | null;
  endAt: string | null;
};

type SliderConfigRow = {
  productId: string;
  isFeatured: boolean;
  sliderOrder: number;
  startAt: string | null;
  endAt: string | null;
};

type Props = {
  initialRows: SliderManagerRow[];
  saveAction: (formData: FormData) => Promise<void>;
};

export default function SliderManagerClient({ initialRows, saveAction }: Props) {
  const [rows, setRows] = useState<SliderManagerRow[]>(initialRows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const featuredRows = useMemo(
    () => rows.filter((row) => row.isFeatured).sort((a, b) => a.sliderOrder - b.sliderOrder),
    [rows]
  );

  const applyFeaturedOrdering = (allRows: SliderManagerRow[]) => {
    const featured = allRows.filter((item) => item.isFeatured);
    const featuredByOrder = [...featured].sort((a, b) => a.sliderOrder - b.sliderOrder);
    const orderMap = new Map(featuredByOrder.map((item, index) => [item.id, index + 1]));

    return allRows.map((row) =>
      row.isFeatured
        ? {
            ...row,
            sliderOrder: orderMap.get(row.id) ?? 999,
          }
        : { ...row, sliderOrder: 999 }
    );
  };

  const onToggleFeatured = (id: string, checked: boolean) => {
    setRows((prev) =>
      applyFeaturedOrdering(
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                isFeatured: checked,
                sliderOrder: checked ? row.sliderOrder || 999 : 999,
              }
            : row
        )
      )
    );
  };

  const onSetSchedule = (id: string, field: "startAt" | "endAt", value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value || null } : row)));
  };

  const onDragStart = (index: number) => setDragIndex(index);

  const onDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      return;
    }

    const reordered = [...featuredRows];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const newOrderMap = new Map(reordered.map((item, index) => [item.id, index + 1]));

    setRows((prev) =>
      prev.map((row) =>
        row.isFeatured
          ? {
              ...row,
              sliderOrder: newOrderMap.get(row.id) ?? row.sliderOrder,
            }
          : row
      )
    );

    setDragIndex(null);
  };

  const payload: SliderConfigRow[] = rows.map((row) => ({
    productId: row.id,
    isFeatured: row.isFeatured,
    sliderOrder: row.isFeatured ? row.sliderOrder : 999,
    startAt: row.startAt,
    endAt: row.endAt,
  }));

  return (
    <div className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Slider Manager</h2>
        <p className="mt-1 text-sm text-gray-600">Feature products manually, drag-and-drop featured order, and set schedule windows.</p>

        <form action={saveAction} className="mt-4">
          <input type="hidden" name="configJson" value={JSON.stringify(payload)} />
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
            Save Slider Configuration
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h3 className="text-base font-bold text-gray-900">Live Preview (Featured)</h3>
        {featuredRows.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No featured products selected.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featuredRows.map((row, index) => (
              <article key={row.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="h-28 bg-gray-100">
                  <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500">#{index + 1} in slider</p>
                  <p className="line-clamp-1 text-sm font-semibold text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500">{row.category}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows
          .slice()
          .sort((a, b) => (a.isFeatured === b.isFeatured ? a.sliderOrder - b.sliderOrder : Number(b.isFeatured) - Number(a.isFeatured)))
          .map((row) => {
            const featuredIndex = featuredRows.findIndex((item) => item.id === row.id);
            return (
              <article
                key={row.id}
                draggable={row.isFeatured}
                onDragStart={() => onDragStart(featuredIndex)}
                onDragOver={(event) => {
                  if (row.isFeatured) event.preventDefault();
                }}
                onDrop={() => {
                  if (row.isFeatured) onDrop(featuredIndex);
                }}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="grid gap-0 md:grid-cols-[160px_1fr]">
                  <div className="h-40 bg-gray-100 md:h-full">
                    <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" loading="lazy" />
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{row.category}</p>
                    <h3 className="mt-1 text-lg font-bold text-gray-900">{row.name}</h3>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={row.isFeatured}
                          onChange={(event) => onToggleFeatured(row.id, event.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Feature in slider
                      </label>

                      <label className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        Order
                        <input
                          type="number"
                          min="1"
                          value={row.isFeatured ? row.sliderOrder : 999}
                          disabled
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm disabled:bg-gray-100"
                        />
                      </label>

                      <label className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        Start at
                        <input
                          type="datetime-local"
                          value={row.startAt ?? ""}
                          onChange={(event) => onSetSchedule(row.id, "startAt", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        />
                      </label>

                      <label className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        End at
                        <input
                          type="datetime-local"
                          value={row.endAt ?? ""}
                          onChange={(event) => onSetSchedule(row.id, "endAt", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>

                    {row.isFeatured ? (
                      <p className="mt-3 text-xs font-semibold text-rose-700">Drag this card to reorder featured slides.</p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
      </section>
    </div>
  );
}
