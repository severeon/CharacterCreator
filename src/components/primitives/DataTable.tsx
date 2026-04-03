interface DataTableProps {
  headers: string[]
  rows: unknown
}

export function DataTable({ headers, rows }: DataTableProps) {
  const rowArray: unknown[] = Array.isArray(rows) ? rows : []

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-600">
            {headers.map((h) => (
              <th key={h} className="text-left text-xs text-gray-400 uppercase py-1 pr-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowArray.map((row, i) => (
            <tr key={i} className="border-b border-gray-700 last:border-0">
              {Array.isArray(row)
                ? row.map((cell, j) => (
                    <td key={j} className="py-1 pr-3 text-gray-200">
                      {String(cell ?? '')}
                    </td>
                  ))
                : (
                  <td colSpan={headers.length} className="py-1 text-gray-200">
                    {String(row ?? '')}
                  </td>
                )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
