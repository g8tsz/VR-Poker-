using UnityEngine;

namespace VRPoker.Interaction
{
    /// <summary>Editor / fallback controller map when hand tracking is unavailable.</summary>
    public sealed class ControllerBettingMap : MonoBehaviour
    {
        [SerializeField] PokerActionRelay _relay;
        [SerializeField] int _defaultBetAmount = 100;

        void Update()
        {
            if (_relay == null) return;
#if UNITY_EDITOR || DEVELOPMENT_BUILD
            if (Input.GetKeyDown(KeyCode.Alpha1)) _relay.Fold();
            if (Input.GetKeyDown(KeyCode.Alpha2)) _relay.Check();
            if (Input.GetKeyDown(KeyCode.Alpha3)) _relay.Call();
            if (Input.GetKeyDown(KeyCode.Alpha4)) _relay.Bet(_defaultBetAmount);
            if (Input.GetKeyDown(KeyCode.Alpha5)) _relay.AllIn();
#endif
        }

#if ENABLE_INPUT_SYSTEM
        // Wire XR Controller buttons via InputActionReference in inspector when Input System package is active.
#endif
    }
}
