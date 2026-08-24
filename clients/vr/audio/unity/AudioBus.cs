using System;
using UnityEngine;

namespace VRPoker.Audio
{
    /// <summary>Local voice + table mix preferences. Never affects server state.</summary>
    [Serializable]
    public sealed class AudioPreferences
    {
        [Range(0f, 1f)] public float masterVolume = 1f;
        [Range(0f, 1f)] public float voiceVolume = 1f;
        [Range(0f, 1f)] public float tableSfxVolume = 0.85f;
        [Range(0f, 1f)] public float ambientVolume = 0.35f;
        public bool micMuted;
        public bool deafened;

        public float EffectiveVoice => deafened ? 0f : voiceVolume * masterVolume;
        public float EffectiveTableSfx => tableSfxVolume * masterVolume;
        public float EffectiveAmbient => ambientVolume * masterVolume;
    }

    /// <summary>Runtime mute/deafen bus shared by voice + table audio.</summary>
    public sealed class AudioBus : MonoBehaviour
    {
        public static AudioBus Instance { get; private set; }

        [SerializeField] AudioPreferences _prefs = new();

        public AudioPreferences Prefs => _prefs;
        public event Action<AudioPreferences> Changed;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void SetMicMuted(bool muted)
        {
            _prefs.micMuted = muted;
            Notify();
        }

        public void SetDeafened(bool deafened)
        {
            _prefs.deafened = deafened;
            Notify();
        }

        public void ToggleMic() => SetMicMuted(!_prefs.micMuted);
        public void ToggleDeafen() => SetDeafened(!_prefs.deafened);

        void Notify() => Changed?.Invoke(_prefs);
    }
}
