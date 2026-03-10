'use client'

interface TableData {
  headers: string[]
  rows: Record<string, string>[]
}

export default function ComparisonTable({ data }: { data: TableData }) {
  if (!data?.headers?.length || !data?.rows?.length) return null

  return (
    <>
      {/* Desktop: scrollable table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0f4c81] text-white">
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-left font-semibold whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-[#0f4c81] z-10' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {data.headers.map((h, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-3 border-t border-gray-100 ${ci === 0 ? 'sticky left-0 font-semibold text-[#1a1a2e] z-10 ' + (ri % 2 === 0 ? 'bg-white' : 'bg-gray-50') : 'text-gray-600'}`}
                  >
                    {row[h] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card-based layout */}
      <div className="md:hidden space-y-4">
        {data.rows.map((row, ri) => (
          <div key={ri} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-bold text-[#0f4c81] mb-3 pb-2 border-b border-gray-100">
              {row[data.headers[0]] || `#${ri + 1}`}
            </h4>
            <dl className="space-y-2 text-sm">
              {data.headers.slice(1).map((h, ci) => (
                <div key={ci} className="flex justify-between gap-2">
                  <dt className="text-gray-400 flex-shrink-0">{h}</dt>
                  <dd className="text-right text-[#1a1a2e] font-medium">{row[h] || '-'}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  )
}
