using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace VRPoker.Rendering
{
    /// <summary>
    /// Applies card/table skins only when cosmetics service reports entitlement.
    /// </summary>
    public sealed class CosmeticSkinApplier : MonoBehaviour
    {
        [SerializeField] string _cosmeticsHttp = "http://127.0.0.1:8790";
        [SerializeField] string _userId = "quest-player-1";
        [SerializeField] CosmeticSkinCatalog _catalog;
        [SerializeField] Renderer _feltRenderer;
        [SerializeField] Material _defaultFelt;
        [SerializeField] CardVisual[] _cardBackTargets;

        readonly HashSet<string> _owned = new();

        public void Configure(string cosmeticsHttp, string userId)
        {
            _cosmeticsHttp = cosmeticsHttp;
            _userId = userId;
        }

        void Start() => StartCoroutine(RefreshOwned());

        public IEnumerator RefreshOwned()
        {
            _owned.Clear();
            var url = $"{_cosmeticsHttp.TrimEnd('/')}/v1/users/{Uri.EscapeDataString(_userId)}/owned";
            using var req = UnityWebRequest.Get(url);
            yield return req.SendWebRequest();
#if UNITY_2020_2_OR_NEWER
            if (req.result != UnityWebRequest.Result.Success) yield break;
#else
            if (req.isNetworkError || req.isHttpError) yield break;
#endif
            var json = req.downloadHandler.text;
            foreach (var sku in new[] { "skin-neon-52", "skin-wood-classic", "theme-vegas-night", "theme-clubhouse" })
            {
                if (json.Contains($"\"{sku}\"")) _owned.Add(sku);
            }
            ApplyBestSkins();
        }

        public bool IsEntitled(string skuId) => _owned.Contains(skuId);

        void ApplyBestSkins()
        {
            ApplyCardSkin(PickOwned("skin-neon-52", "skin-wood-classic"));
            ApplyTableTheme(PickOwned("theme-vegas-night", "theme-clubhouse"));
        }

        string PickOwned(string a, string b)
        {
            if (_owned.Contains(a)) return a;
            if (_owned.Contains(b)) return b;
            return null;
        }

        void ApplyCardSkin(string skuId)
        {
            if (string.IsNullOrEmpty(skuId) || _catalog == null || !_catalog.TryGet(skuId, out var entry)) return;
            if (entry.material == null) return;
            foreach (var card in _cardBackTargets)
                if (card != null) card.SetBackMaterial(entry.material);
        }

        void ApplyTableTheme(string skuId)
        {
            if (string.IsNullOrEmpty(skuId) || _catalog == null || !_catalog.TryGet(skuId, out var entry)) return;
            if (_feltRenderer == null || entry.material == null) return;
            _feltRenderer.sharedMaterial = entry.material;
        }

        public void ResetToDefault()
        {
            if (_feltRenderer != null && _defaultFelt != null)
                _feltRenderer.sharedMaterial = _defaultFelt;
        }
    }
}
