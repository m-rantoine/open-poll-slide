import { Navigate, useSearchParams } from 'react-router-dom';
import { useLocale } from '@/lib/use-locale';
import { AuthForm, LiveMessage, LoadingLine, useAuth } from './auth';
import { liveConfigured } from './client';

export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function LoginPage() {
  const t = useLocale();
  const { loading, session } = useAuth();
  const [params] = useSearchParams();
  if (!liveConfigured) {
    return <LiveMessage title={t.live.notConfiguredTitle} body={t.live.notConfiguredBody} />;
  }
  if (loading) return <LoadingLine />;
  if (session) return <Navigate to={safeNext(params.get('next'))} replace />;
  return <AuthForm heading={t.live.signIn} />;
}
