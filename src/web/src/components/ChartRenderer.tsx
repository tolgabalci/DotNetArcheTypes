import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { MessageBar, Spinner } from '@fluentui/react-components';
import { configureMermaid } from '../lib/mermaidSupport';

type ChartRendererProps = {
  source: string;
  className?: string;
};

configureMermaid();

export function ChartRenderer({ source, className }: ChartRendererProps) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const renderId = useMemo(() => `mermaid-${crypto.randomUUID()}`, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!source.trim()) {
        setSvg('');
        setError('Mermaid source is empty.');
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        await mermaid.parse(source, { suppressErrors: false });
        const rendered = await mermaid.render(renderId, source);
        const sanitized = DOMPurify.sanitize(rendered.svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['foreignObject'],
          ADD_ATTR: ['target', 'rel', 'style']
        });

        if (!cancelled) {
          setSvg(sanitized);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg('');
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [renderId, source]);

  if (isRendering && !svg) {
    return (
      <div className={`chart-renderer chart-renderer-loading ${className ?? ''}`}>
        <Spinner size="small" label="Rendering chart" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`chart-renderer ${className ?? ''}`}>
        <MessageBar intent="error">{error}</MessageBar>
      </div>
    );
  }

  return (
    <div
      className={`chart-renderer ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
