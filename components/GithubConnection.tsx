'use client';

import { useEffect, useState } from 'react';
import type { GithubSession } from '../src/domain/committ';
import { getJson, postJson } from '../src/lib/apiClient';
import { ConnectedBadge } from './ConnectedBadge';

export function GithubConnection({ onChange }: { onChange?: (session: GithubSession | null) => void }) {
  const [session, setSession] = useState<GithubSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getJson<{ session: GithubSession | null }>('/api/auth/session', 'Could not check GitHub sign-in.')
      .then((body) => {
        if (cancelled) return;
        setSession(body.session);
        onChange?.(body.session);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnect() {
    await postJson('/api/auth/logout', {}, 'Could not disconnect GitHub.').catch(() => null);
    setSession(null);
    onChange?.(null);
  }

  if (loading) {
    return <button className="wallet-button" disabled>Checking GitHub…</button>;
  }

  if (session) {
    return <ConnectedBadge label={session.login} onDisconnect={() => void disconnect()} />;
  }

  return <a className="wallet-button" href="/api/auth/github">Connect GitHub</a>;
}
