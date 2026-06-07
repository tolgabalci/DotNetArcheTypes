export type AuthMode = 'oidc' | 'mock';

export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080',
  authMode: (import.meta.env.VITE_AUTH_MODE ?? 'mock') as AuthMode,
  cognito: {
    authority: import.meta.env.VITE_COGNITO_AUTHORITY ?? '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
    redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI ?? window.location.origin,
    postLogoutRedirectUri:
      import.meta.env.VITE_COGNITO_POST_LOGOUT_REDIRECT_URI ?? window.location.origin
  }
};

export function isOidcConfigured() {
  return Boolean(config.cognito.authority && config.cognito.clientId);
}
