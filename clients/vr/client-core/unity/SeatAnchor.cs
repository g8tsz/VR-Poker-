using UnityEngine;

namespace VRPoker.ClientCore
{
    /// <summary>Seat index + facing direction for avatars, voice, and interaction zones.</summary>
    public sealed class SeatAnchor : MonoBehaviour
    {
        [SerializeField] int _seatIndex;
        [SerializeField] Transform _chipTray;
        [SerializeField] Transform _actionZone;

        public int SeatIndex => _seatIndex;
        public Transform ChipTray => _chipTray;
        public Transform ActionZone => _actionZone != null ? _actionZone : transform;

        public void Setup(int seatIndex, Vector3 worldPos, Quaternion worldRot)
        {
            _seatIndex = seatIndex;
            transform.SetPositionAndRotation(worldPos, worldRot);
        }
    }
}
