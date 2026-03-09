import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../api';
import { useStore } from '../store';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const setAuth = useStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = isRegister
        ? await api.register({ username, password, displayName: displayName || undefined })
        : await api.login({ username, password });
      setAuth(result.user, result.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-zinc-900 mb-1">agent-board</h1>
        <p className="text-sm text-zinc-400 mb-8">
          {isRegister ? 'Create an account' : 'Sign in to your account'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
            required
          />
          {isRegister && (
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? '...' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!isRegister && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-xs text-zinc-400">or</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
            <button
              type="button"
              disabled={passkeyLoading}
              onClick={async () => {
                setError('');
                setPasskeyLoading(true);
                try {
                  const { options, storeKey } = await api.passkeyLoginOptions(username || undefined);
                  const credential = await startAuthentication({ optionsJSON: options });
                  const result = await api.passkeyLoginVerify({ storeKey, credential });
                  setAuth(result.user, result.token);
                } catch (err: any) {
                  setError(err.message || 'Passkey authentication failed');
                } finally {
                  setPasskeyLoading(false);
                }
              }}
              className="w-full py-2 border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              {passkeyLoading ? '...' : 'Sign in with Passkey'}
            </button>
          </>
        )}

        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
          className="mt-4 text-sm text-zinc-400 hover:text-zinc-600"
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
