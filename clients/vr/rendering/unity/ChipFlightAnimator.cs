using System.Collections;
using UnityEngine;

namespace VRPoker.Rendering
{
    /// <summary>Moves chip props toward pot on bet — cosmetic only.</summary>
    public sealed class ChipFlightAnimator : MonoBehaviour
    {
        [SerializeField] float _duration = 0.18f;

        public void FlyToPot(GameObject chip, Vector3 potWorld, System.Action onComplete = null)
        {
            if (chip == null) return;
            StartCoroutine(Fly(chip.transform, potWorld, onComplete));
        }

        IEnumerator Fly(Transform t, Vector3 target, System.Action onComplete)
        {
            var start = t.position;
            var elapsed = 0f;
            while (elapsed < _duration)
            {
                elapsed += Time.deltaTime;
                var u = Mathf.SmoothStep(0f, 1f, elapsed / _duration);
                t.position = Vector3.Lerp(start, target, u);
                yield return null;
            }
            onComplete?.Invoke();
            Destroy(t.gameObject);
        }
    }
}
