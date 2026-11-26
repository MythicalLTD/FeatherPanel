using System.Runtime.CompilerServices;

namespace FeatherCli.Core.Helpers;

public static class LoggerHelper {
    public static string APP_URL = "https://api.featherpanel.com";
    public static void uploadLogsToSupport(string path) {
        if (!File.Exists(path)) {
            throw new FileNotFoundException("The request file was not found on the system");
        }

        // Read the file content
        var fileContent = File.ReadAllText(path);
        

        //Ensure that the file content is not empty 
        if (string.IsNullOrEmpty(fileContent)) {
            throw new InvalidOperationException("The request file is empty");
        }

        // Create a new HTTP client
        var httpClient = new HttpClient();
        // Create a new HTTP request
        var request = new HttpRequestMessage(HttpMethod.Post, $"{APP_URL}/api/v1/logs/upload");
        
    }

    
}