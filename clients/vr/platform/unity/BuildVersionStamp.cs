using UnityEngine;

namespace VRPoker.Platform
{
    /// <summary>Debug overlay — version, environment, compliance summary.</summary>
    public sealed class BuildVersionStamp : MonoBehaviour
    {
        [SerializeField] PlatformBootstrap _bootstrap;
        [SerializeField] bool _showInRelease;

        string _cached;

        void Start() => Refresh();

        public void Refresh()
        {
            var env = _bootstrap != null ? _bootstrap.ActiveEnvironment.name : "unknown";
            var ver = Application.version;
            var compliant = _bootstrap?.Compliance?.AllQuestSatisfied() == true ? "OK" : "PENDING";
            _cached = $"VR Poker v{ver} · {env} · compliance {compliant}";
        }

#if UNITY_EDITOR || DEVELOPMENT_BUILD
        void OnGUI()
        {
            if (!_showInRelease && !Application.isEditor) return;
            if (string.IsNullOrEmpty(_cached)) Refresh();
            GUI.Label(new Rect(12, 12, 600, 24), _cached);
        }
#endif
    }
}
