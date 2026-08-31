using System.Collections.Generic;
using UnityEngine;

namespace VRPoker.Rendering
{
    public sealed class CardPool : MonoBehaviour
    {
        [SerializeField] CardVisual _prefab;
        [SerializeField] int _warmCount = 20;
        readonly Stack<CardVisual> _free = new();

        void Awake()
        {
            if (_prefab == null) return;
            for (var i = 0; i < _warmCount; i++)
                _free.Push(Create());
        }

        public CardVisual Rent()
        {
            if (_free.Count > 0) return _free.Pop();
            return _prefab != null ? Create() : null;
        }

        public void Release(CardVisual card)
        {
            if (card == null) return;
            card.gameObject.SetActive(false);
            card.transform.SetParent(transform, false);
            _free.Push(card);
        }

        CardVisual Create()
        {
            var inst = Instantiate(_prefab, transform);
            inst.gameObject.SetActive(false);
            return inst;
        }
    }
}
