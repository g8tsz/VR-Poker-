using UnityEngine;

namespace VRPoker.Audio
{
    /// <summary>
    /// Photon Voice scaffold — spatial voice per seat. Poker truth stays on game-server WS.
    ///
    /// Setup:
    /// 1. Install Photon Voice 2 + define PHOTON_VOICE
    /// 2. Assign Recorder on local rig; Speaker components on remote <see cref="SeatVoiceAnchor"/> children
    /// 3. Join the same Photon room as <see cref="VRPoker.Netcode.PhotonRealtimePresenceRoom"/>
    /// </summary>
    public sealed class PhotonVoiceController : MonoBehaviour
    {
        [SerializeField] AudioBus _bus;
        [SerializeField] Transform _localRecorderRig;
        [SerializeField] SeatVoiceAnchor[] _seatAnchors;

        void OnEnable()
        {
            if (_bus == null) _bus = AudioBus.Instance;
            if (_bus != null) _bus.Changed += OnBusChanged;
            ApplyBusSettings();
        }

        void OnDisable()
        {
            if (_bus != null) _bus.Changed -= OnBusChanged;
        }

        void OnBusChanged(AudioPreferences _) => ApplyBusSettings();

        public void SetTransmitEnabled(bool enabled)
        {
#if PHOTON_VOICE
            // var recorder = _localRecorderRig?.GetComponentInChildren<Photon.Voice.Unity.Recorder>();
            // if (recorder != null) recorder.TransmitEnabled = enabled && !(_bus?.Prefs.micMuted ?? false);
#endif
            if (!enabled) Debug.Log("PhotonVoice: transmit disabled");
        }

        public void ApplyBusSettings()
        {
            if (_bus == null) return;
            var prefs = _bus.Prefs;
            SetTransmitEnabled(!prefs.micMuted);

#if PHOTON_VOICE
            // foreach (var speaker in FindObjectsOfType<Photon.Voice.Unity.Speaker>())
            //     speaker.GetComponent<AudioSource>().volume = prefs.EffectiveVoice;
#endif
            for (var i = 0; i < (_seatAnchors?.Length ?? 0); i++)
            {
                var anchor = _seatAnchors[i];
                if (anchor == null) continue;
                var src = anchor.GetComponent<AudioSource>();
                if (src != null)
                {
                    src.volume = prefs.EffectiveVoice;
                    src.mute = prefs.deafened;
                }
            }
        }

        public void BindSeat(int seatIndex, string playerId)
        {
            if (_seatAnchors == null || seatIndex < 0 || seatIndex >= _seatAnchors.Length) return;
            _seatAnchors[seatIndex]?.Bind(playerId);
        }
    }
}
