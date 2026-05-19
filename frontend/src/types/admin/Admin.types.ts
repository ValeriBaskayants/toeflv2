export interface AdminStats {
  adminInfo: {
    id: string;
    email: string;
    role: string;
  } | null;
  platformStats: {
    totalUsers: number;
  };
}

export interface ImportResult {
  totalProcessed: number;
  inserted: number;
  skipped: number;
}

export type ContentType =
  | 'exercises'
  | 'grammarRules'
  | 'vocabulary'
  | 'readings'
  | 'multipleChoice'
  | 'writingPrompts'
  | 'listening';

export interface ImportLog {
  id: string;
  type: ContentType;
  result: ImportResult;
  timestamp: string;
  status: 'success' | 'error';
  errorMessage?: string;
}
