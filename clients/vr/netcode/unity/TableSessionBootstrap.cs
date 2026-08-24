using System;
using System.Threading.Tasks;
using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Boots a full session: HTTP account/sit/start then WebSocket connect with auto-reconnect.
    /// </summary>
    public sealed class TableSessionBootstrap : MonoBehaviour
    {
        [SerializeField] TableHttpClient _http;
        [SerializeField] WebSocketTableClient _ws;
        [SerializeField] string _tableId = "felt-1";
        [SerializeField] string _playerId = "player-1";
        [SerializeField] string _displayName = "Player";
        [SerializeField] int _buyIn = 10000;
        [SerializeField] bool _createTableIfMissing = true;
        [SerializeField] bool _autoStartHand = false;

        public async void JoinAndConnect()
        {
            if (_http == null || _ws == null)
            {
                Debug.LogError("TableSessionBootstrap requires TableHttpClient and WebSocketTableClient");
                return;
            }

            try
            {
                await _http.EnsureAccountAsync(_playerId, _displayName);
                if (_createTableIfMissing)
                {
                    try
                    {
                        await _http.CreateTableAsync(_tableId);
                    }
                    catch
                    {
                        /* table may already exist */
                    }
                }
                await _http.SitAsync(_tableId, _playerId, _displayName, _buyIn);
                _ws.Configure(_http.ServerHttp, _tableId, _playerId);
                _ws.Connect();
                if (_autoStartHand)
                    await _http.StartHandAsync(_tableId);
            }
            catch (Exception ex)
            {
                Debug.LogError($"TableSessionBootstrap failed: {ex.Message}");
            }
        }
    }
}
