import Image from 'next/image';
import Link from 'next/link';
import { LaunchDashboard } from '../../components/LaunchDashboard';

export default function LaunchPage() {
  return (
    <main>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Committ home">
          <Image className="wordmark-mark" src="/commit.png" alt="" aria-hidden="true" width={31} height={31} />
          <span>committ</span>
        </Link>
        <div className="network-pill"><span /> Agent mode</div>
      </header>
      <LaunchDashboard />
    </main>
  );
}
