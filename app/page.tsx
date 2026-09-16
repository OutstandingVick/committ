import Image from 'next/image';
import { WalletConnection } from '../components/WalletConnection';

const stages = [
  ['01', 'Read', 'The agent reads every public repo you own the moment GitHub connects.'],
  ['02', 'Reason', 'It picks the repo that is ready to go onchain, on its own.'],
  ['03', 'Ship', 'It drafts a ClawPump token identity and, when you fund it, launches the token.'],
] as const;

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Committ home">
          <Image className="wordmark-mark" src="/commit.png" alt="" aria-hidden="true" width={31} height={31} />
          <span>committ</span>
        </a>
        <div className="network-pill"><span /> Solana mainnet</div>
        <div className="header-actions">
          <a className="header-link" href="/launch">Agent mode →</a>
          <a className="header-link" href="https://github.com/OutstandingVick/committ">Source ↗</a>
          <WalletConnection />
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Web2 → Solana</span><span>Developer onboarding, run by an agent</span></div>
        <h1>An agent that ships<br /><em>your repo onchain.</em></h1>
        <p className="hero-copy">
          Committ is an agent for Solana developer onboarding. Connect your GitHub account and a
          wallet, and it reads every public repo you own, works out which one is ready to go onchain,
          and drafts and launches a ClawPump token for it, all on its own.
        </p>

        <a className="cta-button" href="/launch">Open agent mode →</a>

        <div className="proof-row" aria-label="Product safeguards">
          <span>ClawPump-powered launches</span>
          <span>Wallet-owned signing</span>
          <span>You confirm every spend</span>
        </div>
      </section>

      <section className="process-section" aria-labelledby="process-title">
        <div className="section-kicker">How the agent works</div>
        <div className="process-heading">
          <h2 id="process-title">Connect once.<br />Chain evidence out.</h2>
          <p>No custom programs, ever. Committ hands every launch and trade to ClawPump’s own audited tools, and does it for every repo you own, not just one you type in.</p>
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
