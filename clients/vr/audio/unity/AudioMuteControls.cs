using UnityEngine;
using UnityEngine.UI;

namespace VRPoker.Audio
{
    /// <summary>World-space or wrist UI toggles for mute / deafen. Wire to Quest controller buttons in production.</summary>
    public sealed class AudioMuteControls : MonoBehaviour
    {
        [SerializeField] AudioBus _bus;
        [SerializeField] Button _muteMicButton;
        [SerializeField] Button _deafenButton;

        void OnEnable()
        {
            if (_bus == null) _bus = AudioBus.Instance;
            if (_muteMicButton != null) _muteMicButton.onClick.AddListener(() => _bus?.ToggleMic());
            if (_deafenButton != null) _deafenButton.onClick.AddListener(() => _bus?.ToggleDeafen());
        }

        void OnDisable()
        {
            if (_muteMicButton != null) _muteMicButton.onClick.RemoveAllListeners();
            if (_deafenButton != null) _deafenButton.onClick.RemoveAllListeners();
        }
    }
}
