#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace VRPoker.Editor
{
    /// <summary>
    /// Menu: VRPoker / Create Bootstrap Scene — minimal playable hierarchy for Quest netcode testing.
    /// </summary>
    public static class CreateBootstrapScene
    {
        [MenuItem("VRPoker/Create Bootstrap Scene")]
        public static void Create()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var root = new GameObject("VrAppBootstrap");
            root.AddComponent<VRPoker.ClientCore.VrAppBootstrap>();

            var table = new GameObject("TableRoot");
            table.transform.SetParent(root.transform);
            table.AddComponent<VRPoker.ClientCore.TableAnchor>();
            table.AddComponent<VRPoker.ClientCore.TableSpatialLayout>();

            var netcode = new GameObject("Netcode");
            netcode.transform.SetParent(root.transform);
            netcode.AddComponent<VRPoker.Netcode.WebSocketTableClient>();
            netcode.AddComponent<VRPoker.Netcode.ServerAuthoritativeTableView>();
            netcode.AddComponent<VRPoker.Netcode.VrPresenceBroadcaster>();

            var dir = "Assets/VRPoker/Scenes";
            if (!AssetDatabase.IsValidFolder("Assets/VRPoker"))
                AssetDatabase.CreateFolder("Assets", "VRPoker");
            if (!AssetDatabase.IsValidFolder(dir))
                AssetDatabase.CreateFolder("Assets/VRPoker", "Scenes");

            const string path = "Assets/VRPoker/Scenes/TableBootstrap.unity";
            EditorSceneManager.SaveScene(scene, path);
            AssetDatabase.Refresh();
            Debug.Log($"Saved bootstrap scene to {path}. Assign VrClientConfig server URL and build for Quest.");
        }
    }
}
#endif
