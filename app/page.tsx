import { RepoAnalyzer } from '../components/RepoAnalyzer';
import { WalletConnection } from '../components/WalletConnection';

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
          <img src="/committ-logo.svg" alt="" width="151" height="37" />
        </a>
        <div className="network-pill"><span /> Solana devnet</div>
        <div className="header-actions">
          <a className="header-link" href="https://github.com/OutstandingVick/committ">Source ↗</a>
          <WalletConnection />
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Web2 → Solana</span><span>Under 60 seconds</span></div>
        <h1>Ship the useful part<br /><em>onchain.</em></h1>
        <p className="hero-copy">
          Paste a small GitHub project. Committ finds one feature that belongs on Solana,
          prepares an audited program, and gives you the proof.
        </p>

        <div className="hero-orbit" aria-hidden="true" />

        <RepoAnalyzer />

        <div className="proof-row" aria-label="Product safeguards">
          <span>Audited templates only</span>
          <span>Wallet-owned signing</span>
          <span>Devnet first</span>
        </div>
      </section>

      <div className="landing-continuation">
      <section className="process-section" aria-labelledby="process-title">
        <div className="section-kicker">How Committ Works</div>
        <div className="process-heading">
          <div>
            <span className="process-overline">The 60-second path</span>
            <h2 id="process-title">One link in.<br />Chain evidence out.</h2>
          </div>
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

      <section className="value-section" aria-labelledby="value-title">
        <div className="value-intro">
          <div>
            <span className="value-kicker">Why Committ</span>
            <h2 id="value-title">No generated Rust.</h2>
          </div>
          <p>Committ maps repository evidence to a small registry of reviewed programs.</p>
        </div>
        <ul className="value-points">
          <li>Audited templates only</li>
          <li>Wallet-owned signing</li>
          <li>Devnet first</li>
        </ul>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-title">
        <div className="cta-inner">
          <div>
            <h2 id="final-cta-title">Paste a small GitHub project.</h2>
            <p>Read-only. No cloning. No repository code is ever run.</p>
          </div>
          <a href="#repo-url">Analyze repo <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-atmosphere" aria-hidden="true">
          <span className="footer-speckle" />
          <span className="footer-orbit-line" />
        </div>
        <div className="footer-frame">
          <div className="footer-brand">
            <a href="#top" aria-label="Committ home"><img src="/committ-logo.svg" alt="" width="151" height="37" /></a>
            <span>Committ / developer onboarding as a product</span>
          </div>
          <span>Built for Solana</span>
        </div>
      </footer>
      </div>
    </main>
  );
}
