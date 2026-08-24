using System.Collections;
using UnityEngine;

namespace VRPoker.Rendering
{
    /// <summary>Presentation-only deal flight. Skipping animation does not change server outcomes.</summary>
    public sealed class DealAnimationDirector : MonoBehaviour
    {
        [SerializeField] Transform _dealerOrigin;
        [SerializeField] float _duration = 0.22f;
        [SerializeField] AnimationCurve _ease = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);

        Coroutine _running;

        public bool IsPlaying => _running != null;

        public void Fly(CardVisual card, Vector3 worldTarget, Quaternion worldRot, bool faceUpAtEnd)
        {
            if (card == null) return;
            if (_running != null) StopCoroutine(_running);
            _running = StartCoroutine(FlyRoutine(card, worldTarget, worldRot, faceUpAtEnd));
        }

        IEnumerator FlyRoutine(CardVisual card, Vector3 target, Quaternion rot, bool faceUp)
        {
            var t = _dealerOrigin != null ? _dealerOrigin.position : card.transform.position;
            var start = card.transform.position;
            var startRot = card.transform.rotation;
            var elapsed = 0f;
            while (elapsed < _duration)
            {
                elapsed += Time.deltaTime;
                var u = _ease.Evaluate(Mathf.Clamp01(elapsed / _duration));
                card.transform.position = Vector3.Lerp(start, target, u);
                card.transform.rotation = Quaternion.Slerp(startRot, rot, u);
                yield return null;
            }
            card.transform.SetPositionAndRotation(target, rot);
            card.SetCard(card.Code, faceUp);
            _running = null;
        }

        public void SkipAll()
        {
            if (_running != null) StopCoroutine(_running);
            _running = null;
        }
    }
}
