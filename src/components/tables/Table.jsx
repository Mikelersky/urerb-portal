export default function Table({ headers = [], children, className = '' }) {
  return (
    <div className={`overflow-x-auto border border-slate-200 rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-slate-200">
        {headers.length > 0 && (
          <thead className="bg-slate-50">
            <tr>
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {children}
        </tbody>
      </table>
    </div>
  );
}
