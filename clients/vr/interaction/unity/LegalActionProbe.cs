using System;
using System.Collections.Generic;

namespace VRPoker.Interaction
{
    public readonly struct LegalActionOption
    {
        public readonly string Type;
        public readonly int? Min;
        public readonly int? Max;

        public LegalActionOption(string type, int? min, int? max)
        {
            Type = type;
            Min = min;
            Max = max;
        }
    }

    /// <summary>Lightweight JSON probes until typed DTOs land in netcode package.</summary>
    public static class LegalActionProbe
    {
        public static IReadOnlyList<LegalActionOption> ParseLegal(string stateJson)
        {
            var list = new List<LegalActionOption>();
            if (string.IsNullOrEmpty(stateJson) || !stateJson.Contains("\"legal\"")) return list;

            foreach (var type in new[] { "fold", "check", "call", "bet", "raise", "all-in" })
            {
                if (!stateJson.Contains($"\"type\":\"{type}\"")) continue;
                var min = ProbeInt(stateJson, type, "min");
                var max = ProbeInt(stateJson, type, "max");
                list.Add(new LegalActionOption(type, min, max));
            }
            return list;
        }

        public static bool IsMyTurn(string stateJson, int mySeat)
        {
            var key = "\"toActSeat\":";
            var idx = stateJson.IndexOf(key, StringComparison.Ordinal);
            if (idx < 0) return false;
            var tail = stateJson.Substring(idx + key.Length);
            var end = tail.IndexOfAny(new[] { ',', '}' });
            if (end <= 0) return false;
            return int.TryParse(tail.Substring(0, end), out var seat) && seat == mySeat;
        }

        static int? ProbeInt(string json, string actionType, string field)
        {
            var needle = $"\"type\":\"{actionType}\"";
            var i = json.IndexOf(needle, StringComparison.Ordinal);
            if (i < 0) return null;
            var fieldKey = $"\"{field}\":";
            var j = json.IndexOf(fieldKey, i, StringComparison.Ordinal);
            if (j < 0 || j > i + 80) return null;
            var tail = json.Substring(j + fieldKey.Length);
            var end = tail.IndexOfAny(new[] { ',', '}' });
            if (end <= 0) return null;
            return int.TryParse(tail.Substring(0, end), out var v) ? v : null;
        }
    }
}
