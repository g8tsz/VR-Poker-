using UnityEngine;

namespace VRPoker.ClientCore
{
    /// <summary>
    /// Builds a 6-max (configurable) ring of seats around the table. Seated-first: seats face inward, no teleport pads.
    /// </summary>
    public sealed class TableSpatialLayout : MonoBehaviour
    {
        [SerializeField] VrClientConfig _config = new();
        [SerializeField] TableAnchor _table;
        [SerializeField] SeatAnchor _seatPrefab;
        [SerializeField] Transform _seatsRoot;

        SeatAnchor[] _seats;

        public SeatAnchor[] Seats => _seats;
        public TableAnchor Table => _table;

        void Start() => Rebuild();

        public void Configure(VrClientConfig config)
        {
            _config = config;
            Rebuild();
        }

        public void Rebuild()
        {
            if (_config == null || _table == null) return;

            var root = _seatsRoot != null ? _seatsRoot : transform;
            for (var i = root.childCount - 1; i >= 0; i--)
            {
                var child = root.GetChild(i);
                if (Application.isPlaying) Destroy(child.gameObject);
                else DestroyImmediate(child.gameObject);
            }

            var count = Mathf.Clamp(_config.maxSeats, 2, 9);
            _seats = new SeatAnchor[count];
            var center = _table.transform.position;
            center.y = _config.tableHeight;

            for (var i = 0; i < count; i++)
            {
                var angle = (i / (float)count) * Mathf.PI * 2f + Mathf.PI * 0.5f;
                var seatPos = center + new Vector3(Mathf.Cos(angle), 0f, Mathf.Sin(angle)) * _config.seatBackOffset;
                var look = center - seatPos;
                look.y = 0f;
                var rot = look.sqrMagnitude > 0.01f ? Quaternion.LookRotation(look.normalized, Vector3.up) : Quaternion.identity;

                SeatAnchor seat;
                if (_seatPrefab != null)
                {
                    seat = Instantiate(_seatPrefab, seatPos, rot, root);
                    seat.name = $"Seat_{i}";
                }
                else
                {
                    var go = new GameObject($"Seat_{i}");
                    go.transform.SetParent(root);
                    seat = go.AddComponent<SeatAnchor>();
                }
                seat.Setup(i, seatPos, rot);
                _seats[i] = seat;
            }

            _table.transform.position = center;
        }

        public Vector3 SeatWorldPosition(int seatIndex)
        {
            if (_seats == null || seatIndex < 0 || seatIndex >= _seats.Length) return transform.position;
            return _seats[seatIndex].transform.position;
        }
    }
}
