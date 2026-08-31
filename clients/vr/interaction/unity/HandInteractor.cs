using UnityEngine;

namespace VRPoker.Interaction
{
    /// <summary>Tags hand colliders for poke / pad interaction. Add to hand proxy with trigger collider.</summary>
    public sealed class HandInteractor : MonoBehaviour
    {
        [SerializeField] bool _isLeft;

        public bool IsLeft => _isLeft;

        void Awake()
        {
            gameObject.tag = "PlayerHand";
            var col = GetComponent<Collider>();
            if (col != null) col.isTrigger = true;
        }
    }
}
