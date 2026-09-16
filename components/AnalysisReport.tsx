import type { AnalysisResult } from '../src/domain/committ';
import { AgentLog } from './AgentLog';

export function AnalysisReport({ result }: { result: AnalysisResult }) {
  const confidence = Math.round(result.classification.confidence * 100);
  return (
    <section className="analysis-report" aria-labelledby="analysis-title">
      <div className="report-topline">
        <span>Analysis {result.analysisId.slice(0, 8)}</span>
        <span>{confidence}% confidence</span>
      </div>
      <div className="report-heading">
        <div>
          <p className="report-kicker">ClawPump token draft</p>
          <h2 id="analysis-title">{result.tokenLaunch.name} · ${result.tokenLaunch.ticker}</h2>
        </div>
        <span className="template-badge">Powered by ClawPump</span>
      </div>
      <p className="report-summary">{result.classification.summary}</p>

      <div className="evidence-grid">
        {result.classification.evidence.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="repo-facts">
        <span>{result.snapshot.repo.owner}/{result.snapshot.repo.name}</span>
        <span>{result.snapshot.primaryLanguage ?? 'Language unknown'}</span>
        <span>{result.snapshot.files.length} safe files read</span>
        <span>{result.snapshot.truncated ? 'Read budget reached' : 'Within read budget'}</span>
      </div>
      <AgentLog entries={result.logs} />
    </section>
  );
}
