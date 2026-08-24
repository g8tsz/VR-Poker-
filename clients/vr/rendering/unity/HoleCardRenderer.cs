using System.Collections.Generic;
using UnityEngine;
using VRPoker.ClientCore;

namespace VRPoker.Rendering
{
    /// <summary>Hole cards per seat — face down for opponents until showdown.</summary>
    public sealed class HoleCardRenderer : MonoBehaviour
    {
        [SerializeField] TableSpatialLayout _layout;
        [SerializeField] CardPool _pool;
        [SerializeField] string _localPlayerId;
        [SerializeField] float _spread = 0.04f;
        [SerializeField] float _lift = 0.01f;

        readonly Dictionary<int, List<CardVisual>> _bySeat = new();

        public void SetLocalPlayer(string playerId) => _localPlayerId = playerId;

        public void ApplySeat(int seat, IReadOnlyList<string> hole, bool reveal, string playerId)
        {
            ClearSeat(seat);
            if (_pool == null || _layout == null || hole == null || hole.Count == 0) return;
            var anchor = SeatAt(seat);
            if (anchor == null) return;
            var parent = anchor.ChipTray != null ? anchor.ChipTray : anchor.transform;
            var showFace = reveal || playerId == _localPlayerId;
            var list = new List<CardVisual>();
            for (var i = 0; i < hole.Count; i++)
            {
                CardCode.TryParse(hole[i], out var code);
                var card = _pool.Rent();
                if (card == null) continue;
                card.gameObject.SetActive(true);
                card.transform.SetParent(parent, false);
                var offset = (i - (hole.Count - 1) * 0.5f) * _spread;
                card.transform.localPosition = new Vector3(offset, _lift, 0.02f);
                card.transform.localRotation = Quaternion.Euler(-15f, 0f, 0f);
                card.SetCard(code, showFace && code.IsValid);
                list.Add(card);
            }
            _bySeat[seat] = list;
        }

        public void ClearSeat(int seat)
        {
            if (!_bySeat.TryGetValue(seat, out var list)) return;
            foreach (var c in list) _pool?.Release(c);
            _bySeat.Remove(seat);
        }

        public void ClearAll()
        {
            foreach (var kv in _bySeat)
                foreach (var c in kv.Value) _pool?.Release(c);
            _bySeat.Clear();
        }

        SeatAnchor SeatAt(int seat)
        {
            var seats = _layout != null ? _layout.Seats : null;
            if (seats == null || seat < 0 || seat >= seats.Length) return null;
            return seats[seat];
        }
    }
}
