import { useEffect, useRef, useState } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { Button, MessageBar, Toolbar, ToolbarButton } from '@fluentui/react-components';
import { CheckmarkRegular, WandRegular } from '@fluentui/react-icons';
import {
  formatMermaid,
  mermaidLanguageId,
  normalizeCommonMermaidIssues,
  registerMermaidLanguage,
  validateMermaid
} from '../../lib/mermaidSupport';

type MermaidEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MermaidEditor({ value, onChange }: MermaidEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const modelUriRef = useRef<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    modelUriRef.current = editor.getModel()?.uri.toString() ?? null;
    registerMermaidLanguage(monaco);

    editor.addAction({
      id: 'format-mermaid-source',
      label: 'Format Mermaid source',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => onChange(formatMermaid(editor.getValue()))
    });
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = monaco?.editor
      .getModels()
      .find((candidate: { uri: { toString: () => string } }) => candidate.uri.toString() === modelUriRef.current);

    if (!monaco || !model) {
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        await validateMermaid(value);
        setDiagnostic(null);
        monaco.editor.setModelMarkers(model, 'mermaid', []);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setDiagnostic(message);
        monaco.editor.setModelMarkers(model, 'mermaid', [
          {
            severity: monaco.MarkerSeverity.Error,
            message,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: Math.max(model.getLineCount(), 1),
            endColumn: model.getLineMaxColumn(Math.max(model.getLineCount(), 1))
          }
        ]);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [value]);

  return (
    <div className="mermaid-editor">
      <Toolbar className="editor-toolbar">
        <ToolbarButton icon={<CheckmarkRegular />} onClick={() => onChange(formatMermaid(value))}>
          Format
        </ToolbarButton>
        <ToolbarButton icon={<WandRegular />} onClick={() => onChange(normalizeCommonMermaidIssues(value))}>
          Quick fix
        </ToolbarButton>
      </Toolbar>
      {diagnostic ? <MessageBar intent="warning">{diagnostic}</MessageBar> : null}
      <Editor
        height="100%"
        language={mermaidLanguageId}
        theme="vs-light"
        value={value}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          quickSuggestions: true,
          tabSize: 2,
          wordWrap: 'on',
          scrollBeyondLastLine: false
        }}
      />
    </div>
  );
}
