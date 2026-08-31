using System;
using UnityEngine;
using VRPoker.Netcode;

namespace VRPoker.Interaction
{
    /// <summary>Sends betting intents to game-server WS. Server accepts or rejects — never local simulation.</summary>
    public sealed class PokerActionRelay : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] float _cooldownSeconds = 0.35f;

        float _nextSend;

        public event Action<string, int?> OnActionSent;
        public event Action<string> OnActionBlocked;

        public bool CanSend => Time.unscaledTime >= _nextSend;

        public void Request(string actionType, int? amount = null)
        {
            if (!CanSend)
            {
                OnActionBlocked?.Invoke("cooldown");
                return;
            }
            if (_client == null)
            {
                OnActionBlocked?.Invoke("no client");
                return;
            }
            _nextSend = Time.unscaledTime + _cooldownSeconds;
            _client.SendAction(actionType, amount);
            OnActionSent?.Invoke(actionType, amount);
        }

        public void Fold() => Request(PokerActionType.Fold);
        public void Check() => Request(PokerActionType.Check);
        public void Call() => Request(PokerActionType.Call);
        public void AllIn() => Request(PokerActionType.AllIn);
        public void Bet(int amount) => Request(PokerActionType.Bet, amount);
        public void RaiseTo(int amount) => Request(PokerActionType.Raise, amount);
    }
}
