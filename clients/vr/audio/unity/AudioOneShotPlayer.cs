using System;
using UnityEngine;

namespace VRPoker.Audio
{
    [Serializable]
    public sealed class TableAudioClips
    {
        public AudioClip deal;
        public AudioClip flop;
        public AudioClip turn;
        public AudioClip river;
        public AudioClip showdown;
        public AudioClip chipBet;
        public AudioClip chipCollect;
        public AudioClip fold;
        public AudioClip win;
        public AudioClip check;
        public AudioClip ambientLoop;
    }

    /// <summary>Plays short table one-shots at a world point. No music beds — voice stays clear.</summary>
    public sealed class AudioOneShotPlayer : MonoBehaviour
    {
        [SerializeField] AudioSource _source;
        [SerializeField] float _minGapSeconds = 0.05f;

        float _lastPlay;

        void Reset()
        {
            _source = GetComponent<AudioSource>();
            if (_source == null) _source = gameObject.AddComponent<AudioSource>();
            _source.playOnAwake = false;
            _source.spatialBlend = 1f;
            _source.rolloffMode = AudioRolloffMode.Logarithmic;
            _source.minDistance = 0.5f;
            _source.maxDistance = 8f;
        }

        public void Play(AudioClip clip, float volume, Vector3? position = null)
        {
            if (clip == null || volume <= 0f) return;
            if (Time.unscaledTime - _lastPlay < _minGapSeconds) return;
            _lastPlay = Time.unscaledTime;
            if (position.HasValue) transform.position = position.Value;
            _source.PlayOneShot(clip, volume);
        }
    }
}
