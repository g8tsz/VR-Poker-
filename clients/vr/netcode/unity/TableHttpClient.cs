using System;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace VRPoker.Netcode
{
    /// <summary>
    /// HTTP bootstrap for table lifecycle (account, sit, leave, start).
    /// Use alongside <see cref="WebSocketTableClient"/> or send sit/leave/start over WS instead.
    /// </summary>
    public sealed class TableHttpClient : MonoBehaviour
    {
        [SerializeField] string _serverHttp = "http://127.0.0.1:8787";

        public string ServerHttp => _serverHttp;

        public void Configure(string httpBase) => _serverHttp = httpBase.TrimEnd('/');

        public async Task EnsureAccountAsync(string playerId, string name)
        {
            var body = $"{{\"playerId\":\"{Escape(playerId)}\",\"name\":\"{Escape(name)}\"}}";
            await PostAsync("/accounts", body);
        }

        public async Task CreateTableAsync(string tableId)
        {
            var body = $"{{\"id\":\"{Escape(tableId)}\"}}";
            await PostAsync("/tables", body);
        }

        public async Task SitAsync(string tableId, string playerId, string name, int buyIn, int? seat = null)
        {
            var seatJson = seat.HasValue ? $",\"seat\":{seat.Value}" : "";
            var body =
                $"{{\"playerId\":\"{Escape(playerId)}\",\"name\":\"{Escape(name)}\",\"buyIn\":{buyIn}{seatJson}}}";
            await PostAsync($"/tables/{Uri(tableId)}/sit", body);
        }

        public async Task LeaveAsync(string tableId, string playerId)
        {
            var body = $"{{\"playerId\":\"{Escape(playerId)}\"}}";
            await PostAsync($"/tables/{Uri(tableId)}/leave", body);
        }

        public async Task StartHandAsync(string tableId)
        {
            await PostAsync($"/tables/{Uri(tableId)}/start", "{}");
        }

        public async Task<string> GetTableJsonAsync(string tableId, string playerId = null)
        {
            var path = $"/tables/{Uri(tableId)}";
            if (!string.IsNullOrEmpty(playerId))
                path += $"?playerId={UriEscape(playerId)}";
            return await GetAsync(path);
        }

        static string Escape(string s) => s.Replace("\\", "\\\\").Replace("\"", "\\\"");
        static string Uri(string id) => UriEscape(id);
        static string UriEscape(string s) => UnityWebRequest.EscapeURL(s);

        async Task PostAsync(string path, string jsonBody)
        {
            using var req = new UnityWebRequest($"{_serverHttp}{path}", "POST");
            var bytes = Encoding.UTF8.GetBytes(jsonBody);
            req.uploadHandler = new UploadHandlerRaw(bytes);
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            var op = req.SendWebRequest();
            while (!op.isDone) await Task.Yield();
            if (req.result != UnityWebRequest.Result.Success)
                throw new Exception(req.error ?? req.downloadHandler.text);
        }

        async Task<string> GetAsync(string path)
        {
            using var req = UnityWebRequest.Get($"{_serverHttp}{path}");
            var op = req.SendWebRequest();
            while (!op.isDone) await Task.Yield();
            if (req.result != UnityWebRequest.Result.Success)
                throw new Exception(req.error ?? req.downloadHandler.text);
            return req.downloadHandler.text;
        }
    }
}
