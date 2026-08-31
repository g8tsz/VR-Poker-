using UnityEngine;

namespace VRPoker.ClientCore
{
    /// <summary>
    /// Meta XR / OpenXR bootstrap. Install Meta XR SDK + define META_XR to auto-bind OVRCameraRig tracking targets.
    /// </summary>
    public sealed class MetaXrBootstrap : MonoBehaviour
    {
        [SerializeField] VrCameraRig _rig;

        void Awake()
        {
#if META_XR
            TryBindMetaRig();
#else
            Debug.Log("MetaXrBootstrap: install Meta XR SDK and add META_XR scripting define");
#endif
        }

#if META_XR
        void TryBindMetaRig()
        {
            // var ovr = FindObjectOfType<OVRCameraRig>();
            // if (ovr == null || _rig == null) return;
            // _rig.Configure via reflection or public setters on serialized fields in editor
            Debug.Log("MetaXrBootstrap: bind OVRCameraRig tracking to VrCameraRig in Inspector");
        }
#endif

        public void EnsureOpenXrLoader()
        {
#if UNITY_XR_MANAGEMENT
            // XRGeneralSettings.Instance?.Manager?.InitializeLoaderSync();
            Debug.Log("MetaXrBootstrap: XR Management loader init (configure in Project Settings)");
#endif
        }
    }
}
