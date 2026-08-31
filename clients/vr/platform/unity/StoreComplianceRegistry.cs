using System;
using System.Collections.Generic;
using UnityEngine;

namespace VRPoker.Platform
{
    [Serializable]
    public struct ComplianceItem
    {
        public string id;
        public string description;
        public bool satisfied;
    }

    /// <summary>Runtime registry mirroring store checklists — for QA builds and debug overlay.</summary>
    public sealed class StoreComplianceRegistry : MonoBehaviour
    {
        [SerializeField] List<ComplianceItem> _questItems = new()
        {
            new() { id = "perf-72hz", description = "Sustained 72 Hz in seated table scene", satisfied = false },
            new() { id = "comfort-seated", description = "Seated default, no locomotion", satisfied = false },
            new() { id = "privacy-disclosure", description = "First-run data safety panel shown", satisfied = false },
            new() { id = "age-gate", description = "Age rating gate acknowledged", satisfied = false },
            new() { id = "virtual-only", description = "No real-money chip purchase UI", satisfied = true },
            new() { id = "auth-managed", description = "Auth via managed provider only", satisfied = true },
        };

        [SerializeField] List<ComplianceItem> _steamItems = new()
        {
            new() { id = "steam-input", description = "Steam Input profile for controllers", satisfied = false },
            new() { id = "steam-depot", description = "Depot layout + launch options documented", satisfied = false },
            new() { id = "steam-privacy", description = "Steam privacy policy URL in store page", satisfied = false },
        };

        public IReadOnlyList<ComplianceItem> QuestItems => _questItems;
        public IReadOnlyList<ComplianceItem> SteamItems => _steamItems;

        public void Mark(string id, bool satisfied, PlatformChannel channel = PlatformChannel.Quest)
        {
            var list = channel == PlatformChannel.Steam ? _steamItems : _questItems;
            for (var i = 0; i < list.Count; i++)
            {
                if (list[i].id != id) continue;
                var item = list[i];
                item.satisfied = satisfied;
                list[i] = item;
                return;
            }
        }

        public bool AllQuestSatisfied()
        {
            foreach (var item in _questItems)
                if (!item.satisfied) return false;
            return true;
        }
    }
}
