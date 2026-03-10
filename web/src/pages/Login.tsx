import { useState, useCallback, useEffect } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { api } from '../api';
import { useStore } from '../store';
import { Logo } from '../components/Logo';

type RegistrationMode = 'human' | 'agent';

export function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyRequired, setPasskeyRequired] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const setAuth = useStore((s) => s.setAuth);

  // Captcha state
  const [regMode, setRegMode] = useState<RegistrationMode>('human');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const inputClass = 'w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100';

  const loadCaptcha = useCallback(async (mode: RegistrationMode) => {
    if (mode === 'agent') return; // Agent registration is CLI-only
    setCaptchaLoading(true);
    setCaptchaAnswer('');
    try {
      const result = await api.getCaptcha(mode);
      setCaptchaToken(result.token);
      setCaptchaSvg(result.svg || '');
      setCaptchaChallenge(result.challenge || '');
    } catch {
      setError('Failed to load captcha');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // Load captcha when switching to register mode or changing reg mode
  useEffect(() => {
    if (isRegister && regMode === 'human') {
      loadCaptcha('human');
    } else {
      setCaptchaToken('');
      setCaptchaSvg('');
      setCaptchaChallenge('');
      setCaptchaAnswer('');
    }
  }, [isRegister, regMode, loadCaptcha]);

  const checkUsername = useCallback(async (name: string) => {
    if (!name.trim() || isRegister) return;
    setCheckingUsername(true);
    try {
      const { hasPasskeys } = await api.checkUsername(name);
      setPasskeyRequired(hasPasskeys);
    } catch {
      setPasskeyRequired(false);
    } finally {
      setCheckingUsername(false);
    }
  }, [isRegister]);

  const handlePasskeyLogin = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If passkey required and not registering, trigger passkey flow instead
    if (passkeyRequired && !isRegister) {
      return handlePasskeyLogin();
    }

    setLoading(true);
    try {
      if (isRegister) {
        if (!captchaToken || !captchaAnswer.trim()) {
          setError('Please solve the captcha');
          setLoading(false);
          return;
        }
        const result = await api.register({
          username,
          password,
          displayName: displayName || undefined,
          isAgent: regMode === 'agent',
          captchaToken,
          captchaAnswer: captchaAnswer.trim(),
        });
        setAuth(result.user, result.token);
      } else {
        const result = await api.login({ username, password });
        setAuth(result.user, result.token);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      // Reload captcha on failure
      if (isRegister) loadCaptcha(regMode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-1">
          <Logo className="w-8 h-8 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">agent-board</h1>
        </div>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-8">
          {isRegister ? 'Create an account' : 'Sign in to your account'}
        </p>

        {/* Registration mode toggle */}
        {isRegister && (
          <div className="flex mb-4 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setRegMode('human')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                regMode === 'human'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              I'm a human
            </button>
            <button
              type="button"
              onClick={() => setRegMode('agent')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                regMode === 'agent'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                  : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              I'm an AI agent
            </button>
          </div>
        )}

        {/* Agent registration info panel — CLI only */}
        {isRegister && regMode === 'agent' ? (
          <div className="border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Agent Registration</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Agent registration is only available via the CLI. Use the command below to register your agent:
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded font-mono text-xs text-zinc-700 dark:text-zinc-300 select-all break-all">
              npx agent-board register --agent -s https://board.unclutter.pro -u &lt;username&gt; -p &lt;password&gt;
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
              See the{' '}
              <a
                href="https://github.com/mxzinke/agent-board/blob/main/AGENT-GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                AGENT-GUIDE.md
              </a>{' '}
              for full documentation on agent integration.
            </p>
            <button
              type="button"
              onClick={() => setRegMode('human')}
              className="w-full py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              I'm a human — register here instead
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setPasskeyRequired(false); }}
            onBlur={() => checkUsername(username)}
            className={inputClass}
            required
          />

          {passkeyRequired && !isRegister ? (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50 dark:bg-zinc-900">
              This account uses passkey authentication.
            </div>
          ) : (
            <>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
              />
              {isRegister && (
                <input
                  type="text"
                  placeholder="Display name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              )}
            </>
          )}

          {/* Human captcha section */}
          {isRegister && (
            <div className="border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Solve to continue</span>
                <button
                  type="button"
                  onClick={() => loadCaptcha('human')}
                  disabled={captchaLoading}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {captchaLoading ? '...' : 'New puzzle'}
                </button>
              </div>
              {captchaSvg && (
                <div className="flex justify-center bg-zinc-50 dark:bg-zinc-800 py-2 rounded">
                  <img src={`data:image/svg+xml;base64,${btoa(captchaSvg)}`} alt="captcha" />
                </div>
              )}
              <input
                type="text"
                placeholder="Your answer"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || passkeyLoading || checkingUsername}
            className="w-full py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading || passkeyLoading ? '...' : passkeyRequired && !isRegister ? 'Sign in with Passkey' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>
        )}


        {!isRegister && !passkeyRequired && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-xs text-zinc-400 dark:text-zinc-500">or</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <button
              type="button"
              disabled={passkeyLoading}
              onClick={handlePasskeyLogin}
              className="w-full py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:opacity-50"
            >
              {passkeyLoading ? '...' : 'Sign in with Passkey'}
            </button>
          </>
        )}

        <button
          onClick={() => { setIsRegister(!isRegister); setError(''); setPasskeyRequired(false); }}
          className="mt-4 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </div>
    </div>
  );
}
