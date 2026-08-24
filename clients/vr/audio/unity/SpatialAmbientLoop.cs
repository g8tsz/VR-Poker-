using UnityEngine;

namespace VRPoker.Audio
{
    /// <summary>Low-level ambient loop centered on the felt. Kept quiet so voice wins.</summary>
    public sealed class SpatialAmbientLoop : MonoBehaviour
    {
        [SerializeField] AudioSource _source;
        [SerializeField] AudioClip _loop;
        [SerializeField] float _volume = 0.35f;

        void Reset()
        {
            _source = GetComponent<AudioSource>();
            if (_source == null) _source = gameObject.AddComponent<AudioSource>();
            _source.loop = true;
            _source.playOnAwake = false;
            _source.spatialBlend = 1f;
            _source.rolloffMode = AudioRolloffMode.Logarithmic;
            _source.minDistance = 1f;
            _source.maxDistance = 12f;
        }

        void Start() => ApplyVolume(1f);

        public void SetClip(AudioClip clip)
        {
            _loop = clip;
            if (_source != null && _loop != null)
            {
                _source.clip = _loop;
                if (!_source.isPlaying) _source.Play();
            }
        }

        public void ApplyVolume(float busMultiplier)
        {
            if (_source == null) return;
            _source.volume = _volume * busMultiplier;
            if (_loop != null && _source.clip == null)
            {
                _source.clip = _loop;
                _source.Play();
            }
        }
    }
}
