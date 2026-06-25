export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type RecentlyAddedResult = {
  eventKey: string;
  line: string;
  date: string;
  time?: string | null;
  detectedAt: string;
  comparisonAvailable: boolean;
  comparisonMarkdown: string | null;
};

export type RecentlyAddedResponse = {
  type: 'recently-added';
  /** live = fetched from Supabase; mock = sample data while domain approval is pending */
  source: 'live' | 'mock';
  notice?: string | null;
  queriedAt: string;
  newMatchMaxAgeMinutes: number;
  cutoffAt: string | null;
  ageFilterApplied: boolean;
  offset: number;
  hasMore: boolean;
  results: RecentlyAddedResult[];
};

export type CreatePostFromResultResponse = {
  type: 'post-created';
  postId: string;
  eventKey: string;
};

export type ApiErrorResponse = {
  status: 'error';
  message: string;
};
