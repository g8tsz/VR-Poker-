using System;
using UnityEngine;
using VRPoker.Netcode;

namespace VRPoker.Audio
{
    /// <summary>
    /// Reacts to server table snapshots (via WebSocket). Short stingers only — never long music under voice.
    /// </summary>
    public sealed class TableAudioDirector : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] AudioBus _bus;
        [SerializeField] TableAudioClips _clips = new();
        [SerializeField] AudioOneShotPlayer _oneShots;
        [SerializeField] SpatialAmbientLoop _ambient;
        [SerializeField] Transform _tableCenter;

        string _street = "waiting";
        int _lastHandId = -1;
        bool _ducked;

        void OnEnable()
        {
            if (_bus == null) _bus = AudioBus.Instance;
            if (_bus != null) _bus.Changed += OnBusChanged;
            if (_client != null) _client.OnStateJson += OnStateJson;
            if (_ambient != null && _clips.ambientLoop != null) _ambient.SetClip(_clips.ambientLoop);
            OnBusChanged(_bus != null ? _bus.Prefs : new AudioPreferences());
        }

        void OnDisable()
        {
            if (_bus != null) _bus.Changed -= OnBusChanged;
            if (_client != null) _client.OnStateJson -= OnStateJson;
        }

        public void SetDucked(bool ducked)
        {
            _ducked = ducked;
            RefreshAmbient();
        }

        void OnBusChanged(AudioPreferences prefs) => RefreshAmbient();

        void RefreshAmbient()
        {
            if (_ambient == null || _bus == null) return;
            var mult = _ducked ? 0.15f : _bus.Prefs.EffectiveAmbient;
            _ambient.ApplyVolume(mult);
        }

        void OnStateJson(string json)
        {
            var street = ProbeStreet(json);
            var handId = ProbeHandId(json);
            var center = _tableCenter != null ? _tableCenter.position : transform.position;
            var vol = _bus != null ? _bus.Prefs.EffectiveTableSfx : 0.85f;
            if (_ducked) vol *= 0.2f;

            if (handId > _lastHandId && handId > 0)
            {
                _lastHandId = handId;
                Play(_clips.deal, vol, center);
            }

            if (street != _street)
            {
                PlayStreetTransition(_street, street, vol, center);
                _street = street;
            }

            ProbeLastEvents(json, vol, center);
        }

        void PlayStreetTransition(string from, string to, float vol, Vector3 center)
        {
            switch (to)
            {
                case "flop": Play(_clips.flop, vol, center); break;
                case "turn": Play(_clips.turn, vol, center); break;
                case "river": Play(_clips.river, vol, center); break;
                case "showdown": Play(_clips.showdown, vol, center); break;
            }
        }

        void ProbeLastEvents(string json, float vol, Vector3 center)
        {
            if (json.Contains("wins ")) Play(_clips.win, vol, center);
            else if (json.Contains(" folds") || json.Contains("\"fold\"")) Play(_clips.fold, vol * 0.7f, center);
            else if (json.Contains(" checks") || json.Contains("\"check\"")) Play(_clips.check, vol * 0.5f, center);
            else if (json.Contains(" bets ") || json.Contains(" raises ") || json.Contains("posts "))
                Play(_clips.chipBet, vol * 0.8f, center);
            else if (json.Contains("rake ") || json.Contains("wins ")) Play(_clips.chipCollect, vol, center);
        }

        static string ProbeStreet(string json)
        {
            foreach (var s in new[] { "waiting", "dealing", "preflop", "flop", "turn", "river", "showdown", "payout" })
            {
                if (json.Contains($"\"street\":\"{s}\"")) return s;
            }
            return "waiting";
        }

        static int ProbeHandId(string json)
        {
            const string key = "\"handId\":";
            var idx = json.IndexOf(key, StringComparison.Ordinal);
            if (idx < 0) return -1;
            var tail = json.Substring(idx + key.Length);
            var end = tail.IndexOfAny(new[] { ',', '}' });
            if (end <= 0) return -1;
            return int.TryParse(tail.Substring(0, end), out var id) ? id : -1;
        }

        void Play(AudioClip clip, float vol, Vector3 pos)
        {
            if (_oneShots != null) _oneShots.Play(clip, vol, pos);
        }

        // Interaction layer may call these directly when gestures fire before server echo.
        public void PlayBet(Vector3 seatWorld) => Play(_clips.chipBet, _bus?.Prefs.EffectiveTableSfx ?? 0.8f, seatWorld);
        public void PlayFold(Vector3 seatWorld) => Play(_clips.fold, (_bus?.Prefs.EffectiveTableSfx ?? 0.8f) * 0.7f, seatWorld);
        public void PlayWin(Vector3 seatWorld) => Play(_clips.win, _bus?.Prefs.EffectiveTableSfx ?? 0.8f, seatWorld);
    }
}
