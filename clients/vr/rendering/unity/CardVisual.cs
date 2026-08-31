using UnityEngine;

namespace VRPoker.Rendering
{
    /// <summary>Single playing card mesh — face or back. Presentation only.</summary>
    public sealed class CardVisual : MonoBehaviour
    {
        [SerializeField] MeshRenderer _renderer;
        [SerializeField] Material _faceMaterial;
        [SerializeField] Material _backMaterial;
        [SerializeField] TextMesh _rankLabel;

        CardCode _code;
        bool _faceUp;

        public CardCode Code => _code;
        public bool FaceUp => _faceUp;

        public void SetCard(CardCode code, bool faceUp)
        {
            _code = code;
            _faceUp = faceUp;
            if (_renderer != null)
                _renderer.sharedMaterial = faceUp && code.IsValid ? _faceMaterial : _backMaterial;
            if (_rankLabel != null)
            {
                _rankLabel.text = faceUp && code.IsValid ? code.ToCode() : "";
                _rankLabel.gameObject.SetActive(faceUp);
            }
        }

        public void SetBackMaterial(Material mat)
        {
            _backMaterial = mat;
            if (!_faceUp && _renderer != null) _renderer.sharedMaterial = mat;
        }
    }
}
