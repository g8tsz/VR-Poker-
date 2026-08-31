using UnityEngine;

namespace VRPoker.Interaction
{
    /// <summary>Simple local presence meshes (head + hands). Cosmetic only — not networked truth.</summary>
    public sealed class LocalAvatarVisual : MonoBehaviour
    {
        [SerializeField] Transform _headProxy;
        [SerializeField] Transform _leftHandProxy;
        [SerializeField] Transform _rightHandProxy;
        [SerializeField] Transform _headTrack;
        [SerializeField] Transform _leftTrack;
        [SerializeField] Transform _rightTrack;
        [SerializeField] bool _hideFromLocalCamera = true;

        void LateUpdate()
        {
            Copy(_headTrack, _headProxy);
            Copy(_leftTrack, _leftHandProxy);
            Copy(_rightTrack, _rightHandProxy);
        }

        static void Copy(Transform src, Transform dst)
        {
            if (src == null || dst == null) return;
            dst.SetPositionAndRotation(src.position, src.rotation);
        }

        public void Bind(Transform head, Transform left, Transform right)
        {
            _headTrack = head;
            _leftTrack = left;
            _rightTrack = right;
        }
    }
}
