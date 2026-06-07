import { describe, expect, it } from 'vitest';
import { formatMermaid, normalizeCommonMermaidIssues } from './mermaidSupport';

describe('mermaidSupport', () => {
  it('formats trailing whitespace and extra blank lines', () => {
    expect(formatMermaid('flowchart TD   \n  A-->B\n\n\n  B-->C   ')).toBe(
      'flowchart TD\n  A-->B\n\n  B-->C\n'
    );
  });

  it('converts sequence participants into flowchart nodes when used in a flowchart', () => {
    const source = 'flowchart TD\nparticipant User\nactor Admin';

    expect(normalizeCommonMermaidIssues(source)).toBe('flowchart TD\nUser[User]\nAdmin((Admin))');
  });
});
