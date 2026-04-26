import { ReactNode } from 'react';

export interface DocsTableColumn<T> {
  key: keyof T | string;
  header: ReactNode;
  /** Custom cell renderer. If omitted, `row[key]` is rendered as-is. */
  render?: (row: T) => ReactNode;
  /** Tailwind classes applied to the <td>. */
  cellClassName?: string;
  /** Tailwind classes applied to the <th>. */
  headClassName?: string;
}

export interface DocsTableProps<T> {
  columns: DocsTableColumn<T>[];
  rows: T[];
  /** First column rendered bold (NVIDIA reference-table pattern). Default true. */
  boldFirstColumn?: boolean;
  caption?: ReactNode;
  className?: string;
}

/**
 * NVIDIA-style reference table:
 *  - light gray header row with accent bottom-border
 *  - thin hairline dividers between rows
 *  - bold first column for "name | description | ..." layouts
 *  - generous vertical padding
 */
export default function DocsTable<T extends Record<string, any>>({
  columns,
  rows,
  boldFirstColumn = true,
  caption,
  className = '',
}: DocsTableProps<T>) {
  return (
    <div className={`overflow-x-auto border border-[var(--border)] rounded-md ${className}`}>
      <table className="w-full text-[13.5px] border-collapse">
        {caption && (
          <caption className="text-left text-[12px] text-[var(--text-muted)] py-2 px-4">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="bg-[var(--bg-elevated)] border-b-2 border-[var(--border)]">
            {columns.map((col, i) => (
              <th
                key={String(col.key) + i}
                scope="col"
                className={`text-left font-semibold text-[var(--text-primary)] px-4 py-3 align-bottom ${
                  col.headClassName ?? ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri < rows.length - 1 ? 'border-b border-[var(--border)]' : ''}
            >
              {columns.map((col, ci) => {
                const isBold = boldFirstColumn && ci === 0;
                const value = col.render
                  ? col.render(row)
                  : (row as Record<string, ReactNode>)[col.key as string];
                return (
                  <td
                    key={String(col.key) + ci}
                    className={`px-4 py-3 align-top text-[var(--text-secondary)] ${
                      isBold ? 'font-semibold text-[var(--text-primary)]' : ''
                    } ${col.cellClassName ?? ''}`}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
