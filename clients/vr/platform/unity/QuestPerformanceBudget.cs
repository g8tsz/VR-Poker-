using UnityEngine;

namespace VRPoker.Platform
{
    /// <summary>Quest Store performance targets — 72 Hz seated table scene.</summary>
    public sealed class QuestPerformanceBudget : MonoBehaviour
    {
        [SerializeField] int _targetFps = 72;
        [SerializeField] bool _useFixedFoveatedRendering = true;
        [SerializeField] int _ffrLevel = 2;
        [SerializeField] float _renderScale = 1f;
        [SerializeField] bool _logFrameDrops = true;

        int _droppedFrames;
        float _lastLog;

        public int TargetFps => _targetFps;

        public void Apply()
        {
            Application.targetFrameRate = _targetFps;
            QualitySettings.vSyncCount = 0;
#if META_XR
            ApplyMetaFfr();
#endif
            Debug.Log($"QuestPerformanceBudget: target={_targetFps}Hz FFR={_useFixedFoveatedRendering} scale={_renderScale}");
        }

#if META_XR
        void ApplyMetaFfr()
        {
            if (!_useFixedFoveatedRendering) return;
            // OVRManager.fixedFoveatedRenderingLevel = (FixedFoveatedRenderingLevel)_ffrLevel;
            // OVRManager.useDynamicFixedFoveatedRendering = false;
        }
#endif

        void Update()
        {
            if (!_logFrameDrops) return;
            var dt = Time.unscaledDeltaTime;
            if (dt > 1f / _targetFps * 1.25f) _droppedFrames++;
            if (Time.unscaledTime - _lastLog < 30f) return;
            _lastLog = Time.unscaledTime;
            if (_droppedFrames > 0)
                Debug.LogWarning($"QuestPerformanceBudget: {_droppedFrames} slow frames in last 30s (target {_targetFps} Hz)");
            _droppedFrames = 0;
        }
    }
}
