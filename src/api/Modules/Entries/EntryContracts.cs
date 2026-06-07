namespace MermaidNotes.Api.Modules.Entries;

public sealed record EntryResponse(
    Guid Id,
    string DescriptionMarkdown,
    string MermaidSource,
    DateTimeOffset CreatedAt,
    DateTimeOffset ModifiedAt);

public sealed record EntrySummaryResponse(
    Guid Id,
    string DescriptionMarkdown,
    string MermaidSource,
    DateTimeOffset CreatedAt,
    DateTimeOffset ModifiedAt);

public sealed record EntryPageResponse(
    IReadOnlyList<EntrySummaryResponse> Items,
    string? NextCursor);

public sealed record CreateEntryRequest(
    string DescriptionMarkdown,
    string MermaidSource);

public sealed record UpdateEntryRequest(
    string DescriptionMarkdown,
    string MermaidSource);
