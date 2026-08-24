using UnityEngine;
using VRPoker.ClientCore;

namespace VRPoker.Platform
{
    /// <summary>Store-review comfort policy — seated poker, no default locomotion.</summary>
    public sealed class QuestComfortPolicy : MonoBehaviour
    {
        [SerializeField] ComfortProfile _comfort;
        [SerializeField] VrClientConfig _config = new();
        [SerializeField] bool _blockLocomotionProviders = true;
        [SerializeField] bool _preferSeatedHeight = true;
        [SerializeField] bool _disableSnapTurn = true;
        [SerializeField] bool _disableSmoothTurn = true;

        public bool IsCompliant =>
            _config.seatedMode &&
            _blockLocomotionProviders &&
            _disableSnapTurn &&
            _disableSmoothTurn;

        public void Apply(VrClientConfig config)
        {
            _config = config ?? _config;
            if (_config != null) _config.seatedMode = true;
            _comfort?.Apply(_config);
            DisableLocomotion();
            Debug.Log($"QuestComfortPolicy: compliant={IsCompliant}");
        }

        void DisableLocomotion()
        {
            if (!_blockLocomotionProviders) return;
#if META_XR
            // Disable OVRPlayerController / locomotion components on rig
#endif
        }
    }
}
