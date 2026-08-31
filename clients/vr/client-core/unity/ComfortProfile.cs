using UnityEngine;

namespace VRPoker.ClientCore
{
    /// <summary>Seated-first comfort defaults — no snap-turn locomotion on the table scene.</summary>
    public sealed class ComfortProfile : MonoBehaviour
    {
        [SerializeField] VrClientConfig _config = new();
        [SerializeField] bool _disableLocomotion = true;
        [SerializeField] bool _fixedOrientation = true;

        public void Apply(VrClientConfig config)
        {
            _config = config;
            if (_config != null && _config.seatedMode)
            {
                _disableLocomotion = true;
                _fixedOrientation = true;
            }
#if META_XR
            // Disable OVRPlayerController locomotion if present — seated poker only
#endif
            Debug.Log($"ComfortProfile: seated={_config?.seatedMode} locomotionOff={_disableLocomotion}");
        }
    }
}
