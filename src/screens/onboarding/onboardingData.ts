/**
 * Onboarding Card Content Data
 * Task 15.1: Design onboarding card content
 * Task 16: Translation Implementation - Now uses translation keys
 */
import type { OnboardingCardData } from '../../components/onboarding/OnboardingCard';

type TranslationFunction = (key: string) => string;

/**
 * Get onboarding cards with translated content
 * @param t - Translation function from useTranslation hook
 */
export const getOnboardingCards = (t: TranslationFunction): OnboardingCardData[] => [
  {
    // Card 1: Welcome message and app purpose
    icon: 'book-open',
    iconFamily: 'Feather',
    title: t('onboarding:cards.welcome.title'),
    description: t('onboarding:cards.welcome.description'),
  },
  {
    // Card 2: Creating and managing stories
    icon: 'edit',
    iconFamily: 'Feather',
    title: t('onboarding:cards.stories.title'),
    description: t('onboarding:cards.stories.description'),
  },
  {
    // Card 3: Adding characters, blurbs, scenes, and chapters
    icon: 'layers',
    iconFamily: 'Feather',
    title: t('onboarding:cards.entities.title'),
    description: t('onboarding:cards.entities.description'),
  },
  {
    // Card 4: Story generation with AI
    icon: 'sparkles',
    iconFamily: 'Ionicons',
    title: t('onboarding:cards.ai.title'),
    description: t('onboarding:cards.ai.description'),
  },
  {
    // Card 5: Export and sync features
    icon: 'cloud-upload',
    iconFamily: 'Ionicons',
    title: t('onboarding:cards.export.title'),
    description: t('onboarding:cards.export.description'),
  },
];

/**
 * @deprecated Use getOnboardingCards(t) instead
 * Kept for backward compatibility if needed
 */
export const onboardingCards: OnboardingCardData[] = [
  {
    icon: 'book-open',
    iconFamily: 'Feather',
    title: 'Welcome to Storyteller',
    description: 'Your creative writing companion. Craft, organize, and bring your stories to life with AI-powered assistance.',
  },
  {
    icon: 'edit',
    iconFamily: 'Feather',
    title: 'Create & Manage Stories',
    description: 'Start new stories, organize your projects, and manage multiple works in progress. Each story is your canvas.',
  },
  {
    icon: 'layers',
    iconFamily: 'Feather',
    title: 'Build Your Story World',
    description: 'Add characters, blurbs, scenes, and chapters to structure your narrative. Organize your ideas and plot seamlessly.',
  },
  {
    icon: 'sparkles',
    iconFamily: 'Ionicons',
    title: 'AI-Powered Generation',
    description: 'Generate story content with AI assistance. Transform your ideas into compelling narratives with intelligent suggestions.',
  },
  {
    icon: 'cloud-upload',
    iconFamily: 'Ionicons',
    title: 'Export & Sync',
    description: 'Export your stories as PDFs, sync across devices, and never lose your work. Your stories are always with you.',
  },
];
