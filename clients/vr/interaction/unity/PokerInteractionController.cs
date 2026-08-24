using UnityEngine;
using VRPoker.Audio;
using VRPoker.ClientCore;
using VRPoker.Netcode;

namespace VRPoker.Interaction
{
    /// <summary>
    /// Orchestrates betting gestures, pads, and controller fallback. Updates from server state only.
    /// </summary>
    public sealed class PokerInteractionController : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] PokerActionRelay _relay;
        [SerializeField] BettingActionPad _actionPad;
        [SerializeField] ChipSlideGesture _chipSlide;
        [SerializeField] ControllerBettingMap _controllerMap;
        [SerializeField] TableAudioDirector _audio;
        [SerializeField] VrCameraRig _rig;
        [SerializeField] SeatAnchor _mySeat;
        [SerializeField] Transform _potCenter;
        [SerializeField] int _mySeatIndex = -1;

        string _lastState;

        void OnEnable()
        {
            if (_client != null) _client.OnStateJson += OnState;
            if (_chipSlide != null) _chipSlide.OnSlideCommitted += OnChipSlide;
            WireChipSlide();
        }

        void OnDisable()
        {
            if (_client != null) _client.OnStateJson -= OnState;
            if (_chipSlide != null) _chipSlide.OnSlideCommitted -= OnChipSlide;
        }

        void WireChipSlide()
        {
            if (_chipSlide == null || _rig == null || _mySeat == null) return;
            var hand = _rig.RightHand != null ? _rig.RightHand : _rig.LeftHand;
            var tray = _mySeat.ChipTray != null ? _mySeat.ChipTray : _mySeat.ActionZone;
            var pot = _potCenter != null ? _potCenter : _mySeat.transform;
            _chipSlide.Bind(hand, tray, pot);
        }

        public void BindSeat(SeatAnchor seat, int seatIndex)
        {
            _mySeat = seat;
            _mySeatIndex = seatIndex;
            WireChipSlide();
        }

        void OnState(string json)
        {
            _lastState = json;
            var legal = LegalActionProbe.ParseLegal(json);
            var myTurn = _mySeatIndex >= 0 && LegalActionProbe.IsMyTurn(json, _mySeatIndex);
            _actionPad?.ApplyLegalActions(legal, myTurn);
        }

        void OnChipSlide(float distance)
        {
            if (_relay == null || string.IsNullOrEmpty(_lastState)) return;
            var legal = LegalActionProbe.ParseLegal(_lastState);
            foreach (var opt in legal)
            {
                if (opt.Type == PokerActionType.Bet)
                {
                    _relay.Bet(opt.Min ?? 100);
                    _audio?.PlayBet(_mySeat != null ? _mySeat.ActionZone.position : transform.position);
                    return;
                }
                if (opt.Type == PokerActionType.Raise)
                {
                    _relay.RaiseTo(opt.Min ?? 100);
                    _audio?.PlayBet(_mySeat != null ? _mySeat.ActionZone.position : transform.position);
                    return;
                }
            }
        }
    }
}
