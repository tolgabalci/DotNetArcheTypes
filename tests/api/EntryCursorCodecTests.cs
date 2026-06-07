using MermaidNotes.Api.Modules.Entries;
using Shouldly;

namespace MermaidNotes.Api.Tests;

public sealed class EntryCursorCodecTests
{
    [Fact]
    public void CursorRoundTripsModifiedTimestamp()
    {
        var modifiedAt = new DateTimeOffset(2026, 6, 7, 12, 30, 15, TimeSpan.Zero);

        var encoded = EntryCursorCodec.Encode(modifiedAt);

        EntryCursorCodec.TryDecode(encoded, out var decoded).ShouldBeTrue();
        decoded.ModifiedAt.ShouldBe(modifiedAt);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-base64")]
    public void InvalidCursorReturnsFalse(string value)
    {
        EntryCursorCodec.TryDecode(value, out _).ShouldBeFalse();
    }
}
