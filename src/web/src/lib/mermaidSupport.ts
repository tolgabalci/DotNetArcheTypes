import type { Monaco } from '@monaco-editor/react';
import type * as MonacoEditor from 'monaco-editor';
import mermaid from 'mermaid';

const languageId = 'mermaid';
let registered = false;

export function registerMermaidLanguage(monaco: Monaco) {
  if (registered) {
    return;
  }

  registered = true;

  monaco.languages.register({ id: languageId, aliases: ['Mermaid', 'mermaid'] });
  monaco.languages.setMonarchTokensProvider(languageId, {
    tokenizer: {
      root: [
        [/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|timeline|mindmap|quadrantChart)\b/, 'keyword'],
        [/-->|---|==>|-.->|->>|-->>|-\.-/, 'operator'],
        [/\b(participant|actor|activate|deactivate|note|loop|alt|else|opt|par|and|rect|end)\b/, 'keyword'],
        [/\b(subgraph|direction|click|style|classDef|class)\b/, 'keyword'],
        [/%%.*$/, 'comment'],
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        [/\[[^\]]*\]|\([^)]+\)|\{[^}]+\}/, 'string'],
        [/[A-Za-z_][\w-]*/, 'identifier']
      ]
    }
  });

  monaco.languages.registerCompletionItemProvider(languageId, {
    triggerCharacters: [' ', '\n'],
    provideCompletionItems: (model: MonacoEditor.editor.ITextModel, position: MonacoEditor.Position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      return {
        suggestions: [
          snippet(monaco, 'flowchart', 'flowchart TD\\n  A[Start] --> B{Decision}\\n  B -->|Yes| C[Done]\\n  B -->|No| D[Retry]', range),
          snippet(monaco, 'sequence diagram', 'sequenceDiagram\\n  participant User\\n  participant System\\n  User->>System: Request\\n  System-->>User: Response', range),
          snippet(monaco, 'state diagram', 'stateDiagram-v2\\n  [*] --> Draft\\n  Draft --> Published\\n  Published --> [*]', range),
          snippet(monaco, 'class diagram', 'classDiagram\\n  class Entry {\\n    +string description\\n    +string mermaidSource\\n  }', range),
          snippet(monaco, 'entity relationship', 'erDiagram\\n  USER ||--o{ ENTRY : owns\\n  ENTRY {\\n    uuid id\\n    string description\\n  }', range)
        ]
      };
    }
  });

  monaco.languages.registerCodeActionProvider(languageId, {
    provideCodeActions: (model: MonacoEditor.editor.ITextModel) => ({
      actions: buildQuickFixActions(monaco, model),
      dispose: () => undefined
    })
  });
}

export function configureMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'default',
    deterministicIds: true
  });
}

export async function validateMermaid(source: string) {
  await mermaid.parse(source, { suppressErrors: false });
}

export function formatMermaid(source: string) {
  return source
    .split('\n')
    .map((line) => line.replace(/\s+$/u, ''))
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
    .concat('\n');
}

export function normalizeCommonMermaidIssues(source: string) {
  return source
    .replace(/^\s*participant\s+(.+)$/gimu, '$1[$1]')
    .replace(/^\s*actor\s+(.+)$/gimu, '$1(($1))')
    .replace(/\bend\s*$/gimu, 'end');
}

function snippet(
  monaco: Monaco,
  label: string,
  insertText: string,
  range: MonacoEditor.IRange
) {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: `Insert a ${label} Mermaid template.`,
    range
  };
}

function buildQuickFixActions(monaco: Monaco, model: MonacoEditor.editor.ITextModel) {
  const source = model.getValue();
  const fullRange = new monaco.Range(
    1,
    1,
    model.getLineCount(),
    model.getLineMaxColumn(model.getLineCount())
  );
  const actions = [];

  if (/^\s*(participant|actor)\s+/imu.test(source) && /^\s*(flowchart|graph)\b/imu.test(source)) {
    actions.push({
      title: 'Convert sequence participant syntax to flowchart nodes',
      kind: 'quickfix',
      edit: {
        edits: [
          {
            resource: model.uri,
            edits: [
              {
                range: fullRange,
                text: normalizeCommonMermaidIssues(source)
              }
            ]
          }
        ]
      },
      isPreferred: true
    });
  }

  if (source !== formatMermaid(source)) {
    actions.push({
      title: 'Trim trailing whitespace and normalize blank lines',
      kind: 'source.format',
      edit: {
        edits: [
          {
            resource: model.uri,
            edits: [
              {
                range: fullRange,
                text: formatMermaid(source)
              }
            ]
          }
        ]
      }
    });
  }

  return actions;
}

export { languageId as mermaidLanguageId };
