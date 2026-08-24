using UnityEngine;

namespace VRPoker.Netcode
{
    /// <summary>
    /// Samples local XR rig transforms and streams presence to the game server (~20 Hz).
    /// </summary>
    public sealed class VrPresenceBroadcaster : MonoBehaviour
    {
        [SerializeField] WebSocketTableClient _client;
        [SerializeField] Transform _head;
        [SerializeField] Transform _leftHand;
        [SerializeField] Transform _rightHand;
        [SerializeField] float _hz = 20f;

        float _next;

        void Update()
        {
            if (_client == null || _head == null) return;
            if (Time.unscaledTime < _next) return;
            _next = Time.unscaledTime + 1f / _hz;

            var t = (long)(Time.unscaledTimeAsDouble * 1000);
            var json =
                $"{{\"playerId\":\"{_client.PlayerId}\",\"t\":{t}," +
                $"\"head\":{PoseJson(_head)}," +
                $"\"leftHand\":{PoseJson(_leftHand)}," +
                $"\"rightHand\":{PoseJson(_rightHand)}}}";
            _client.SendPresenceJson(json);
        }

        static string PoseJson(Transform tr)
        {
            if (tr == null)
                return "{\"position\":{\"x\":0,\"y\":0,\"z\":0},\"rotation\":{\"x\":0,\"y\":0,\"z\":0,\"w\":1}}";
            var p = tr.position;
            var r = tr.rotation;
            return $"{{\"position\":{{\"x\":{p.x},\"y\":{p.y},\"z\":{p.z}}}," +
                   $"\"rotation\":{{\"x\":{r.x},\"y\":{r.y},\"z\":{r.z},\"w\":{r.w}}}}}";
        }
    }
}
