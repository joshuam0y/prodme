export type ProfileCoachInput = {
  displayName?: string;
  role?: string;
  niche?: string;
  goal?: string;
  city?: string;
  lookingFor?: string;
  prompt1Question?: string;
  prompt1Answer?: string;
  prompt2Question?: string;
  prompt2Answer?: string;
};

export type ProfileCoachSuggestion = {
  niche: string;
  goal: string;
  lookingFor: string;
  prompt1Question: string;
  prompt1Answer: string;
  prompt2Question: string;
  prompt2Answer: string;
  summary: string;
  strengths?: string[];
  improvements?: string[];
  nextStep?: string | null;
  tags: string[];
  score: number;
};

export type MatchOpenersInput = {
  meName?: string;
  meRole?: string;
  meNiche?: string;
  meGoal?: string;
  meLookingFor?: string;
  themName?: string;
  themRole?: string;
  themNiche?: string;
  themGoal?: string;
  themLookingFor?: string;
};

export type ModerationInput = {
  text: string;
  context?: "message" | "profile";
};

export type ModerationResult = {
  status: "allow" | "warn" | "block";
  reason: string;
};

export type ReportTriageInput = {
  reason: string;
  details?: string;
  messageBody?: string;
};

export type ReportTriageResult = {
  summary: string;
  priority: "low" | "medium" | "high";
  labels: string[];
};
