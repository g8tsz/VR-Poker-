using System;
using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Applies server table snapshots to the scene. Never simulates cards, pots, or winners.
    /// Wire this to <see cref="WebSocketTableClient.OnStateJson"/>.
    /// </summary>
    public sealed class ServerAuthoritativeTableView : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] int _potChips;
        [SerializeField] string _street = "waiting";

        public int PotChips => _potChips;
        public string Street => _street;

        void OnEnable()
        {
            if (_client != null)
                _client.OnStateJson += ApplyState;
        }

        void OnDisable()
        {
            if (_client != null)
                _client.OnStateJson -= ApplyState;
        }

        void ApplyState(string json)
        {
            // JsonUtility cannot parse arbitrary server payloads; production uses Newtonsoft or
            // generated DTOs. For now we surface key fields via simple string probes.
            if (json.Contains("\"pot\""))
            {
                var idx = json.IndexOf("\"pot\":", StringComparison.Ordinal);
                if (idx >= 0)
                {
                    var tail = json.Substring(idx + 6);
                    var end = tail.IndexOfAny(new[] { ',', '}' });
                    if (end > 0 && int.TryParse(tail.Substring(0, end), out var pot))
                        _potChips = pot;
                }
            }
            foreach (var s in new[] { "waiting", "preflop", "flop", "turn", "river", "showdown", "payout" })
            {
                if (json.Contains($"\"street\":\"{s}\""))
                {
                    _street = s;
                    break;
                }
            }
        }
    }
}
