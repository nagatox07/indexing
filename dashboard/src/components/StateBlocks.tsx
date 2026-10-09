export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading">
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index}>
                <div className="skeleton" style={{ width: 70 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }, (_, columnIndex) => (
                <td key={columnIndex}>
                  <div className="skeleton" style={{ width: `${55 + ((rowIndex * 7 + columnIndex * 13) % 40)}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  onAction,
}: {
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="state">
      <h3>{title}</h3>
      <p>{message}</p>
      {action && onAction ? (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

/** Unauthorised responses get their own treatment: the fix is an API key. */
export function ErrorState({
  error,
  status,
  onRetry,
}: {
  error: string;
  status: number | null;
  onRetry: () => void;
}) {
  const unauthorised = status === 401 || status === 403;

  return (
    <div className="error-box" role="alert">
      <strong>{unauthorised ? "API key rejected" : status === 0 ? "API unreachable" : "Request failed"}</strong>
      <div>{error}</div>
      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}
