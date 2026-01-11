/**
 * Onboarding Card Content Data
 * Task 15.1: Design onboarding card content
 * 
 * Note: Text is currently hardcoded in English.
 * Will be replaced with translation keys in Task 16 (Translation Implementation)
 */
import type { OnboardingCardData } from '../../components/onboarding/OnboardingCard';

export const onboardingCards: OnboardingCardData[] = [
  {
    // Card 1: Welcome message and app purpose
    icon: 'book-open',
    iconFamily: 'Feather',
    title: 'Welcome to Storyteller',
    description:
      'Your creative writing companion. Craft, organize, and bring your stories to life with AI-powered assistance.',
  },
  {
    // Card 2: Creating and managing stories
    icon: 'edit',
    iconFamily: 'Feather',
    title: 'Create & Manage Stories',
    description:
      'Start new stories, organize your projects, and manage multiple works in progress. Each story is your canvas.',
  },
  {
    // Card 3: Adding characters, blurbs, scenes, and chapters
    icon: 'layers',
    iconFamily: 'Feather',
    title: 'Build Your Story World',
    description:
      'Add characters, blurbs, scenes, and chapters to structure your narrative. Organize your ideas and plot seamlessly.',
  },
  {
    // Card 4: Story generation with AI
    icon: 'sparkles',
    iconFamily: 'Ionicons',
    title: 'AI-Powered Generation',
    description:
      'Generate story content with AI assistance. Transform your ideas into compelling narratives with intelligent suggestions.',
  },
  {
    // Card 5: Export and sync features
    icon: 'cloud-upload',
    iconFamily: 'Ionicons',
    title: 'Export & Sync',
    description:
      'Export your stories as PDFs, sync across devices, and never lose your work. Your stories are always with you.',
  },
];
