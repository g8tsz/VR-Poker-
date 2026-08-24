using System.Collections.Generic;
using UnityEngine;
using VRPoker.ClientCore;

namespace VRPoker.Rendering
{
    /// <summary>Procedural chip stacks at pot and seat commits — no physics simulation.</summary>
    public sealed class ChipStackRenderer : MonoBehaviour
    {
        [SerializeField] TableAnchor _table;
        [SerializeField] TableSpatialLayout _layout;
        [SerializeField] GameObject _chipPrefab;
        [SerializeField] int _chipsPerStack = 8;
        [SerializeField] float _chipHeight = 0.004f;
        [SerializeField] float _stackRadius = 0.02f;

        readonly List<GameObject> _spawned = new();

        public void ApplyPot(int potChips)
        {
            Clear();
            if (_chipPrefab == null || _table == null) return;
            SpawnStack(_table.PotCenter.position, potChips);
        }

        public void ApplySeatCommits(IReadOnlyList<SeatStackProbe> seats)
        {
            if (_layout == null || _chipPrefab == null) return;
            foreach (var s in seats)
            {
                if (s.StreetCommit <= 0 || s.Folded) continue;
                var anchor = SeatAt(s.Seat);
                if (anchor == null) continue;
                var pos = anchor.ActionZone != null ? anchor.ActionZone.position : anchor.transform.position;
                SpawnStack(pos, s.StreetCommit);
            }
        }

        void SpawnStack(Vector3 worldPos, int amount)
        {
            var stacks = Mathf.Clamp(amount / 100, 1, 12);
            for (var i = 0; i < stacks; i++)
            {
                var angle = i * 0.9f;
                var offset = new Vector3(Mathf.Cos(angle), i * _chipHeight, Mathf.Sin(angle)) * _stackRadius;
                var go = Instantiate(_chipPrefab, worldPos + offset, Quaternion.identity, transform);
                _spawned.Add(go);
            }
        }

        public void Clear()
        {
            foreach (var go in _spawned) Destroy(go);
            _spawned.Clear();
        }

        SeatAnchor SeatAt(int seat)
        {
            var seats = _layout != null ? _layout.Seats : null;
            if (seats == null || seat < 0 || seat >= seats.Length) return null;
            return seats[seat];
        }
    }
}
