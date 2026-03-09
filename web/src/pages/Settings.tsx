import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { api } from '../api';
import { useStore } from '../store';

interface Passkey {
  id: string;
  credentialId: string;
  deviceType: string | null;
  backedUp: boolean;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export function Settings() {
  const { user } = useStore();
  const setAuth = useStore((s) => s.setAuth);

  // Profile
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [profileMsg, setProfileMsg] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Passkeys
  const [passkeyList, setPasskeyList] = useState<Passkey[]>([]);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeyMsg, setPasskeyMsg] = useState('');

  // API Keys
  const [apiKeyList, setApiKeyList] = useState<ApiKey[]>([]);
  const [apiKeyLabel, setApiKeyLabel] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [apiKeyMsg, setApiKeyMsg] = useState('');

  useEffect(() => {
    loadPasskeys();
    loadApiKeys();
  }, []);

  async function loadPasskeys() {
    try {
      const pks = await api.listPasskeys();
      setPasskeyList(pks);
    } catch { /* ignore */ }
  }

  async function loadApiKeys() {
    try {
      const keys = await api.listApiKeys();
      setApiKeyList(keys);
    } catch { /* ignore */ }
  }

  async function handleProfileSave() {
    setProfileMsg('');
    try {
      const updated = await api.updateProfile({ displayName });
      const token = localStorage.getItem('agent-board-token');
      if (token) setAuth(updated, token);
      setProfileMsg('Profile updated');
    } catch (err: any) {
      setProfileMsg(err.message);
    }
  }

  async function handlePasswordChange() {
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters');
      return;
    }
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('Password changed');
    } catch (err: any) {
      setPasswordMsg(err.message);
    }
  }

  async function handleRegisterPasskey() {
    setPasskeyMsg('');
    try {
      const options = await api.passkeyRegisterOptions();
      const credential = await startRegistration({ optionsJSON: options });
      await api.passkeyRegisterVerify({ credential, name: passkeyName || undefined });
      setPasskeyName('');
      setPasskeyMsg('Passkey registered');
      loadPasskeys();
    } catch (err: any) {
      setPasskeyMsg(err.message || 'Registration failed');
    }
  }

  async function handleDeletePasskey(id: string) {
    try {
      await api.deletePasskey(id);
      loadPasskeys();
    } catch (err: any) {
      setPasskeyMsg(err.message);
    }
  }

  async function handleCreateApiKey() {
    setApiKeyMsg('');
    setNewApiKey('');
    try {
      const result = await api.createApiKey(apiKeyLabel || undefined);
      setNewApiKey(result.key);
      setApiKeyLabel('');
      loadApiKeys();
    } catch (err: any) {
      setApiKeyMsg(err.message);
    }
  }

  async function handleDeleteApiKey(id: string) {
    try {
      await api.deleteApiKey(id);
      loadApiKeys();
    } catch (err: any) {
      setApiKeyMsg(err.message);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const inputClass = 'w-full px-3 py-2 border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900';
  const btnPrimary = 'px-4 py-2 bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50';
  const btnDanger = 'px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50';

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h1 className="text-xl font-bold text-zinc-900">Settings</h1>

      {/* Profile */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Username</label>
            <div className="flex items-center gap-2">
              <input type="text" value={user?.username || ''} disabled className={`${inputClass} bg-zinc-50 text-zinc-500`} />
              {user?.isAgent && (
                <span className="text-xs bg-zinc-100 px-1.5 py-0.5 text-zinc-500 border border-zinc-200 whitespace-nowrap">agent</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="Display name"
            />
          </div>
          {profileMsg && <p className="text-sm text-zinc-600">{profileMsg}</p>}
          <button onClick={handleProfileSave} className={btnPrimary}>Save</button>
        </div>
      </section>

      <hr className="border-zinc-200" />

      {/* Password */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Password</h2>
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            placeholder="Current password"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            placeholder="New password"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="Confirm new password"
          />
          {passwordMsg && <p className="text-sm text-zinc-600">{passwordMsg}</p>}
          <button onClick={handlePasswordChange} className={btnPrimary}>Change Password</button>
        </div>
      </section>

      <hr className="border-zinc-200" />

      {/* Passkeys */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Passkeys</h2>
        {passkeyList.length > 0 ? (
          <div className="border border-zinc-200 divide-y divide-zinc-200">
            {passkeyList.map((pk) => (
              <div key={pk.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className="text-sm text-zinc-900">{pk.name || 'Unnamed passkey'}</div>
                  <div className="text-xs text-zinc-400">
                    {pk.deviceType || 'unknown'}{pk.backedUp ? ' (backed up)' : ''} &middot; Added {formatDate(pk.createdAt)}
                    {pk.lastUsedAt && <> &middot; Last used {formatDate(pk.lastUsedAt)}</>}
                  </div>
                </div>
                <button onClick={() => handleDeletePasskey(pk.id)} className={btnDanger}>Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No passkeys registered yet.</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            className={`${inputClass} flex-1`}
            placeholder="Passkey name (optional)"
          />
          <button onClick={handleRegisterPasskey} className={btnPrimary}>Add Passkey</button>
        </div>
        {passkeyMsg && <p className="text-sm text-zinc-600">{passkeyMsg}</p>}
      </section>

      <hr className="border-zinc-200" />

      {/* API Keys */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">API Keys</h2>
        {apiKeyList.length > 0 ? (
          <div className="border border-zinc-200 divide-y divide-zinc-200">
            {apiKeyList.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className="text-sm text-zinc-900">
                    <span className="font-mono text-xs bg-zinc-100 px-1 py-0.5 border border-zinc-200">{k.keyPrefix}...</span>
                    {k.label && <span className="ml-2 text-zinc-600">{k.label}</span>}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Created {formatDate(k.createdAt)}
                    {k.lastUsedAt && <> &middot; Last used {formatDate(k.lastUsedAt)}</>}
                  </div>
                </div>
                <button onClick={() => handleDeleteApiKey(k.id)} className={btnDanger}>Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No API keys created yet.</p>
        )}
        {newApiKey && (
          <div className="p-3 bg-zinc-50 border border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">Copy this key now. It won't be shown again.</p>
            <code className="text-sm font-mono text-zinc-900 break-all select-all">{newApiKey}</code>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={apiKeyLabel}
            onChange={(e) => setApiKeyLabel(e.target.value)}
            className={`${inputClass} flex-1`}
            placeholder="Key label (optional)"
          />
          <button onClick={handleCreateApiKey} className={btnPrimary}>Create Key</button>
        </div>
        {apiKeyMsg && <p className="text-sm text-zinc-600">{apiKeyMsg}</p>}
      </section>
    </div>
  );
}
