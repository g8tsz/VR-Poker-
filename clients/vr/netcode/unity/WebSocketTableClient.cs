using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Connects to the game-server WebSocket. Incoming <c>state</c> messages are poker truth.
    /// Outgoing messages are action intents and local VR presence only.
    /// </summary>
    public sealed class WebSocketTableClient : MonoBehaviour
    {
        [SerializeField] string _serverHttp = "http://127.0.0.1:8787";
        [SerializeField] string _tableId = "felt-1";
        [SerializeField] string _playerId = "player-1";

        ClientWebSocket _ws;
        CancellationTokenSource _cts;

        public event Action<string> OnStateJson;
        public event Action<string> OnPresenceJson;
        public event Action<string> OnError;

        public string TableId => _tableId;
        public string PlayerId => _playerId;

        public void Configure(string httpBase, string tableId, string playerId)
        {
            _serverHttp = httpBase;
            _tableId = tableId;
            _playerId = playerId;
        }

        public async void Connect()
        {
            DisposeSocket();
            _cts = new CancellationTokenSource();
            _ws = new ClientWebSocket();
            var uri = BuildWsUri(_serverHttp, _tableId, _playerId);
            await _ws.ConnectAsync(uri, _cts.Token);
            _ = ReceiveLoop(_cts.Token);
        }

        public async void SendJson(string json)
        {
            if (_ws == null || _ws.State != WebSocketState.Open) return;
            var bytes = Encoding.UTF8.GetBytes(json);
            await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }

        public void SendAction(string actionType, int? amount = null)
        {
            var json = amount.HasValue
                ? $"{{\"type\":\"action\",\"action\":{{\"type\":\"{actionType}\",\"amount\":{amount.Value}}}}}"
                : $"{{\"type\":\"action\",\"action\":{{\"type\":\"{actionType}\"}}}}";
            SendJson(json);
        }

        public void SendPresenceJson(string poseJson)
        {
            SendJson($"{{\"type\":\"presence\",\"pose\":{poseJson}}}");
        }

        static Uri BuildWsUri(string httpBase, string tableId, string playerId)
        {
            var ws = httpBase.Replace("https://", "wss://").Replace("http://", "ws://").TrimEnd('/');
            return new Uri($"{ws}/ws?tableId={Uri.EscapeDataString(tableId)}&playerId={Uri.EscapeDataString(playerId)}");
        }

        async Task ReceiveLoop(CancellationToken ct)
        {
            var buf = new byte[64 * 1024];
            while (!ct.IsCancellationRequested && _ws != null && _ws.State == WebSocketState.Open)
            {
                var sb = new StringBuilder();
                WebSocketReceiveResult result;
                do
                {
                    result = await _ws.ReceiveAsync(new ArraySegment<byte>(buf), ct);
                    if (result.MessageType == WebSocketMessageType.Close) return;
                    sb.Append(Encoding.UTF8.GetString(buf, 0, result.Count));
                } while (!result.EndOfMessage);

                var text = sb.ToString();
                if (text.Contains("\"type\":\"state\""))
                    OnStateJson?.Invoke(text);
                else if (text.Contains("\"type\":\"presence\""))
                    OnPresenceJson?.Invoke(text);
                else if (text.Contains("\"type\":\"error\""))
                    OnError?.Invoke(text);
            }
        }

        void OnDestroy() => DisposeSocket();

        void DisposeSocket()
        {
            try { _cts?.Cancel(); } catch { }
            _ws?.Dispose();
            _ws = null;
        }
    }
}
