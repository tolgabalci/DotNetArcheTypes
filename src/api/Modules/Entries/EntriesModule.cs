using MermaidNotes.Api.Database;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace MermaidNotes.Api.Modules.Entries;

public static class EntriesModule
{
    public static RouteGroupBuilder MapEntriesEndpoints(this RouteGroupBuilder group)
    {
        var entries = group.MapGroup("/entries")
            .WithTags("Entries");

        entries.MapGet("/", ListEntries)
            .WithName("ListEntries");

        entries.MapGet("/search", SearchEntries)
            .WithName("SearchEntries");

        entries.MapPost("/", CreateEntry)
            .WithName("CreateEntry");

        entries.MapGet("/{id:guid}", GetEntry)
            .WithName("GetEntry");

        entries.MapPut("/{id:guid}", UpdateEntry)
            .WithName("UpdateEntry");

        entries.MapDelete("/{id:guid}", DeleteEntry)
            .WithName("DeleteEntry");

        return group;
    }

    private static async Task<Ok<EntryPageResponse>> ListEntries(
        string? cursor,
        int? limit,
        EntriesDbContext db,
        ICurrentUser currentUser,
        CancellationToken cancellationToken)
    {
        var pageSize = NormalizeLimit(limit);
        var query = db.Entries
            .AsNoTracking()
            .Where(x => x.UserId == currentUser.UserId);

        if (EntryCursorCodec.TryDecode(cursor, out var decodedCursor))
        {
            query = query.Where(x => x.ModifiedAt < decodedCursor.ModifiedAt);
        }

        var items = await query
            .OrderByDescending(x => x.ModifiedAt)
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(ToPage(items, pageSize));
    }

    private static async Task<Results<Ok<EntryPageResponse>, BadRequest<string>>> SearchEntries(
        string q,
        int? limit,
        EntriesDbContext db,
        ICurrentUser currentUser,
        CancellationToken cancellationToken)
    {
        var search = q?.Trim();
        if (string.IsNullOrWhiteSpace(search))
        {
            return TypedResults.BadRequest("Search text is required.");
        }

        var pageSize = NormalizeLimit(limit);
        var likePattern = $"%{search}%";

        var items = await db.Entries
            .FromSqlInterpolated($"""
                SELECT *
                FROM entries.note_entries
                WHERE user_id = {currentUser.UserId}
                  AND (
                    to_tsvector('english', coalesce(description_markdown, '') || ' ' || coalesce(mermaid_source, '')) @@ websearch_to_tsquery('english', {search})
                    OR description_markdown ILIKE {likePattern}
                    OR mermaid_source ILIKE {likePattern}
                  )
                ORDER BY
                  ts_rank_cd(
                    to_tsvector('english', coalesce(description_markdown, '') || ' ' || coalesce(mermaid_source, '')),
                    websearch_to_tsquery('english', {search})
                  ) DESC,
                  modified_at DESC
                """)
            .AsNoTracking()
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(new EntryPageResponse(items.Select(ToSummary).ToArray(), null));
    }

    private static async Task<Results<Created<EntryResponse>, ValidationProblem>> CreateEntry(
        CreateEntryRequest request,
        EntriesDbContext db,
        ICurrentUser currentUser,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var errors = EntryValidation.Validate(request.DescriptionMarkdown, request.MermaidSource);
        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        var now = timeProvider.GetUtcNow();
        var entry = new Entry
        {
            Id = Guid.NewGuid(),
            UserId = currentUser.UserId,
            DescriptionMarkdown = request.DescriptionMarkdown.Trim(),
            MermaidSource = request.MermaidSource.Trim(),
            CreatedAt = now,
            ModifiedAt = now
        };

        db.Entries.Add(entry);
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Created($"/api/v1/entries/{entry.Id}", ToResponse(entry));
    }

    private static async Task<Results<Ok<EntryResponse>, NotFound>> GetEntry(
        Guid id,
        EntriesDbContext db,
        ICurrentUser currentUser,
        CancellationToken cancellationToken)
    {
        var entry = await db.Entries
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken);

        return entry is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(ToResponse(entry));
    }

    private static async Task<Results<Ok<EntryResponse>, NotFound, ValidationProblem>> UpdateEntry(
        Guid id,
        UpdateEntryRequest request,
        EntriesDbContext db,
        ICurrentUser currentUser,
        TimeProvider timeProvider,
        CancellationToken cancellationToken)
    {
        var errors = EntryValidation.Validate(request.DescriptionMarkdown, request.MermaidSource);
        if (errors.Count > 0)
        {
            return TypedResults.ValidationProblem(errors);
        }

        var entry = await db.Entries
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken);

        if (entry is null)
        {
            return TypedResults.NotFound();
        }

        entry.DescriptionMarkdown = request.DescriptionMarkdown.Trim();
        entry.MermaidSource = request.MermaidSource.Trim();
        entry.ModifiedAt = timeProvider.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(ToResponse(entry));
    }

    private static async Task<Results<NoContent, NotFound>> DeleteEntry(
        Guid id,
        EntriesDbContext db,
        ICurrentUser currentUser,
        CancellationToken cancellationToken)
    {
        var entry = await db.Entries
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId, cancellationToken);

        if (entry is null)
        {
            return TypedResults.NotFound();
        }

        db.Entries.Remove(entry);
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.NoContent();
    }

    private static EntryPageResponse ToPage(List<Entry> items, int pageSize)
    {
        var pageItems = items.Take(pageSize).ToArray();
        var nextCursor = items.Count > pageSize
            ? EntryCursorCodec.Encode(pageItems[^1].ModifiedAt)
            : null;

        return new EntryPageResponse(pageItems.Select(ToSummary).ToArray(), nextCursor);
    }

    private static EntryResponse ToResponse(Entry entry)
    {
        return new EntryResponse(
            entry.Id,
            entry.DescriptionMarkdown,
            entry.MermaidSource,
            entry.CreatedAt,
            entry.ModifiedAt);
    }

    private static EntrySummaryResponse ToSummary(Entry entry)
    {
        return new EntrySummaryResponse(
            entry.Id,
            entry.DescriptionMarkdown,
            entry.MermaidSource,
            entry.CreatedAt,
            entry.ModifiedAt);
    }

    private static int NormalizeLimit(int? limit)
    {
        return Math.Clamp(limit.GetValueOrDefault(20), 1, 50);
    }
}
