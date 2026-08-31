using UnityEngine;
using VRPoker.ClientCore;
using VRPoker.Netcode;
using VRPoker.Platform;

namespace VRPoker.Rendering
{
    /// <summary>Wires rendering subsystems at scene start.</summary>
    public sealed class RenderingBootstrap : MonoBehaviour
    {
        [SerializeField] VrAppBootstrap _app;
        [SerializeField] PlatformBootstrap _platform;
        [SerializeField] TableRenderer _tableRenderer;
        [SerializeField] CosmeticSkinApplier _skins;
        [SerializeField] WebSocketTableClient _client;

        void Start()
        {
            var config = _app != null ? _app.Config : null;
            if (config != null)
            {
                _tableRenderer?.SetLocalPlayer(config.playerId);
                var cosmeticsUrl = _platform?.ActiveEnvironment?.cosmeticsHttp ?? "http://127.0.0.1:8790";
                _skins?.Configure(cosmeticsUrl, config.playerId);
            }
        }
    }
}
