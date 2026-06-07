export type Entry = {
  id: string;
  descriptionMarkdown: string;
  mermaidSource: string;
  createdAt: string;
  modifiedAt: string;
};

export type EntryPage = {
  items: Entry[];
  nextCursor: string | null;
};

export type EntryInput = {
  descriptionMarkdown: string;
  mermaidSource: string;
};
