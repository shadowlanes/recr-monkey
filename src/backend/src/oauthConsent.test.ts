import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.BETTER_AUTH_SECRET ||= 'test-secret-for-consent-signing-only';

// Imported after the secret is set; the module reads it lazily either way.
import { signConsent, verifyConsent } from './oauthConsent';

const claims = { userId: 'user-1', clientId: 'client-1', redirectUri: 'https://app.example/cb' };

describe('OAuth consent token', () => {
  it('verifies for the user, client and redirect it was signed for', () => {
    assert.equal(verifyConsent(signConsent(claims), claims), true);
  });

  it('rejects a different user', () => {
    assert.equal(verifyConsent(signConsent(claims), { ...claims, userId: 'user-2' }), false);
  });

  it('rejects a different client', () => {
    assert.equal(verifyConsent(signConsent(claims), { ...claims, clientId: 'client-2' }), false);
  });

  it('rejects a different redirect URI', () => {
    assert.equal(
      verifyConsent(signConsent(claims), { ...claims, redirectUri: 'https://evil.example/cb' }),
      false,
    );
  });

  it('rejects an expired token', () => {
    const token = signConsent(claims, Date.now() - 6 * 60 * 1000);
    assert.equal(verifyConsent(token, claims), false);
  });

  it('rejects a tampered payload', () => {
    const [, signature] = signConsent(claims).split('.');
    const forged = Buffer.from(
      JSON.stringify({ u: 'user-2', c: claims.clientId, r: claims.redirectUri, e: Date.now() + 60000 }),
    ).toString('base64url');
    assert.equal(verifyConsent(`${forged}.${signature}`, { ...claims, userId: 'user-2' }), false);
  });

  it('rejects malformed input', () => {
    for (const bad of [undefined, null, '', 'abc', 'a.b.c', 42]) {
      assert.equal(verifyConsent(bad, claims), false);
    }
  });
});
