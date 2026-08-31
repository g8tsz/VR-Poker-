using System;
using UnityEngine;
using UnityEngine.Events;

namespace VRPoker.Platform
{
    /// <summary>First-run data safety panel — required for Quest / GDPR-style disclosure.</summary>
    public sealed class PrivacyDisclosureController : MonoBehaviour
    {
        const string PrefsKey = "vrpoker.privacy.accepted.v1";

        [SerializeField] StoreComplianceRegistry _registry;
        [TextArea(4, 12)]
        [SerializeField] string _disclosureText =
            "VR Poker collects your display name, table presence (head/hand poses), " +
            "and gameplay actions to run multiplayer poker. Chips and cosmetics are virtual only. " +
            "No real-money gambling. Auth is handled by our identity provider. " +
            "See privacy policy for retention and deletion.";

        public UnityEvent OnAccepted = new();
        public bool HasAccepted => PlayerPrefs.GetInt(PrefsKey, 0) == 1;

        public event Action<bool> OnVisibilityChanged;

        public string DisclosureText => _disclosureText;

        void Start()
        {
            if (HasAccepted)
            {
                _registry?.Mark("privacy-disclosure", true);
                return;
            }
            OnVisibilityChanged?.Invoke(true);
        }

        public void Accept()
        {
            PlayerPrefs.SetInt(PrefsKey, 1);
            PlayerPrefs.Save();
            _registry?.Mark("privacy-disclosure", true);
            OnVisibilityChanged?.Invoke(false);
            OnAccepted?.Invoke();
        }

        public void ResetForQa()
        {
            PlayerPrefs.DeleteKey(PrefsKey);
        }
    }
}
