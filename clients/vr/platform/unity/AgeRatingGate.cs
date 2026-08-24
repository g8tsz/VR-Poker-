using UnityEngine;
using UnityEngine.Events;

namespace VRPoker.Platform
{
    /// <summary>Blocks play until player confirms age rating (simulated gambling, 13+).</summary>
    public sealed class AgeRatingGate : MonoBehaviour
    {
        const string PrefsKey = "vrpoker.age.confirmed.v1";

        [SerializeField] StoreComplianceRegistry _registry;
        [SerializeField] int _minimumAge = 13;
        [SerializeField] string _ratingLabel = "Teen — simulated gambling, no real money";

        public UnityEvent OnConfirmed = new();
        public bool IsConfirmed => PlayerPrefs.GetInt(PrefsKey, 0) == 1;
        public int MinimumAge => _minimumAge;
        public string RatingLabel => _ratingLabel;

        void Start()
        {
            if (IsConfirmed) _registry?.Mark("age-gate", true);
        }

        public void ConfirmAgeEligible()
        {
            PlayerPrefs.SetInt(PrefsKey, 1);
            PlayerPrefs.Save();
            _registry?.Mark("age-gate", true);
            OnConfirmed?.Invoke();
        }

        public void ResetForQa() => PlayerPrefs.DeleteKey(PrefsKey);
    }
}
