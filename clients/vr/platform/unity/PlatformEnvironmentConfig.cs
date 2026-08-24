using System;
using UnityEngine;

namespace VRPoker.Platform
{
    [Serializable]
    public sealed class PlatformEnvironmentConfig
    {
        public string name = "development";
        public string gameServerHttp = "http://127.0.0.1:8787";
        public string ledgerHttp = "http://127.0.0.1:8786";
        public string cosmeticsHttp = "http://127.0.0.1:8790";
        public bool authRequired;
    }
}
