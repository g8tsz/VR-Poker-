using System.Collections.Generic;
using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Buffers remote presence samples and renders with interpolation delay.
    /// Local player rig is never driven from here.
    /// </summary>
    public sealed class RemoteAvatarInterpolator : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] Transform _remoteHead;
        [SerializeField] Transform _remoteLeftHand;
        [SerializeField] Transform _remoteRightHand;
        [SerializeField] float _delaySeconds = 0.1f;

        readonly Dictionary<string, List<Sample>> _buffers = new();

        struct Sample
        {
            public double T;
            public Vector3 HeadPos, LeftPos, RightPos;
            public Quaternion HeadRot, LeftRot, RightRot;
        }

        void OnEnable()
        {
            if (_client != null)
                _client.OnPresenceJson += OnPresence;
        }

        void OnDisable()
        {
            if (_client != null)
                _client.OnPresenceJson -= OnPresence;
        }

        void OnPresence(string json)
        {
            // Minimal parser: production uses typed DTOs. Enough for scaffold demos.
            if (!json.Contains("\"poses\"")) return;
            // For scaffold, apply head only when a single remote is expected.
            if (_remoteHead == null) return;
            // Real impl parses poses map per playerId and spawns avatars per seat.
        }

        void LateUpdate()
        {
            if (_remoteHead == null) return;
            var target = Time.unscaledTimeAsDouble - _delaySeconds;
            foreach (var kv in _buffers)
            {
                var buf = kv.Value;
                if (buf.Count == 0) continue;
                var s = Interpolate(buf, target);
                _remoteHead.SetPositionAndRotation(s.HeadPos, s.HeadRot);
                if (_remoteLeftHand) _remoteLeftHand.SetPositionAndRotation(s.LeftPos, s.LeftRot);
                if (_remoteRightHand) _remoteRightHand.SetPositionAndRotation(s.RightPos, s.RightRot);
            }
        }

        static Sample Interpolate(List<Sample> buf, double t)
        {
            if (buf.Count == 1) return buf[0];
            for (var i = 0; i < buf.Count - 1; i++)
            {
                var a = buf[i];
                var b = buf[i + 1];
                if (t >= a.T && t <= b.T)
                {
                    var u = (float)((t - a.T) / (b.T - a.T));
                    return new Sample
                    {
                        T = t,
                        HeadPos = Vector3.Lerp(a.HeadPos, b.HeadPos, u),
                        LeftPos = Vector3.Lerp(a.LeftPos, b.LeftPos, u),
                        RightPos = Vector3.Lerp(a.RightPos, b.RightPos, u),
                        HeadRot = Quaternion.Slerp(a.HeadRot, b.HeadRot, u),
                        LeftRot = Quaternion.Slerp(a.LeftRot, b.LeftRot, u),
                        RightRot = Quaternion.Slerp(a.RightRot, b.RightRot, u),
                    };
                }
            }
            return buf[buf.Count - 1];
        }
    }
}
