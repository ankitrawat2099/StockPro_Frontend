export default function DataTable({ columns, rows, emptyMessage = "No records found." }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-ink-100">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100 text-sm">
          <thead className="bg-ink-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-ink-500"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 bg-white">
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.id || row.key || index} className="align-top">
                  {columns.map((column) => (
                    <td key={column.label} className="px-4 py-4 text-ink-700">
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-8 text-center text-ink-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
