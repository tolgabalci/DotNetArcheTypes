using System.Security.Claims;

namespace MermaidNotes.Api.Modules.Entries;

public interface ICurrentUser
{
    string UserId { get; }
}

internal sealed class HttpContextCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string UserId
    {
        get
        {
            var user = accessor.HttpContext?.User;
            var subject = user?.FindFirstValue("sub") ?? user?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(subject))
            {
                throw new InvalidOperationException("The current request is authenticated but does not contain a subject claim.");
            }

            return subject;
        }
    }
}
