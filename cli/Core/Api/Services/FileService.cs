using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Models;

namespace FeatherCli.Core.Api.Services;

public class FileService : BaseApiService
{
    public FileService(HttpClient httpClient, ConfigManager configManager, ILogger<FileService> logger)
        : base(httpClient, configManager, logger)
    {
    }

    public async Task<List<ServerFileItem>> ListAsync(string uuid, string path = "/")
    {
        var endpoint = $"/api/user/servers/{uuid}/files?path={Uri.EscapeDataString(path)}";
        var request = await CreateRequestAsync(HttpMethod.Get, endpoint);
        var content = await SendRequestAsync(request, "list files");
        var response = Unpack<ServerFilesResponse>(content);
        return response.Contents ?? new List<ServerFileItem>();
    }

    public async Task<byte[]> ReadAsync(string uuid, string path)
    {
        var endpoint = $"/api/user/servers/{uuid}/file?path={Uri.EscapeDataString(path)}";
        var request = await CreateRequestAsync(HttpMethod.Get, endpoint);
        request.Headers.Remove("Accept");
        request.Headers.Add("Accept", "*/*");
        var response = await SendRawAsync(request, "read file");
        return await response.Content.ReadAsByteArrayAsync();
    }

    public async Task WriteAsync(string uuid, string path, byte[] content)
    {
        var endpoint = $"/api/user/servers/{uuid}/write-file?path={Uri.EscapeDataString(path)}";
        var request = await CreateRequestAsync(HttpMethod.Post, endpoint);
        request.Content = new ByteArrayContent(content);
        request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
        await SendRequestAsync(request, "write file");
    }

    public async Task DeleteAsync(string uuid, IEnumerable<string> files, string root = "/")
    {
        var request = await CreateRequestAsync(HttpMethod.Delete, $"/api/user/servers/{uuid}/delete-files");
        request.Content = new StringContent(
            JsonConvert.SerializeObject(new FileOperationRequest
            {
                Files = files.ToList(),
                Root = root
            }),
            Encoding.UTF8,
            "application/json");
        await SendRequestAsync(request, "delete files");
    }

    public async Task CreateDirectoryAsync(string uuid, string parentPath, string name)
    {
        var request = await CreateRequestAsync(HttpMethod.Post, $"/api/user/servers/{uuid}/create-directory");
        request.Content = new StringContent(
            JsonConvert.SerializeObject(new { name, path = parentPath }),
            Encoding.UTF8,
            "application/json");
        await SendRequestAsync(request, "create directory");
    }
}
