using System;
using UnityEngine;

namespace VRPoker.ClientCore
{
    [Serializable]
    public sealed class VrClientConfig
    {
        [Header("Server")]
        public string gameServerHttp = "http://127.0.0.1:8787";
        public string tableId = "felt-1";
        public string playerId = "quest-player-1";
        public string displayName = "Player";

        [Header("Comfort")]
        public bool seatedMode = true;
        public float seatedEyeHeight = 1.35f;
        public float tableHeight = 0.76f;

        [Header("Table layout")]
        public int maxSeats = 6;
        public float tableRadius = 0.55f;
        public float seatBackOffset = 0.65f;
    }
}
