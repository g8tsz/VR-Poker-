using UnityEngine;

namespace VRPoker.Audio
{
    /// <summary>World anchor for spatial voice at a seat. Parent Photon speaker recorder/listener here.</summary>
    public sealed class SeatVoiceAnchor : MonoBehaviour
    {
        [SerializeField] int _seatIndex;
        [SerializeField] string _playerId;

        public int SeatIndex => _seatIndex;
        public string PlayerId => _playerId;

        public void Bind(string playerId) => _playerId = playerId;
    }
}
