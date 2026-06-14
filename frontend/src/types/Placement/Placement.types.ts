

export type PlacementStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'REMIND_LATER';

export type Dimension = 'GRAMMAR' | 'VOCABULARY' | 'READING' | 'LISTENING';


export interface PlacementStatusResponse {
  status:          PlacementStatus;
  showBanner:      boolean;
  detectedLevel:   string | null;
  confidenceScore: number | null;
  attemptCount:    number;
  
  canRetake:       boolean;              
  lastCompletedAt: string | null;        
}


export interface PublicQuestion {
  index:             number;
  dimension:         Dimension;
  text:              string;
  options:           string[];
  
  questionsAnswered: number;
  estimatedTotal:    number;
  progressPercent:   number;
}


export interface StartTestResponse {
  test:          unknown;
  nextQuestion:  PublicQuestion;
  maxQuestions:  number;
}


export interface AnswerContinueResponse {
  converged:         false;
  isCorrect:         boolean;
  questionsAnswered: number;
  nextQuestion:      PublicQuestion;
  progressHint:      string;   
}


export interface DimensionResult {
  dimension:  string;
  theta:      number;
  se:         number;
  level:      string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface AnswerConvergedResponse {
  converged:          true;
  detectedLevel:      string;
  confidenceScore:    number;
  theta:              Record<string, number>;
  standardError:      Record<string, number>;
  questionsAnswered:  number;
  testDurationSeconds: number;
  
  dimensionBreakdown: DimensionResult[];
  isRetake:           boolean;
}

export type AnswerResponse = AnswerContinueResponse | AnswerConvergedResponse;


export interface SkipResponse {
  skipped:       boolean;
  assignedLevel: string;
}


export interface RemindLaterResponse {
  remindAfter: string;
}