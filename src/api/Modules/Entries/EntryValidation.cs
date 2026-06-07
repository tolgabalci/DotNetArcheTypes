namespace MermaidNotes.Api.Modules.Entries;

internal static class EntryValidation
{
    public const int DescriptionMaxLength = 8_000;
    public const int MermaidSourceMaxLength = 40_000;

    public static Dictionary<string, string[]> Validate(string descriptionMarkdown, string mermaidSource)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(descriptionMarkdown))
        {
            errors[nameof(CreateEntryRequest.DescriptionMarkdown)] = ["Description is required."];
        }
        else if (descriptionMarkdown.Length > DescriptionMaxLength)
        {
            errors[nameof(CreateEntryRequest.DescriptionMarkdown)] = [$"Description must be {DescriptionMaxLength} characters or fewer."];
        }

        if (string.IsNullOrWhiteSpace(mermaidSource))
        {
            errors[nameof(CreateEntryRequest.MermaidSource)] = ["Mermaid source is required."];
        }
        else if (mermaidSource.Length > MermaidSourceMaxLength)
        {
            errors[nameof(CreateEntryRequest.MermaidSource)] = [$"Mermaid source must be {MermaidSourceMaxLength} characters or fewer."];
        }

        return errors;
    }
}
