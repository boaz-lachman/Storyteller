/**
 * Navigation parameter types for React Navigation
 */
import { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Root stack navigation params
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

/**
 * Authentication stack navigation params
 */
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword?: undefined;
};

/**
 * Main app stack navigation params
 */
export type AppStackParamList = {
  StoriesList: undefined;
  StoryDetail: {
    storyId: string;
  };
  Profile?: undefined;
  Settings?: undefined;
};

/**
 * Story detail tab navigation params
 */
export type StoryTabParamList = {
  Overview: {
    storyId: string;
  };
  Characters: {
    storyId: string;
  };
  Blurbs: {
    storyId: string;
  };
  Scenes: {
    storyId: string;
  };
  Chapters: {
    storyId: string;
  };
  Generate: {
    storyId: string;
  };
};

/**
 * Navigation prop types
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
