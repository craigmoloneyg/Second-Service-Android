const APP_ORIGIN = 'https://garnish-craig.craig-moloneyg.chatgpt.site';
const AUTH_HOSTS = new Set(['chatgpt.com','auth.openai.com','auth0.openai.com','accounts.google.com','appleid.apple.com','login.live.com','login.microsoftonline.com']);
function parsed(raw) { try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') ? u : null; } catch { return null; } }
function isApp(raw) { const u=parsed(raw); return !!u && u.origin===APP_ORIGIN; }
function isInternal(raw) { const u=parsed(raw); return !!u && (u.origin===APP_ORIGIN || AUTH_HOSTS.has(u.hostname)); }
module.exports={APP_ORIGIN,isApp,isInternal};
