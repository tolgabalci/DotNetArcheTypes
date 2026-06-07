import { Button, MessageBar, Spinner, Text, Title1 } from '@fluentui/react-components';
import { SignOutRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useAuthSession } from './lib/auth';
import { EditorPage } from './features/entries/EditorPage';
import { FeedPage } from './features/entries/FeedPage';

type ActiveScreen =
  | { name: 'feed'; focusEntryId?: string | null }
  | { name: 'editor'; entryId: string | 'new' };

export function App() {
  const auth = useAuthSession();
  const [screen, setScreen] = useState<ActiveScreen>({ name: 'feed' });

  if (auth.isLoading) {
    return (
      <div className="centered-state">
        <Spinner label="Checking sign-in status" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <main className="login-page">
        <Title1 as="h1">Mermaid Notes</Title1>
        <Text>Create private notes with rendered Mermaid diagrams.</Text>
        <Button appearance="primary" onClick={() => void auth.signIn()}>
          Sign in
        </Button>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div>
          <Text weight="semibold">Mermaid Notes</Text>
          <Text size={200}>{auth.userName}</Text>
        </div>
        <Button
          appearance="subtle"
          icon={<SignOutRegular />}
          onClick={() => void auth.signOut()}
        >
          Sign out
        </Button>
      </header>

      {screen.name === 'feed' ? (
        <FeedPage
          focusEntryId={screen.focusEntryId}
          onCreate={() => setScreen({ name: 'editor', entryId: 'new' })}
          onOpen={(entryId) => setScreen({ name: 'editor', entryId })}
        />
      ) : (
        <EditorPage
          entryId={screen.entryId}
          onCancel={() => setScreen({ name: 'feed' })}
          onSaved={(entry) => setScreen({ name: 'feed', focusEntryId: entry.id })}
        />
      )}

      <MessageBar className="security-note" intent="warning">
        Mermaid loose rendering is enabled for richer diagrams. Production deployments should review CSP and sanitization policy before allowing untrusted users.
      </MessageBar>
    </div>
  );
}
