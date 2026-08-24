using UnityEngine;
using VRPoker.ClientCore;
using VRPoker.Netcode;

namespace VRPoker.Rendering
{
    /// <summary>
    /// Main rendering driver — snaps cards/chips to server state; optional deal animation.
    /// </summary>
    public sealed class TableRenderer : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] BoardRenderer _board;
        [SerializeField] HoleCardRenderer _holes;
        [SerializeField] ChipStackRenderer _chips;
        [SerializeField] DealAnimationDirector _dealAnim;
        [SerializeField] bool _animateDeals = true;

        string _lastJson;
        int _lastHandId = -1;
        string _lastStreet = "waiting";

        void OnEnable()
        {
            if (_client != null) _client.OnStateJson += OnState;
        }

        void OnDisable()
        {
            if (_client != null) _client.OnStateJson -= OnState;
        }

        void OnState(string json)
        {
            _lastJson = json;
            var street = TableStateProbe.ParseStreet(json);
            var handId = TableStateProbe.ParseHandId(json);
            var pot = TableStateProbe.ParsePot(json);
            var board = TableStateProbe.ParseBoard(json);
            var seats = TableStateProbe.ParseSeatStacks(json);

            var newHand = handId != _lastHandId;
            if (newHand)
            {
                _holes?.ClearAll();
                _dealAnim?.SkipAll();
            }

            _board?.ApplyBoard(board);
            _chips?.Clear();
            _chips?.ApplyPot(pot);
            _chips?.ApplySeatCommits(seats);

            if (newHand && !_animateDeals) _dealAnim?.SkipAll();

            _lastHandId = handId;
            _lastStreet = street;
        }

        public void SetLocalPlayer(string playerId) => _holes?.SetLocalPlayer(playerId);

        public void SetAnimateDeals(bool enabled) => _animateDeals = enabled;
    }
}
