export type UserRank = "Novice" | "Analyst" | "Expert" | "Oracle" | "Legend";

export interface User {
  id: string;
  username: string;
  email: string;
  wallet_balance: number;
  streak_count: number;
  rank: UserRank;
  /** ISO8601 timestamp */
  created_at: string;
}

export type MarketStatus = "OPEN" | "CLOSED" | "RESOLVED" | "CANCELLED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  /** Emoji or icon name */
  icon: string;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  category: Category;
  creator_id: string;
  yes_volume: number;
  no_volume: number;
  /** Probability between 0 and 1 */
  yes_probability: number;
  /** Optional image URL for the market */
  image_url?: string | null;
  /** ISO8601 timestamp */
  expires_at: string;
  status: MarketStatus;
  /** ISO8601 timestamp */
  created_at: string;
}

export type BetSide = "YES" | "NO";
export type BetStatus = "OPEN" | "WON" | "LOST" | "REFUNDED";

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  side: BetSide;
  amount: number;
  shares: number;
  potential_payout: number;
  status: BetStatus;
  /** ISO8601 timestamp */
  created_at: string;
}

export type TransactionType =
  | "BET_PLACED"
  | "BET_WON"
  | "BET_REFUND"
  | "SIGNUP_BONUS"
  | "DAILY_BONUS";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  /** Bet id or market id */
  reference_id: string | null;
  description: string;
  /** ISO8601 timestamp */
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  market_id: string;
  content: string;
  author: Pick<User, "id" | "username" | "rank">;
  /** ISO8601 timestamp */
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: Pick<User, "id" | "username" | "rank" | "streak_count">;
  score: number;
  wins: number;
  losses: number;
  /** Rate between 0 and 1 */
  win_rate: number;
  total_wagered: number;
}

export interface Portfolio {
  user: User;
  open_bets: Bet[];
  closed_bets: Bet[];
  total_wagered: number;
  total_won: number;
  total_lost: number;
  /** Percentage, can be negative */
  roi: number;
  transactions: Transaction[];
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

export interface WalletStore {
  balance: number;
  setBalance: (balance: number) => void;
  deduct: (amount: number) => void;
  add: (amount: number) => void;
}

export interface BetFormValues {
  side: BetSide;
  amount: number;
}

export interface CreateMarketFormValues {
  title: string;
  description: string;
  category_id: string;
  image_url?: string;
  expires_at: string;
}
