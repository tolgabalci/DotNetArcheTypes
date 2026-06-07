import DOMPurify from 'dompurify';
import { marked } from 'marked';

export function renderMarkdown(markdown: string) {
  const html = marked.parse(markdown, {
    async: false,
    breaks: true,
    gfm: true
  }) as string;

  return DOMPurify.sanitize(html);
}
