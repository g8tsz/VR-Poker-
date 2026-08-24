using System;
using System.Collections.Concurrent;
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
    /// Outgoing messages are action intents, table lifecycle, and local VR presence.
    /// Network callbacks are marshalled to the Unity main thread.
    /// </summary>
    public sealed class WebSocketTableClient : MonoBehaviour
    {
        [SerializeField] string _serverHttp = "http://127.0.0.1:8787";
        [SerializeField] string _tableId = "felt-1";
        [SerializeField] string _playerId = "player-1";
        [SerializeField] bool _autoReconnect = true;
        [SerializeField] float _reconnectDelaySeconds = 2f;
        [SerializeField] float _pingIntervalSeconds = 15f;

        ClientWebSocket _ws;
        CancellationTokenSource _cts;
        readonly ConcurrentQueue<Action> _mainThreadQueue = new();
        float _nextPing;
        bool _reconnectScheduled;
        long _serverTimeOffsetMs;

        public event Action<string> OnStateJson;
        public event Action<string> OnPresenceJson;
        public event Action<string> OnError;
        public event Action OnConnected;

        public string TableId => _tableId;
        public string PlayerId => _playerId;
        public bool IsConnected => _ws != null && _ws.State == WebSocketState.Open;

        public long ServerNowMs() =>
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + _serverTimeOffsetMs;

        public void Configure(string httpBase, string tableId, string playerId)
        {
            _serverHttp = httpBase;
            _tableId = tableId;
            _playerId = playerId;
        }

        public async void Connect()
        {
            _reconnectScheduled = false;
            DisposeSocket();
            _cts = new CancellationTokenSource();
            _ws = new ClientWebSocket();
            var uri = BuildWsUri(_serverHttp, _tableId, _playerId);
            try
            {
                await _ws.ConnectAsync(uri, _cts.Token);
                EnqueueMain(() => OnConnected?.Invoke());
                _ = ReceiveLoop(_cts.Token);
            }
            catch (Exception ex)
            {
                EnqueueMain(() => OnError?.Invoke(ex.Message));
                ScheduleReconnect();
            }
        }

        public void SendJson(string json)
        {
            if (_ws == null || _ws.State != WebSocketState.Open)
            {
                EnqueueMain(() => OnError?.Invoke("not connected"));
                return;
            }
            _ = SendRawAsync(json);
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

        public void SendSit(string name, int buyIn, int? seat = null)
        {
            var seatJson = seat.HasValue ? $",\"seat\":{seat.Value}" : "";
            SendJson($"{{\"type\":\"sit\",\"name\":\"{EscapeJson(name)}\",\"buyIn\":{buyIn}{seatJson}}}");
        }

        public void SendLeave() => SendJson("{\"type\":\"leave\"}");
        public void SendStart() => SendJson("{\"type\":\"start\"}");
        public void SendPing() => SendJson("{\"type\":\"ping\"}");

        static string EscapeJson(string s) => s.Replace("\\", "\\\\").Replace("\"", "\\\"");

        static Uri BuildWsUri(string httpBase, string tableId, string playerId)
        {
            var ws = httpBase.Replace("https://", "wss://").Replace("http://", "ws://").TrimEnd('/');
            return new Uri($"{ws}/ws?tableId={Uri.EscapeDataString(tableId)}&playerId={Uri.EscapeDataString(playerId)}");
        }

        async Task SendRawAsync(string json)
        {
            try
            {
                var bytes = Encoding.UTF8.GetBytes(json);
                await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch (Exception ex)
            {
                EnqueueMain(() => OnError?.Invoke(ex.Message));
            }
        }

        async Task ReceiveLoop(CancellationToken ct)
        {
            var buf = new byte[64 * 1024];
            while (!ct.IsCancellationRequested && _ws != null && _ws.State == WebSocketState.Open)
            {
                var sb = new StringBuilder();
                WebSocketReceiveResult result;
                try
                {
                    do
                    {
                        result = await _ws.ReceiveAsync(new ArraySegment<byte>(buf), ct);
                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            ScheduleReconnect();
                            return;
                        }
                        sb.Append(Encoding.UTF8.GetString(buf, 0, result.Count));
                    } while (!result.EndOfMessage);
                }
                catch
                {
                    ScheduleReconnect();
                    return;
                }

                var text = sb.ToString();
                DispatchMessage(text);
            }
        }

        void DispatchMessage(string text)
        {
            var type = NetcodeJson.ExtractType(text);
            switch (type)
            {
                case "welcome":
                    var serverTime = NetcodeJson.ExtractLong(text, "serverTime");
                    if (serverTime.HasValue) SyncServerTime(serverTime.Value);
                    break;
                case "pong":
                    var pongTime = NetcodeJson.ExtractLong(text, "serverTime");
                    if (pongTime.HasValue) SyncServerTime(pongTime.Value);
                    break;
                case "state":
                    EnqueueMain(() => OnStateJson?.Invoke(text));
                    break;
                case "presence":
                    EnqueueMain(() => OnPresenceJson?.Invoke(text));
                    break;
                case "error":
                    var msg = NetcodeJson.ExtractString(text, "message") ?? "error";
                    EnqueueMain(() => OnError?.Invoke(msg));
                    break;
            }
        }

        void SyncServerTime(long serverTimeMs)
        {
            _serverTimeOffsetMs = serverTimeMs - DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        }

        void EnqueueMain(Action action) => _mainThreadQueue.Enqueue(action);

        void Update()
        {
            while (_mainThreadQueue.TryDequeue(out var action))
                action();

            if (!IsConnected) return;
            if (Time.unscaledTime < _nextPing) return;
            _nextPing = Time.unscaledTime + _pingIntervalSeconds;
            SendPing();
        }

        void ScheduleReconnect()
        {
            if (!_autoReconnect || _reconnectScheduled) return;
            _reconnectScheduled = true;
            EnqueueMain(() => OnError?.Invoke("disconnected"));
            _ = ReconnectAfterDelay();
        }

        async Task ReconnectAfterDelay()
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_reconnectDelaySeconds));
            }
            catch
            {
                return;
            }
            _reconnectScheduled = false;
            if (_autoReconnect && !IsConnected)
                Connect();
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
