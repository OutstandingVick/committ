import { RepoAnalyzer } from '../components/RepoAnalyzer';

const stages = [
  ['01', 'Read', 'A bounded, read-only look at the repository.'],
  ['02', 'Reason', 'Pick one useful on-chain primitive.'],
  ['03', 'Ship', 'Prepare an audited template for devnet.'],
] as const;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Committ home">
          <span className="wordmark-mark" aria-hidden="true">C</span>
          <span>committ</span>
        </a>
        <div className="network-pill"><span /> Solana devnet</div>
        <a className="header-link" href="https://github.com/OutstandingVick/committ">View source ↗</a>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Web2 → Solana</span><span>Under 60 seconds</span></div>
        <h1>Ship the useful part<br /><em>onchain.</em></h1>
        <p className="hero-copy">
          Paste a small GitHub project. Committ finds one feature that belongs on Solana,
          prepares an audited program, and gives you the proof.
        </p>

        <RepoAnalyzer />

        <div className="proof-row" aria-label="Product safeguards">
          <span>Audited templates only</span>
          <span>Wallet-owned signing</span>
          <span>Devnet first</span>
        </div>
      </section>

      <section className="process-section" aria-labelledby="process-title">
        <div className="section-kicker">The 60-second path</div>
        <div className="process-heading">
          <h2 id="process-title">One link in.<br />Chain evidence out.</h2>
          <p>No generated Rust. Committ maps repository evidence to a small registry of reviewed programs.</p>
        </div>
        <div className="stage-grid">
          {stages.map(([number, title, description]) => (
            <article className="stage-card" key={number}>
              <span className="stage-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>Committ / developer onboarding as a product</span>
        <span>Built for Solana</span>
      </footer>
    </main>
  );
}
