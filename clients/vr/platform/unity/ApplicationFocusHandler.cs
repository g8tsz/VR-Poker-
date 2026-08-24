using System;
using UnityEngine;
using VRPoker.Audio;
using VRPoker.Netcode;

namespace VRPoker.Platform
{
    /// <summary>Pause sensitive subsystems when headset is removed or app loses focus.</summary>
    public sealed class ApplicationFocusHandler : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] TableAudioDirector _audio;
        [SerializeField] bool _muteOnPause = true;

        public event Action<bool> OnFocusChanged;

        void OnApplicationPause(bool paused) => HandleFocus(!paused);
        void OnApplicationFocus(bool hasFocus) => HandleFocus(hasFocus);

        void HandleFocus(bool focused)
        {
            OnFocusChanged?.Invoke(focused);
            if (_muteOnPause && _audio != null) _audio.SetDucked(!focused);
            if (!focused) return;
            // Reconnect is server-driven; client may call Connect() after long pause in production.
        }
    }
}
