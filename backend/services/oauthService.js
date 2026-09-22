/**
 * Google + GitHub OAuth 2.0 (authorization code flow).
 *
 * Everything here runs server-side only - the client secret never leaves the
 * backend. The browser is redirected to the provider, the provider redirects
 * back to our callback with a short-lived `code`, and we exchange that code
 * for an access token and the user's profile.
 *
 * Implemented with plain fetch rather than passport so it stays transparent
 * and adds no session/middleware dependencies to the existing app.
 */

const crypto = require('crypto');

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
    clientIdVar: 'GOOGLE_CLIENT_ID',
    clientSecretVar: 'GOOGLE_CLIENT_SECRET',
    callbackVar: 'GOOGLE_CALLBACK_URL',
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailsUrl: 'https://api.github.com/user/emails',
    scope: 'read:user user:email',
    clientIdVar: 'GITHUB_CLIENT_ID',
    clientSecretVar: 'GITHUB_CLIENT_SECRET',
    callbackVar: 'GITHUB_CALLBACK_URL',
  },
};

function getConfig(provider) {
  const meta = PROVIDERS[provider];
  if (!meta) throw new Error(`Unknown OAuth provider: ${provider}`);

  const clientId = process.env[meta.clientIdVar];
  const clientSecret = process.env[meta.clientSecretVar];
  const callbackUrl =
    process.env[meta.callbackVar] ||
    `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/${provider}/callback`;

  return { meta, clientId, clientSecret, callbackUrl };
}

function isConfigured(provider) {
  const { clientId, clientSecret } = getConfig(provider);
  return Boolean(clientId && clientSecret);
}

function missingVars(provider) {
  const { meta, clientId, clientSecret } = getConfig(provider);
  const missing = [];
  if (!clientId) missing.push(meta.clientIdVar);
  if (!clientSecret) missing.push(meta.clientSecretVar);
  return missing;
}

/** Random value used as the OAuth `state` parameter (CSRF protection). */
function createState() {
  return crypto.randomBytes(16).toString('hex');
}

function buildAuthorizeUrl(provider, state) {
  const { meta, clientId, callbackUrl } = getConfig(provider);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: meta.scope,
    state,
    response_type: 'code',
  });
  if (provider === 'google') {
    params.set('access_type', 'online');
    params.set('prompt', 'select_account');
  }
  return `${meta.authorizeUrl}?${params.toString()}`;
}

async function exchangeCodeForToken(provider, code) {
  const { meta, clientId, clientSecret, callbackUrl } = getConfig(provider);

  const response = await fetch(meta.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || `Token exchange failed (${response.status})`);
  }

  return data.access_token;
}

/**
 * @returns {Promise<{providerId: string, email: string, firstName: string, lastName: string, fullName: string, avatarUrl: string}>}
 */
async function fetchProfile(provider, accessToken) {
  const { meta } = getConfig(provider);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'User-Agent': 'InterviewMate',
  };

  const response = await fetch(meta.userInfoUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to load ${provider} profile (${response.status})`);
  }
  const profile = await response.json();

  if (provider === 'google') {
    if (!profile.email) throw new Error('Google account did not return an email address');
    return {
      providerId: profile.sub,
      email: String(profile.email).toLowerCase(),
      firstName: profile.given_name || '',
      lastName: profile.family_name || '',
      fullName: profile.name || profile.email,
      avatarUrl: profile.picture || '',
    };
  }

  // GitHub: the primary email often isn't on /user, so ask /user/emails too.
  let email = profile.email;
  if (!email) {
    const emailsRes = await fetch(meta.emailsUrl, { headers });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails)
        ? emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified)
        : null;
      email = primary?.email || null;
    }
  }
  if (!email) {
    throw new Error('No verified email address is available on this GitHub account');
  }

  const nameParts = (profile.name || profile.login || '').trim().split(/\s+/).filter(Boolean);
  return {
    providerId: String(profile.id),
    email: String(email).toLowerCase(),
    firstName: nameParts[0] || profile.login || '',
    lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
    fullName: profile.name || profile.login || email,
    avatarUrl: profile.avatar_url || '',
  };
}

module.exports = {
  isConfigured,
  missingVars,
  createState,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchProfile,
};
