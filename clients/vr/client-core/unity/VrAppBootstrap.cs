using UnityEngine;
using VRPoker.Audio;
using VRPoker.Netcode;

namespace VRPoker.ClientCore
{
    /// <summary>
    /// Scene entry: table layout, XR rig, server connection. Poker truth stays on WebSocketTableClient.
    /// </summary>
    public sealed class VrAppBootstrap : MonoBehaviour
    {
        [SerializeField] VrClientConfig _config = new();
        [SerializeField] VrCameraRig _rig;
        [SerializeField] TableSpatialLayout _layout;
        [SerializeField] ComfortProfile _comfort;
        [SerializeField] MetaXrBootstrap _metaXr;
        [SerializeField] WebSocketTableClient _wsClient;
        [SerializeField] VrPresenceBroadcaster _presence;
        [SerializeField] ServerAuthoritativeTableView _tableView;
        [SerializeField] PhotonRealtimePresenceRoom _photonRoom;
        [SerializeField] AudioBus _audioBus;
        [SerializeField] VrAudioSession _audioSession;
        [SerializeField] bool _connectOnStart = true;

        public VrClientConfig Config => _config;

        void Awake()
        {
            if (_audioBus == null)
            {
                _audioBus = FindObjectOfType<AudioBus>();
                if (_audioBus == null)
                {
                    var go = new GameObject("AudioBus");
                    _audioBus = go.AddComponent<AudioBus>();
                }
            }
        }

        void Start()
        {
            _rig?.Configure(_config);
            _layout?.Configure(_config);
            _comfort?.Apply(_config);
            _metaXr?.EnsureOpenXrLoader();

            if (_wsClient != null)
            {
                _wsClient.Configure(_config.gameServerHttp, _config.tableId, _config.playerId);
                WirePresence();
                if (_connectOnStart) _wsClient.Connect();
            }

            _photonRoom?.ConnectToRoom(_config.tableId);
        }

        void WirePresence()
        {
            if (_presence == null || _rig == null) return;
            // VrPresenceBroadcaster uses SerializeField — set via inspector or extend with public setters.
            // Production: assign head/hands in editor from VrCameraRig transforms.
        }

        public void SetServer(string httpBase, string tableId, string playerId)
        {
            _config.gameServerHttp = httpBase;
            _config.tableId = tableId;
            _config.playerId = playerId;
            _wsClient?.Configure(httpBase, tableId, playerId);
        }
    }
}
