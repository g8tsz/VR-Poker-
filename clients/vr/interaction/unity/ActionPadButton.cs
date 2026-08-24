using UnityEngine;
using UnityEngine.Events;

namespace VRPoker.Interaction
{
    /// <summary>Physical / pokeable pad for one legal action. Highlights when available.</summary>
    public sealed class ActionPadButton : MonoBehaviour
    {
        [SerializeField] string _actionType = PokerActionType.Check;
        [SerializeField] int _amount;
        [SerializeField] Renderer _renderer;
        [SerializeField] Color _idle = new(0.2f, 0.2f, 0.2f, 0.5f);
        [SerializeField] Color _active = new(0.1f, 0.6f, 0.3f, 0.9f);
        [SerializeField] Color _disabled = new(0.1f, 0.1f, 0.1f, 0.2f);

        public UnityEvent OnPressed = new();

        bool _enabled;

        public string ActionType => _actionType;
        public int Amount => _amount;

        public void Configure(string actionType, int amount, bool enabled)
        {
            _actionType = actionType;
            _amount = amount;
            SetEnabled(enabled);
        }

        public void SetEnabled(bool enabled)
        {
            _enabled = enabled;
            if (_renderer != null)
            {
                _renderer.material.color = enabled ? _active : _disabled;
            }
        }

        public void Press()
        {
            if (!_enabled) return;
            OnPressed?.Invoke();
        }

        void OnTriggerEnter(Collider other)
        {
            if (!_enabled) return;
            if (!other.CompareTag("PlayerHand")) return;
            Press();
        }
    }
}
