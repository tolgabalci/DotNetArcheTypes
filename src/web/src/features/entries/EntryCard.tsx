import { Button, Card, Text } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import { formatDistanceToNow } from 'date-fns';
import { ChartRenderer } from '../../components/ChartRenderer';
import { renderMarkdown } from '../../lib/markdown';
import type { Entry } from './types';

type EntryCardProps = {
  entry: Entry;
  isHighlighted?: boolean;
  onOpen: (entryId: string) => void;
  onDelete: (entryId: string) => void;
};

export function EntryCard({ entry, isHighlighted, onOpen, onDelete }: EntryCardProps) {
  const modified = formatDistanceToNow(new Date(entry.modifiedAt), { addSuffix: true });

  return (
    <Card className={`entry-card ${isHighlighted ? 'entry-card-highlighted' : ''}`}>
      <div className="entry-card-header">
        <div>
          <Text weight="semibold">Modified {modified}</Text>
          <div
            className="entry-description"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.descriptionMarkdown) }}
          />
        </div>
        <Button
          aria-label="Delete entry"
          appearance="subtle"
          icon={<DeleteRegular />}
          onClick={() => onDelete(entry.id)}
        />
      </div>

      <button className="chart-open-button" type="button" onClick={() => onOpen(entry.id)}>
        <ChartRenderer source={entry.mermaidSource} />
      </button>
    </Card>
  );
}
