using System.Collections.Generic;
using UnityEngine;

namespace VRPoker.Interaction
{
    /// <summary>World-space action row in front of the player — fold / check / call / bet pads.</summary>
    public sealed class BettingActionPad : MonoBehaviour
    {
        [SerializeField] PokerActionRelay _relay;
        [SerializeField] ActionPadButton[] _pads;

        public void ApplyLegalActions(IReadOnlyList<LegalActionOption> legal, bool myTurn)
        {
            foreach (var pad in _pads)
            {
                if (pad == null) continue;
                pad.SetEnabled(false);
            }
            if (!myTurn || legal == null) return;

            var padIndex = 0;
            foreach (var opt in legal)
            {
                if (padIndex >= _pads.Length) break;
                var pad = _pads[padIndex++];
                var amount = opt.Min ?? 0;
                pad.Configure(opt.Type, amount, true);
                pad.OnPressed.RemoveAllListeners();
                pad.OnPressed.AddListener(() => Fire(opt.Type, amount));
            }
        }

        void Fire(string type, int amount)
        {
            if (_relay == null) return;
            switch (type)
            {
                case PokerActionType.Fold: _relay.Fold(); break;
                case PokerActionType.Check: _relay.Check(); break;
                case PokerActionType.Call: _relay.Call(); break;
                case PokerActionType.AllIn: _relay.AllIn(); break;
                case PokerActionType.Bet: _relay.Bet(amount); break;
                case PokerActionType.Raise: _relay.RaiseTo(amount); break;
            }
        }
    }
}
