using UnityEngine;

namespace VRPoker.ClientCore
{
    /// <summary>Local XR tracking anchors for head + hands. Assign Meta rig bones or XR Origin children.</summary>
    public sealed class VrCameraRig : MonoBehaviour
    {
        [SerializeField] Transform _trackingOrigin;
        [SerializeField] Transform _head;
        [SerializeField] Transform _leftHand;
        [SerializeField] Transform _rightHand;
        [SerializeField] VrClientConfig _config = new();

        public Transform TrackingOrigin => _trackingOrigin != null ? _trackingOrigin : transform;
        public Transform Head => _head;
        public Transform LeftHand => _leftHand;
        public Transform RightHand => _rightHand;

        void Start() => ApplyComfort();

        public void ApplyComfort()
        {
            if (_config == null || !_config.seatedMode) return;
            var origin = TrackingOrigin;
            origin.position = new Vector3(origin.position.x, _config.seatedEyeHeight, origin.position.z);
        }

        public void Configure(VrClientConfig config)
        {
            _config = config;
            ApplyComfort();
        }
    }
}
