using System;

namespace VRPoker.Rendering
{
    public readonly struct CardCode : IEquatable<CardCode>
    {
        public readonly int Rank;
        public readonly int Suit;
        public readonly bool IsValid;

        public CardCode(int rank, int suit)
        {
            Rank = rank;
            Suit = suit;
            IsValid = rank >= 0 && rank <= 12 && suit >= 0 && suit <= 3;
        }

        public static bool TryParse(string text, out CardCode card)
        {
            card = default;
            if (string.IsNullOrWhiteSpace(text) || text.Length < 2) return false;
            var rank = RankChar(text[0]);
            var suit = SuitChar(text[1]);
            if (rank < 0 || suit < 0) return false;
            card = new CardCode(rank, suit);
            return true;
        }

        static int RankChar(char c)
        {
            switch (char.ToUpperInvariant(c))
            {
                case '2': return 0;
                case '3': return 1;
                case '4': return 2;
                case '5': return 3;
                case '6': return 4;
                case '7': return 5;
                case '8': return 6;
                case '9': return 7;
                case 'T': return 8;
                case 'J': return 9;
                case 'Q': return 10;
                case 'K': return 11;
                case 'A': return 12;
                default: return -1;
            }
        }

        static int SuitChar(char c)
        {
            switch (char.ToLowerInvariant(c))
            {
                case 'c': return 0;
                case 'd': return 1;
                case 'h': return 2;
                case 's': return 3;
                default: return -1;
            }
        }

        public string ToCode()
        {
            if (!IsValid) return "??";
            ReadOnlySpan<char> ranks = "23456789TJQKA";
            ReadOnlySpan<char> suits = "cdhs";
            return $"{ranks[Rank]}{suits[Suit]}";
        }

        public bool Equals(CardCode other) => Rank == other.Rank && Suit == other.Suit;
        public override bool Equals(object obj) => obj is CardCode other && Equals(other);
        public override int GetHashCode() => Rank * 4 + Suit;
    }
}
