using UnityEngine;

namespace VRPoker.ClientCore
{
    /// <summary>Felt center, board burn/drop point, pot anchor.</summary>
    public sealed class TableAnchor : MonoBehaviour
    {
        [SerializeField] Transform _boardCenter;
        [SerializeField] Transform _potCenter;
        [SerializeField] Transform _dealerButton;

        public Transform BoardCenter => _boardCenter != null ? _boardCenter : transform;
        public Transform PotCenter => _potCenter != null ? _potCenter : transform;
        public Transform DealerButton => _dealerButton;
    }
}
