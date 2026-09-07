import type { AgentLog as LogEntry } from '../src/domain/committ';

export function AgentLog({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="agent-log" aria-label="Agent activity">
      <div className="agent-log-title"><span>Agent activity</span><span>Plain-language proof</span></div>
      <ol>
        {entries.map((entry, index) => (
          <li key={`${entry.step}-${index}`} className={entry.status}>
            <span className="log-marker" aria-hidden="true">{entry.status === 'complete' ? '✓' : '○'}</span>
            <div><strong>{entry.step}</strong><p>{entry.message}</p></div>
            <time>{entry.elapsedMs} ms</time>
          </li>
        ))}
      </ol>
    </div>
  );
}
