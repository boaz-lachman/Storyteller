/**
 * Navigation type definitions
 */
import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Auth Stack Navigation Types
 */
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

/**
 * App Stack Navigation Types
 */
export type AppStackParamList = {
  StoriesList: undefined;
  StoryDetail: { storyId: string };
};

/**
 * Story Tab Navigation Types
 */
export type StoryTabParamList = {
  CompletedStory: { storyId: string };
  Overview: { storyId: string };
  Characters: { storyId: string };
  Blurbs: { storyId: string };
  Scenes: { storyId: string };
  Chapters: { storyId: string };
  Generate: { storyId: string };
};

/**
 * Root Stack Navigation Types
 * Root navigator that switches between Auth and App flows
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  App: NavigatorScreenParams<AppStackParamList>;
  // Direct screens for when authenticated
  StoriesList: undefined;
  StoryDetail: { storyId: string };
};
