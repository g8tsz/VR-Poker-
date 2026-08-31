using UnityEngine;
using VRPoker.ClientCore;

namespace VRPoker.Platform
{
    /// <summary>
    /// Platform entry: performance budget, comfort policy, privacy/age gates, environment URLs.
    /// Add alongside VrAppBootstrap — does not own poker state.
    /// </summary>
    public sealed class PlatformBootstrap : MonoBehaviour
    {
        [SerializeField] PlatformChannel _channel = PlatformChannel.Quest;
        [SerializeField] PlatformEnvironmentConfig _development = new();
        [SerializeField] PlatformEnvironmentConfig _staging = new() { name = "staging", gameServerHttp = "https://staging.example.com" };
        [SerializeField] PlatformEnvironmentConfig _production = new() { name = "production", authRequired = true, gameServerHttp = "https://api.example.com" };
        [SerializeField] VrAppBootstrap _app;
        [SerializeField] QuestPerformanceBudget _performance;
        [SerializeField] QuestComfortPolicy _comfort;
        [SerializeField] ApplicationFocusHandler _focus;
        [SerializeField] PrivacyDisclosureController _privacy;
        [SerializeField] AgeRatingGate _ageGate;
        [SerializeField] SteamPlatformBootstrap _steam;
        [SerializeField] StoreComplianceRegistry _compliance;
        [SerializeField] bool _useProductionInRelease = true;

        PlatformEnvironmentConfig _active;

        public PlatformChannel Channel => _channel;
        public PlatformEnvironmentConfig ActiveEnvironment => _active;
        public StoreComplianceRegistry Compliance => _compliance;

        void Awake()
        {
            _active = ResolveEnvironment();
            if (_channel == PlatformChannel.Editor) _channel = PlatformChannel.Quest;
        }

        void Start()
        {
            _performance?.Apply();
            var config = _app != null ? _app.Config : new VrClientConfig();
            ApplyEnvironment(config);
            _comfort?.Apply(config);
            _steam?.Apply();

            if (_performance != null && _compliance != null)
                _compliance.Mark("perf-72hz", _performance.TargetFps >= 72);
            if (_comfort != null && _compliance != null)
                _compliance.Mark("comfort-seated", _comfort.IsCompliant);
        }

        PlatformEnvironmentConfig ResolveEnvironment()
        {
#if UNITY_EDITOR
            return _development;
#elif DEVELOPMENT_BUILD
            return _staging;
#else
            return _useProductionInRelease ? _production : _staging;
#endif
        }

        void ApplyEnvironment(VrClientConfig config)
        {
            if (_app == null || _active == null) return;
            _app.SetServer(_active.gameServerHttp, config.tableId, config.playerId);
        }

        public bool CanEnterTable() =>
            (_privacy == null || _privacy.HasAccepted) &&
            (_ageGate == null || _ageGate.IsConfirmed);
    }
}
