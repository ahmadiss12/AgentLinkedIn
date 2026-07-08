export type StatusCount = {
  status: string;
  count: number;
};

export type ActionCount = {
  action: string;
  count: number;
};

export type SignalCount = {
  signal: string;
  count: number;
};

export type AnalyticsSummary = {
  topicsByStatus: StatusCount[];
  draftsByStatus: StatusCount[];
  reviewActions: ActionCount[];
  qualitySignals: SignalCount[];
  totalTopics: number;
  totalDrafts: number;
  totalPublished: number;
  approvalRate: number | null;
  agentRunSuccessRate: number | null;
};
