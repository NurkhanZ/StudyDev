export type ModuleId =
  | 'python-oop'
  | 'fastapi-async'
  | 'ml-systems'
  | 'postgresql'
  | 'docker-k8s'
  | 'cicd-git'
  | 'testing-linux';

export interface ModuleMeta {
  id: ModuleId;
  title: string;
  shortTitle: string;
  subtitle: string;
  color: string;
  badgeBg: string;
  iconName: string;
}

export interface VacancyItem {
  id: string;
  category: 'Обязанности' | 'Требования' | 'Будет плюсом';
  text: string;
  moduleId: ModuleId;
  practitionerSummary: string;
}

export interface BasicEntityExplanation {
  name: string;
  whatItIs: string;
  whyWeNeedIt: string;
}

export interface DeepDiveSection {
  title: string;
  paragraphs: string[];
  keyRule?: string;
}

export interface ComparisonTableData {
  title: string;
  headers: [string, string, string];
  rows: [string, string, string][];
}

export interface ProductionPitfall {
  mistake: string;
  whyItFailsInProd: string;
  properFix: string;
}

export interface InterviewQA {
  question: string;
  juniorAnswer: string;
  practitionerAnswer: string;
}

export interface SqueezeCard {
  id: string;
  moduleId: ModuleId;
  title: string;
  subtitle: string;
  readingTime?: string;
  whatItIs: string;
  basicEntities: BasicEntityExplanation[];
  deepDiveSections?: DeepDiveSection[];
  comparisonTable?: ComparisonTableData;
  howWeUseItStepByStep: string[];
  howItWorks: string[];
  whyAndWhen: string[];
  productionPitfalls?: ProductionPitfall[];
  kzContext: {
    companies: string;
    scenario: string;
  };
  bestPractices: string[];
  codeSnippet?: {
    label: string;
    code: string;
  };
  secondCodeSnippet?: {
    label: string;
    code: string;
  };
  interviewerTrap: InterviewQA;
  extraInterviewQuestions?: InterviewQA[];
}

export interface QuizOption {
  id: string;
  text: string;
  tag: 'practitioner' | 'textbook' | 'bug' | 'overengineered';
  tagLabel: string;
  feedback: string;
}

export interface QuizQuestion {
  id: string;
  moduleId: ModuleId;
  difficulty: 'Middle' | 'Senior / Боевой' | 'Ловушка';
  kzCompanyTag: string;
  question: string;
  context?: string;
  options: QuizOption[];
  correctOptionId: string;
  deepTakeaway: string;
}

export interface WarRoomLogCommand {
  cmd: string;
  label: string;
  output: string;
  clue: string;
}

export interface WarRoomIncident {
  id: string;
  moduleId: ModuleId;
  title: string;
  companyContext: string;
  severity: 'CRITICAL (P0)' | 'HIGH (P1)';
  alertBanner: string;
  initialLogs: string;
  diagnosticCommands: WarRoomLogCommand[];
  question: string;
  fixes: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface GrillPrompt {
  id: string;
  moduleId: ModuleId;
  question: string;
  whyInterviewerAsks: string;
  greenFlags: string[];
  redFlags: string[];
  idealAnswerScript: string;
}

export interface UserProgress {
  xp: number;
  streak: number;
  maxStreak: number;
  masteredCardIds: string[];
  reviewCardIds: string[];
  correctQuizIds: string[];
  quarantineQuizIds: string[];
  solvedIncidentIds: string[];
  completedGrillIds: Record<string, number>;
  checkedVacancyIds: string[];
  soundEnabled: boolean;
}
