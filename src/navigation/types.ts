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
  Characters: { storyId: string };
  Blurbs: { storyId: string };
  Scenes: { storyId: string };
  Chapters: { storyId: string };
};

/**
 * Root Stack Navigation Types
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};
