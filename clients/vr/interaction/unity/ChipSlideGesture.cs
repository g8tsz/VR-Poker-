using UnityEngine;

namespace VRPoker.Interaction
{
    /// <summary>Detects a forward chip slide from tray toward pot as a bet/raise intent.</summary>
    public sealed class ChipSlideGesture : MonoBehaviour
    {
        [SerializeField] Transform _hand;
        [SerializeField] Transform _chipTray;
        [SerializeField] Transform _potTarget;
        [SerializeField] float _slideDistance = 0.12f;
        [SerializeField] float _maxVertical = 0.08f;

        Vector3 _start;
        bool _armed;

        public event System.Action<float> OnSlideCommitted;

        void Update()
        {
            if (_hand == null || _chipTray == null || _potTarget == null) return;

            var toPot = (_potTarget.position - _chipTray.position).normalized;
            var handLocal = _hand.position - _chipTray.position;
            var forward = Vector3.Dot(handLocal, toPot);
            var vertical = Mathf.Abs(handLocal.y);

            if (!_armed && forward > 0.02f && vertical < _maxVertical)
            {
                _armed = true;
                _start = _hand.position;
            }

            if (!_armed) return;
            var delta = Vector3.Dot(_hand.position - _start, toPot);
            if (delta >= _slideDistance)
            {
                _armed = false;
                OnSlideCommitted?.Invoke(delta);
            }

            if (forward < 0f) _armed = false;
        }

        public void Bind(Transform hand, Transform tray, Transform pot)
        {
            _hand = hand;
            _chipTray = tray;
            _potTarget = pot;
        }
    }
}
