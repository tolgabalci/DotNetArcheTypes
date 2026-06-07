using System.Net;
using System.Net.Http.Json;
using MermaidNotes.Api.Modules.Entries;
using Shouldly;

namespace MermaidNotes.Api.Tests;

public sealed class EntriesApiTests(EntriesApiFactory factory) : IClassFixture<EntriesApiFactory>
{
    [Fact]
    public async Task EntriesAreScopedByUserAndSortedByMostRecentlyModified()
    {
        var userA = factory.CreateClient();
        userA.DefaultRequestHeaders.Add("X-Test-User-Id", "user-a");

        var userB = factory.CreateClient();
        userB.DefaultRequestHeaders.Add("X-Test-User-Id", "user-b");

        var first = await Create(userA, "First note", "flowchart TD\nA-->B");
        await Task.Delay(10);
        var second = await Create(userA, "Second note", "sequenceDiagram\nA->>B: hello");
        await Create(userB, "Other user's note", "flowchart LR\nX-->Y");

        var userAEntries = await userA.GetFromJsonAsync<EntryPageResponse>("/api/v1/entries");
        userAEntries.ShouldNotBeNull();
        userAEntries.Items.Select(x => x.Id).ShouldBe([second.Id, first.Id]);

        var userBEntries = await userB.GetFromJsonAsync<EntryPageResponse>("/api/v1/entries");
        userBEntries.ShouldNotBeNull();
        userBEntries.Items.Count.ShouldBe(1);
        userBEntries.Items[0].DescriptionMarkdown.ShouldBe("Other user's note");
    }

    [Fact]
    public async Task UpdatingEntryMovesItToTop()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "update-user");

        var older = await Create(client, "Older", "flowchart TD\nA-->B");
        await Task.Delay(10);
        var newer = await Create(client, "Newer", "flowchart TD\nC-->D");

        var response = await client.PutAsJsonAsync($"/api/v1/entries/{older.Id}", new UpdateEntryRequest(
            "Older edited",
            "flowchart TD\nA-->C"));

        response.EnsureSuccessStatusCode();

        var entries = await client.GetFromJsonAsync<EntryPageResponse>("/api/v1/entries");
        entries.ShouldNotBeNull();
        entries.Items.Select(x => x.Id).ShouldBe([older.Id, newer.Id]);
    }

    [Fact]
    public async Task SearchFindsDescriptionAndMermaidSource()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User-Id", "search-user");

        var descriptionMatch = await Create(client, "Retail inventory checkout", "flowchart TD\nA-->B");
        var sourceMatch = await Create(client, "Generic note", "flowchart TD\nPaymentGateway-->Receipt");
        await Create(client, "Unrelated", "sequenceDiagram\nA->>B: ping");

        var byDescription = await client.GetFromJsonAsync<EntryPageResponse>("/api/v1/entries/search?q=inventory");
        byDescription.ShouldNotBeNull();
        byDescription.Items.Select(x => x.Id).ShouldContain(descriptionMatch.Id);

        var bySource = await client.GetFromJsonAsync<EntryPageResponse>("/api/v1/entries/search?q=PaymentGateway");
        bySource.ShouldNotBeNull();
        bySource.Items.Select(x => x.Id).ShouldContain(sourceMatch.Id);
    }

    [Fact]
    public async Task DeleteRemovesOnlyOwnedEntry()
    {
        var owner = factory.CreateClient();
        owner.DefaultRequestHeaders.Add("X-Test-User-Id", "owner");

        var other = factory.CreateClient();
        other.DefaultRequestHeaders.Add("X-Test-User-Id", "other");

        var entry = await Create(owner, "Owned", "flowchart TD\nA-->B");

        var forbiddenByNotFound = await other.DeleteAsync($"/api/v1/entries/{entry.Id}");
        forbiddenByNotFound.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        var deleted = await owner.DeleteAsync($"/api/v1/entries/{entry.Id}");
        deleted.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var fetched = await owner.GetAsync($"/api/v1/entries/{entry.Id}");
        fetched.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private static async Task<EntryResponse> Create(HttpClient client, string description, string mermaid)
    {
        var response = await client.PostAsJsonAsync("/api/v1/entries", new CreateEntryRequest(description, mermaid));
        response.EnsureSuccessStatusCode();
        var entry = await response.Content.ReadFromJsonAsync<EntryResponse>();
        entry.ShouldNotBeNull();
        return entry;
    }
}
