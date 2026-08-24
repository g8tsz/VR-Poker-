using System;
using System.Text.Json;

namespace VRPoker.Netcode
{
    /// <summary>Lightweight JSON helpers for netcode wire messages (no Newtonsoft required).</summary>
    internal static class NetcodeJson
    {
        public static string ExtractType(string json)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String)
                    return t.GetString() ?? "";
            }
            catch
            {
                /* ignore */
            }
            return "";
        }

        public static long? ExtractLong(string json, string field)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty(field, out var v) && v.TryGetInt64(out var n))
                    return n;
            }
            catch
            {
                /* ignore */
            }
            return null;
        }

        public static string ExtractString(string json, string field)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty(field, out var v) && v.ValueKind == JsonValueKind.String)
                    return v.GetString();
            }
            catch
            {
                /* ignore */
            }
            return null;
        }

        public static bool TryReadPose(JsonElement el, out UnityEngine.Vector3 pos, out UnityEngine.Quaternion rot)
        {
            pos = UnityEngine.Vector3.zero;
            rot = UnityEngine.Quaternion.identity;
            if (!el.TryGetProperty("position", out var p) || !el.TryGetProperty("rotation", out var r))
                return false;
            pos = new UnityEngine.Vector3(
                p.GetProperty("x").GetSingle(),
                p.GetProperty("y").GetSingle(),
                p.GetProperty("z").GetSingle());
            rot = new UnityEngine.Quaternion(
                r.GetProperty("x").GetSingle(),
                r.GetProperty("y").GetSingle(),
                r.GetProperty("z").GetSingle(),
                r.GetProperty("w").GetSingle());
            return true;
        }
    }
}
