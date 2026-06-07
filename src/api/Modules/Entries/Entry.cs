namespace MermaidNotes.Api.Modules.Entries;

public sealed class Entry
{
    public Guid Id { get; init; }

    public required string UserId { get; init; }

    public required string DescriptionMarkdown { get; set; }

    public required string MermaidSource { get; set; }

    public DateTimeOffset CreatedAt { get; init; }

    public DateTimeOffset ModifiedAt { get; set; }
}
