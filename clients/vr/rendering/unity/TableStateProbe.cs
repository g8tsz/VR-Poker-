using System;
using System.Collections.Generic;

namespace VRPoker.Rendering
{
    /// <summary>Minimal JSON probes for server TableSnapshot fields.</summary>
    public static class TableStateProbe
    {
        public static int ParsePot(string json)
        {
            return ParseIntAfter(json, "\"pot\":");
        }

        public static string ParseStreet(string json)
        {
            foreach (var s in new[] { "waiting", "dealing", "preflop", "flop", "turn", "river", "showdown", "payout" })
                if (json.Contains($"\"street\":\"{s}\"")) return s;
            return "waiting";
        }

        public static int ParseHandId(string json) => ParseIntAfter(json, "\"handId\":");

        public static IReadOnlyList<string> ParseBoard(string json)
        {
            var list = new List<string>();
            var key = "\"board\":[";
            var i = json.IndexOf(key, StringComparison.Ordinal);
            if (i < 0) return list;
            var tail = json.Substring(i + key.Length);
            var end = tail.IndexOf(']');
            if (end < 0) return list;
            var inner = tail.Substring(0, end);
            foreach (var part in inner.Split(','))
            {
                var t = part.Trim().Trim('"');
                if (t.Length >= 2) list.Add(t);
            }
            return list;
        }

        public static IReadOnlyList<SeatStackProbe> ParseSeatStacks(string json)
        {
            var list = new List<SeatStackProbe>();
            var idx = 0;
            while (true)
            {
                var seatKey = "\"seat\":";
                var si = json.IndexOf(seatKey, idx, StringComparison.Ordinal);
                if (si < 0) break;
                var seat = ParseIntAfter(json.Substring(si), seatKey);
                var stack = ParseIntNear(json, si, "\"stack\":");
                var streetCommit = ParseIntNear(json, si, "\"streetCommit\":");
                var folded = json.IndexOf("\"folded\":true", si, Math.Min(120, json.Length - si), StringComparison.Ordinal) >= 0;
                list.Add(new SeatStackProbe(seat, stack, streetCommit, folded));
                idx = si + 6;
            }
            return list;
        }

        static int ParseIntNear(string json, int anchor, string key)
        {
            var end = Math.Min(json.Length, anchor + 200);
            var slice = json.Substring(anchor, end - anchor);
            return ParseIntAfter(slice, key);
        }

        static int ParseIntAfter(string json, string key)
        {
            var idx = json.IndexOf(key, StringComparison.Ordinal);
            if (idx < 0) return 0;
            var tail = json.Substring(idx + key.Length);
            var end = tail.IndexOfAny(new[] { ',', '}' });
            if (end <= 0) return 0;
            return int.TryParse(tail.Substring(0, end), out var v) ? v : 0;
        }
    }

    public readonly struct SeatStackProbe
    {
        public readonly int Seat;
        public readonly int Stack;
        public readonly int StreetCommit;
        public readonly bool Folded;

        public SeatStackProbe(int seat, int stack, int streetCommit, bool folded)
        {
            Seat = seat;
            Stack = stack;
            StreetCommit = streetCommit;
            Folded = folded;
        }
    }
}
