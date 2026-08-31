using UnityEngine;

namespace VRPoker.Interaction
{
    /// <summary>Remote player avatar root — head + hands proxies parented for netcode interpolator.</summary>
    public sealed class RemoteAvatarVisual : MonoBehaviour
    {
        [SerializeField] string _playerId;
        [SerializeField] Transform _head;
        [SerializeField] Transform _leftHand;
        [SerializeField] Transform _rightHand;
        [SerializeField] Renderer _headRenderer;

        public string PlayerId => _playerId;
        public Transform Head => _head;
        public Transform LeftHand => _leftHand;
        public Transform RightHand => _rightHand;

        public void Setup(string playerId, Color tint)
        {
            _playerId = playerId;
            if (_headRenderer != null)
            {
                _headRenderer.material.color = tint;
            }
        }
    }
}
