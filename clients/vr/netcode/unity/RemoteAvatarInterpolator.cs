using System.Collections.Generic;
using System.Text.Json;
using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Buffers remote presence samples per player and renders with interpolation delay.
    /// Server stamps pose timestamps; interpolation uses <see cref="WebSocketTableClient.ServerNowMs"/>.
    /// </summary>
    public sealed class RemoteAvatarInterpolator : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] GameObject _avatarPrefab;
        [SerializeField] float _delaySeconds = 0.1f;
        [SerializeField] int _maxSamplesPerPlayer = 32;

        readonly Dictionary<string, List<Sample>> _buffers = new();
        readonly Dictionary<string, AvatarRig> _avatars = new();

        struct Sample
        {
            public double T;
            public Vector3 HeadPos, LeftPos, RightPos;
            public Quaternion HeadRot, LeftRot, RightRot;
        }

        sealed class AvatarRig
        {
            public Transform Root;
            public Transform Head;
            public Transform LeftHand;
            public Transform RightHand;
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
            if (_client == null) return;
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (!root.TryGetProperty("poses", out var poses) || poses.ValueKind != JsonValueKind.Object)
                    return;

                foreach (var prop in poses.EnumerateObject())
                {
                    var playerId = prop.Name;
                    if (playerId == _client.PlayerId) continue;
                    if (!prop.Value.TryGetProperty("t", out var tEl) || !tEl.TryGetInt64(out var tMs))
                        continue;

                    var pose = prop.Value;
                    if (!pose.TryGetProperty("head", out var headEl)) continue;
                    if (!NetcodeJson.TryReadPose(headEl, out var headPos, out var headRot)) continue;

                    Vector3 leftPos = Vector3.zero, rightPos = Vector3.zero;
                    Quaternion leftRot = Quaternion.identity, rightRot = Quaternion.identity;
                    if (pose.TryGetProperty("leftHand", out var leftEl))
                        NetcodeJson.TryReadPose(leftEl, out leftPos, out leftRot);
                    if (pose.TryGetProperty("rightHand", out var rightEl))
                        NetcodeJson.TryReadPose(rightEl, out rightPos, out rightRot);

                    var sample = new Sample
                    {
                        T = tMs / 1000.0,
                        HeadPos = headPos,
                        LeftPos = leftPos,
                        RightPos = rightPos,
                        HeadRot = headRot,
                        LeftRot = leftRot,
                        RightRot = rightRot,
                    };

                    var buf = _buffers.TryGetValue(playerId, out var existing)
                        ? existing
                        : new List<Sample>();
                    buf.Add(sample);
                    if (buf.Count > _maxSamplesPerPlayer)
                        buf.RemoveAt(0);
                    _buffers[playerId] = buf;
                    EnsureAvatar(playerId);
                }
            }
            catch
            {
                /* malformed payload */
            }
        }

        void EnsureAvatar(string playerId)
        {
            if (_avatars.ContainsKey(playerId)) return;
            if (_avatarPrefab == null) return;

            var go = Instantiate(_avatarPrefab);
            go.name = $"RemoteAvatar_{playerId}";
            var rig = new AvatarRig { Root = go.transform };
            rig.Head = go.transform.Find("Head") ?? go.transform;
            rig.LeftHand = go.transform.Find("LeftHand");
            rig.RightHand = go.transform.Find("RightHand");
            _avatars[playerId] = rig;
        }

        void LateUpdate()
        {
            if (_client == null) return;
            var targetSec = _client.ServerNowMs() / 1000.0 - _delaySeconds;

            foreach (var kv in _buffers)
            {
                var playerId = kv.Key;
                var buf = kv.Value;
                if (buf.Count == 0) continue;
                if (!_avatars.TryGetValue(playerId, out var rig)) continue;

                var s = Interpolate(buf, targetSec);
                if (rig.Head) rig.Head.SetPositionAndRotation(s.HeadPos, s.HeadRot);
                if (rig.LeftHand) rig.LeftHand.SetPositionAndRotation(s.LeftPos, s.LeftRot);
                if (rig.RightHand) rig.RightHand.SetPositionAndRotation(s.RightPos, s.RightRot);
            }
        }

        static Sample Interpolate(List<Sample> buf, double t)
        {
            if (buf.Count == 1) return buf[0];
            if (t <= buf[0].T) return buf[0];
            var last = buf[buf.Count - 1];
            if (t >= last.T) return last;

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
            return last;
        }
    }
}
