import type { ReactNode } from 'react'

export interface TooltipRow {
  label: string
  value: string
  color?: string
}

/**
 * Shared tooltip body. Recharts' default is a light card with raw dataKey
 * names, which neither matches the dark surface nor reads as human language.
 */
export function ChartTooltip({ title, rows }: { title: ReactNode; rows: TooltipRow[] }) {
  return (
    <div className="glass bevel rounded-xl px-3.5 py-2.5 text-sm shadow-xl">
      <p className="font-medium text-fg">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-fg-muted">
            {row.color ? (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span>{row.label}</span>
            <span className="tabular ml-auto pl-4 font-medium text-fg">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
