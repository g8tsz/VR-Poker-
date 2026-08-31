using System;
using System.Collections.Generic;
using UnityEngine;

namespace VRPoker.Rendering
{
    [Serializable]
    public struct CosmeticSkinEntry
    {
        public string skuId;
        public string kind;
        public Material material;
        public GameObject prefabOverride;
    }

    /// <summary>Maps cosmetics catalog SKU ids to render assets.</summary>
    public sealed class CosmeticSkinCatalog : MonoBehaviour
    {
        [SerializeField] List<CosmeticSkinEntry> _entries = new()
        {
            new() { skuId = "skin-neon-52", kind = "card_skin" },
            new() { skuId = "skin-wood-classic", kind = "card_skin" },
            new() { skuId = "theme-vegas-night", kind = "table_theme" },
            new() { skuId = "theme-clubhouse", kind = "table_theme" },
        };

        readonly Dictionary<string, CosmeticSkinEntry> _map = new();

        void Awake()
        {
            _map.Clear();
            foreach (var e in _entries)
                if (!string.IsNullOrEmpty(e.skuId)) _map[e.skuId] = e;
        }

        public bool TryGet(string skuId, out CosmeticSkinEntry entry) => _map.TryGetValue(skuId, out entry);
    }
}
