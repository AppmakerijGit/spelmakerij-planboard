using System.Net;
using planboard.Auth;

namespace planboard.Http;

public class JwtHttpMessageHandler : DelegatingHandler
{
    private readonly JwtAuthStateProvider _auth;

    public JwtHttpMessageHandler(JwtAuthStateProvider auth) => _auth = auth;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = _auth.GetToken();
        if (!string.IsNullOrEmpty(token))
            request.Headers.Authorization = new("Bearer", token);

        if (request.Content is not null)
            await request.Content.LoadIntoBufferAsync(cancellationToken);

        var response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized &&
            request.Headers.Authorization is not null)
        {
            var refreshed = await _auth.TryRefreshAsync();
            if (refreshed)
            {
                var retry = await CloneRequestAsync(request, cancellationToken);
                retry.Headers.Authorization = new("Bearer", _auth.GetToken()!);
                return await base.SendAsync(retry, cancellationToken);
            }
        }

        return response;
    }

    private static async Task<HttpRequestMessage> CloneRequestAsync(
        HttpRequestMessage original, CancellationToken ct)
    {
        var clone = new HttpRequestMessage(original.Method, original.RequestUri);
        foreach (var header in original.Headers)
            if (header.Key != "Authorization")
                clone.Headers.TryAddWithoutValidation(header.Key, header.Value);
        if (original.Content is not null)
        {
            var bytes = await original.Content.ReadAsByteArrayAsync(ct);
            clone.Content = new ByteArrayContent(bytes);
            foreach (var header in original.Content.Headers)
                clone.Content.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }
        return clone;
    }
}
