using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Optional Photon Realtime room for voice + lobby discovery.
    /// Poker state still comes from <see cref="WebSocketTableClient"/> (server-authoritative).
    ///
    /// Install Photon Unity SDK, add PHOTON_UNITY, then wire ConnectToRoom from your bootstrap.
    /// </summary>
    public sealed class PhotonRealtimePresenceRoom : MonoBehaviour
    {
        [SerializeField] string _appId;
        [SerializeField] string _roomName = "vr-poker-table";

        public void ConnectToRoom(string tableId)
        {
            _roomName = $"table-{tableId}";
#if PHOTON_UNITY
            // PhotonNetwork.ConnectUsingSettings();
            // PhotonNetwork.JoinOrCreateRoom(_roomName, ...);
#endif
            Debug.Log($"Photon scaffold: join room {_roomName} (install Photon + PHOTON_UNITY)");
        }
    }
}
