'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, API_URL, ApiKey, OAuthConnection } from '../../lib/api-client';
import Dialog from '../../components/ui/dialog';
import Button from '../../components/ui/button';
import ChipGroup from '../../components/ui/chip-group';
import { Field, Input } from '../../components/ui/field';

const MCP_URL = `${API_URL}/mcp`;

const SCOPE_LABEL: Record<ApiKey['scope'], string> = {
  read: 'Read only',
  write: 'Read and write',
};

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text stays selectable.
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy} className="shrink-0">
      {copied ? 'Copied' : label}
    </Button>
  );
}

function CodeLine({ text, copyLabel }: { text: string; copyLabel?: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-bg border border-line rounded-xl pl-3 pr-2 py-2">
      <code className="flex-1 min-w-0 font-mono text-[12.5px] leading-relaxed break-all select-all py-0.5">
        {text}
      </code>
      <CopyButton text={text} label={copyLabel} />
    </div>
  );
}

export default function AiAccess() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [connections, setConnections] = useState<OAuthConnection[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Id of the key or connection awaiting a second click
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ApiKey['scope']>('write');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Set once, right after creation; the secret is never retrievable again.
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextKeys, nextConnections] = await Promise.all([
        api.listApiKeys(),
        api.listOAuthConnections(),
      ]);
      setKeys(nextKeys);
      setConnections(nextConnections);
      setLoadError(null);
    } catch {
      setLoadError('Could not load AI access settings.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setName('');
    setScope('write');
    setFormError(null);
    setCreatedKey(null);
    setDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Give the key a name, such as the assistant that will use it.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createApiKey(name.trim(), scope);
      setCreatedKey(created.key);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Creating the key failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirmingRevoke !== id) {
      setConfirmingRevoke(id);
      return;
    }
    try {
      await api.revokeApiKey(id);
      setConfirmingRevoke(null);
      await load();
    } catch {
      setLoadError('Revoking failed. Try again.');
    }
  };

  const handleDisconnect = async (clientId: string) => {
    const confirmId = `connection:${clientId}`;
    if (confirmingRevoke !== confirmId) {
      setConfirmingRevoke(confirmId);
      return;
    }
    try {
      await api.revokeOAuthConnection(clientId);
      setConfirmingRevoke(null);
      await load();
    } catch {
      setLoadError('Disconnecting failed. Try again.');
    }
  };

  return (
    <section className="mb-10">
      <h2 className="font-display font-extrabold text-xl tracking-tight mb-1.5">AI access</h2>
      <p className="text-muted text-sm mb-3.5">
        Connect an AI assistant to read and manage your subscriptions.
      </p>

      {loadError && (
        <p className="mb-3.5 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
          {loadError}
        </p>
      )}

      <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">MCP server URL</p>
      <div className="mb-5">
        <CodeLine text={MCP_URL} />
      </div>

      {connections.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
            Connected assistants
          </p>
          <div className="bg-surface border border-line rounded-2xl overflow-hidden mb-5">
            {connections.map((connection, index) => (
              <div
                key={connection.client_id}
                className={`grid grid-cols-[1fr_auto] items-center gap-3.5 px-4.5 py-3.5 ${
                  index > 0 ? 'border-t border-line' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{connection.name}</span>
                  <span className="block text-[12.5px] text-muted">
                    Read and write · Connected{' '}
                    <span className="font-mono tnum">{formatDay(connection.connected_at)}</span>
                  </span>
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDisconnect(connection.client_id)}
                >
                  {confirmingRevoke === `connection:${connection.client_id}`
                    ? 'Confirm disconnect'
                    : 'Disconnect'}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">API keys</p>
      {keys.length === 0 ? (
        <p className="text-muted text-sm bg-surface border border-line rounded-2xl px-5 py-6 mb-3.5">
          No API keys yet. Create one to connect an assistant or a script.
        </p>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden mb-3.5">
          {keys.map((key, index) => (
            <div
              key={key.id}
              className={`grid grid-cols-[1fr_auto] items-center gap-3.5 px-4.5 py-3.5 ${
                index > 0 ? 'border-t border-line' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block font-semibold truncate">{key.name}</span>
                <span className="block text-[12.5px] text-muted">
                  {SCOPE_LABEL[key.scope]} ·{' '}
                  <span className="font-mono tnum">recr_••••{key.key_hint}</span> ·{' '}
                  {key.last_used_at ? (
                    <>
                      Last used <span className="font-mono tnum">{formatDay(key.last_used_at)}</span>
                    </>
                  ) : (
                    'Never used'
                  )}
                </span>
              </span>
              <Button variant="danger" size="sm" onClick={() => handleRevoke(key.id)}>
                {confirmingRevoke === key.id ? 'Confirm revoke' : 'Revoke'}
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="ghost" onClick={openCreate}>
        + Create API key
      </Button>
      <p className="text-xs text-muted mt-2.5">
        A key acts as you. Revoking it cuts off whatever was using it straight away.
      </p>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={createdKey ? 'Your new API key' : 'Create an API key'}
      >
        {createdKey ? (
          <div>
            <p className="text-sm text-muted mb-3">Copy it now. It is not shown again.</p>
            <div className="mb-5">
              <CodeLine text={createdKey} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
              Add to Claude Code
            </p>
            <div className="mb-5">
              <CodeLine
                text={`claude mcp add --transport http recr-monkey ${MCP_URL} --header "Authorization: Bearer ${createdKey}"`}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setDialogOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            {formError && (
              <p className="mb-4 px-3 py-2 rounded-lg bg-danger-soft text-danger text-sm font-medium">
                {formError}
              </p>
            )}
            <Field label="Name" htmlFor="api-key-name" hint="Where this key will be used.">
              <Input
                id="api-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claude Code"
                maxLength={60}
                autoComplete="off"
                required
                autoFocus
              />
            </Field>
            <p className="block text-xs font-bold uppercase tracking-wide text-muted mb-1.5">
              Access
            </p>
            <ChipGroup
              aria-label="Access"
              options={[
                { value: 'write', label: SCOPE_LABEL.write },
                { value: 'read', label: SCOPE_LABEL.read },
              ]}
              value={scope}
              onChange={setScope}
            />
            <div className="flex items-center gap-2.5 pt-6">
              <span className="flex-1" />
              <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                Create key
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}
