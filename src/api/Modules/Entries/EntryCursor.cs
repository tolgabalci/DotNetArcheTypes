using System.Globalization;
using System.Text;

namespace MermaidNotes.Api.Modules.Entries;

public sealed record EntryCursor(DateTimeOffset ModifiedAt);

public static class EntryCursorCodec
{
    public static string Encode(DateTimeOffset modifiedAt)
    {
        var payload = modifiedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture);
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(payload));
    }

    public static bool TryDecode(string? value, out EntryCursor cursor)
    {
        cursor = new EntryCursor(DateTimeOffset.MinValue);

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        try
        {
            var payload = Encoding.UTF8.GetString(Convert.FromBase64String(value));
            if (!DateTimeOffset.TryParse(payload, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var modifiedAt))
            {
                return false;
            }

            cursor = new EntryCursor(modifiedAt.ToUniversalTime());
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
