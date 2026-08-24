using System.Collections.Generic;
using UnityEngine;
using VRPoker.ClientCore;

namespace VRPoker.Rendering
{
    /// <summary>Places community cards at the board anchor from server state.</summary>
    public sealed class BoardRenderer : MonoBehaviour
    {
        [SerializeField] TableAnchor _table;
        [SerializeField] CardPool _pool;
        [SerializeField] float _cardSpacing = 0.055f;
        [SerializeField] float _cardLift = 0.002f;

        readonly List<CardVisual> _active = new();

        public void ApplyBoard(IReadOnlyList<string> boardCodes)
        {
            Clear();
            if (_pool == null || _table == null) return;
            var center = _table.BoardCenter;
            var startX = -(boardCodes.Count - 1) * 0.5f * _cardSpacing;
            for (var i = 0; i < boardCodes.Count; i++)
            {
                if (!CardCode.TryParse(boardCodes[i], out var code)) continue;
                var card = _pool.Rent();
                if (card == null) continue;
                card.gameObject.SetActive(true);
                card.transform.SetParent(center, false);
                card.transform.localPosition = new Vector3(startX + i * _cardSpacing, _cardLift, 0f);
                card.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
                card.SetCard(code, true);
                _active.Add(card);
            }
        }

        public void Clear()
        {
            foreach (var c in _active)
                _pool?.Release(c);
            _active.Clear();
        }
    }
}
