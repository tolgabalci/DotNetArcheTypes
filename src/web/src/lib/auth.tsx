import { createContext, useContext, type ReactNode } from 'react';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { config, isOidcConfigured } from './config';

export type AuthSession = {
  isLoading: boolean;
  isAuthenticated: boolean;
  userName: string;
  accessToken?: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSession | undefined>(undefined);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  if (config.authMode === 'mock' || !isOidcConfigured()) {
    return <MockAuthSessionProvider>{children}</MockAuthSessionProvider>;
  }

  return (
    <AuthProvider
      authority={config.cognito.authority}
      client_id={config.cognito.clientId}
      redirect_uri={config.cognito.redirectUri}
      post_logout_redirect_uri={config.cognito.postLogoutRedirectUri}
      response_type="code"
      scope="openid email profile"
      automaticSilentRenew
      loadUserInfo
    >
      <OidcAuthSessionBridge>{children}</OidcAuthSessionBridge>
    </AuthProvider>
  );
}

export function useAuthSession() {
  const session = useContext(AuthSessionContext);
  if (!session) {
    throw new Error('useAuthSession must be used within AuthSessionProvider.');
  }

  return session;
}

function OidcAuthSessionBridge({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userName = auth.user?.profile.email ?? auth.user?.profile.name ?? 'Signed in user';

  const session: AuthSession = {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    userName,
    accessToken: auth.user?.access_token,
    signIn: async () => {
      await auth.signinRedirect();
    },
    signOut: async () => {
      await auth.signoutRedirect();
    }
  };

  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}

function MockAuthSessionProvider({ children }: { children: ReactNode }) {
  const session: AuthSession = {
    isLoading: false,
    isAuthenticated: true,
    userName: 'Local developer',
    accessToken: 'local-dev-token',
    signIn: async () => undefined,
    signOut: async () => undefined
  };

  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}
