using UnityEngine;

namespace VRPoker.Audio
{
    /// <summary>
    /// Quest / Android audio focus: pause voice transmit + duck table when OS overlay steals focus.
    /// Hook from bootstrap; call <see cref="OnAppFocusChanged"/> from OVRManager or application callbacks.
    /// </summary>
    public sealed class VrAudioSession : MonoBehaviour
    {
        [SerializeField] AudioBus _bus;
        [SerializeField] PhotonVoiceController _voice;
        [SerializeField] TableAudioDirector _tableAudio;

        bool _pausedBySystem;
        bool _micBeforePause;
        bool _deafenBeforePause;

        void OnEnable()
        {
            if (_bus == null) _bus = AudioBus.Instance;
        }

        void OnApplicationPause(bool paused) => OnAppFocusChanged(!paused);

        void OnApplicationFocus(bool hasFocus) => OnAppFocusChanged(hasFocus);

        public void OnAppFocusChanged(bool focused)
        {
            if (!focused)
            {
                if (_pausedBySystem) return;
                _pausedBySystem = true;
                if (_bus != null)
                {
                    _micBeforePause = _bus.Prefs.micMuted;
                    _deafenBeforePause = _bus.Prefs.deafened;
                    _bus.SetMicMuted(true);
                    _bus.SetDeafened(true);
                }
                _voice?.SetTransmitEnabled(false);
                _tableAudio?.SetDucked(true);
                return;
            }

            if (!_pausedBySystem) return;
            _pausedBySystem = false;
            if (_bus != null)
            {
                _bus.SetMicMuted(_micBeforePause);
                _bus.SetDeafened(_deafenBeforePause);
            }
            _voice?.ApplyBusSettings();
            _tableAudio?.SetDucked(false);
        }
    }
}
