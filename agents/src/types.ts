export type Platform = 'facebook' | 'instagram' | 'tiktok';

export interface KeywordData {
  keyword: string;
  estimatedMonthlySearches: string;
  difficulty: 'low' | 'medium' | 'high';
  intent: 'informational' | 'transactional' | 'navigational';
  languageVariants?: string[];
}

export interface BlogPost {
  title: string;
  slug: string;
  metaDescription: string;
  targetKeyword: string;
  outline: string[];
  estimatedWordCount: number;
}

export interface LandingPageCopy {
  heroSection: string;
  featuresSection: string[];
  howItWorksSteps: string[];
  faqItems: Array<{ question: string; answer: string }>;
  footerTagline: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  canonicalPath: string;
  ogTitle: string;
  ogDescription: string;
}

export interface MarketingBrief {
  platform: Platform;
  targetAudience: string;
  keywords: KeywordData[];
  heroHeadline: string;
  heroSubheadline: string;
  valueProps: string[];
  ctaVariants: string[];
  landingPageCopy: LandingPageCopy;
  blogPosts: BlogPost[];
  seoMeta: SeoMeta;
}

export interface GitHubIssue {
  title: string;
  body: string;
  labels: string[];
  acceptanceCriteria: string[];
}

export interface ComponentSpec {
  componentName: string;
  filePath: string;
  selector: string;
  title: string;
  metaTags: Record<string, string>;
  schemaOrgJson: object;
  angularTemplate: string;
  angularStyles: string;
  githubIssue: GitHubIssue;
}
