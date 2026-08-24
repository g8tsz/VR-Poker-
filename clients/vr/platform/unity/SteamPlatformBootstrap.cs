using UnityEngine;

namespace VRPoker.Platform
{
    /// <summary>Parallel Steam checklist — does not change game design.</summary>
    public sealed class SteamPlatformBootstrap : MonoBehaviour
    {
        [SerializeField] StoreComplianceRegistry _registry;
        [SerializeField] bool _enableSteamInput = true;
        [SerializeField] string _steamAppId = "0";

        public string SteamAppId => _steamAppId;

        public void Apply()
        {
#if STEAMWORKS
            if (_enableSteamInput)
                _registry?.Mark("steam-input", true, PlatformChannel.Steam);
#else
            Debug.Log("SteamPlatformBootstrap: define STEAMWORKS and add Steamworks.NET for production");
#endif
            Debug.Log($"SteamPlatformBootstrap: appId={_steamAppId}");
        }
    }
}
