export type BrandProject = {
  id: string;
  rawIdea: string;
  understanding?: {
    targetUser?: string;
    coreProblem?: string;
    constraints?: string;
    openQuestions?: string[];
    qaPairs?: { question: string; answer: string }[];
  };
  positioning?: {
    category?: string;
    differentiator?: string;
    differentiatorJustification?: string;
    valueProp?: string;
    competitiveAngle?: string;
  };
  personality?: {
    traits?: { name: string; justification: string }[];
    traitsToAvoid?: { name: string; reason: string }[];
  };
  namingDirections?: {
    direction: string;
    exampleNames: string[];
    rationale: string;
  }[];
  selectedNamingDirection?: string;
  tagline?: string;
  onePitchLine?: string;
  challengeLog?: {
    id: string; // for tracking in UI
    issue: string;
    why: string;
    betterAlternative: string;
    fieldToPatch: 'tagline' | 'onePitchLine' | 'positioning.category' | 'positioning.differentiator' | 'positioning.valueProp' | 'positioning.competitiveAngle' | 'none';
    status: 'pending' | 'accepted' | 'dismissed';
    originalValue?: string; // to show before/after
  }[];
  visualDirection?: {
    typographyStyle?: string;
    closestGoogleFont?: string;
    colorMood?: { hex: string; name: string; rationale: string }[];
    imageryStyle?: string;
    motifs?: string[];
    shapesToAvoid?: string[];
  };
  consistencyReport?: {
    conflicts?: { stageName: 'Position' | 'Shape' | 'Visualize'; issue: string }[];
    resolved: boolean;
  };
  launchAssets?: {
    landingPage: { headline: string; subhead: string };
    brandPitch: { problem: string; solution: string; whyNow: string; personalityOneLiner: string };
    socialPost: string;
  };
};

export type StageName = 
  | 'Understand' 
  | 'Position' 
  | 'Shape' 
  | 'Challenge' 
  | 'Visualize' 
  | 'Consistency' 
  | 'Launch';
