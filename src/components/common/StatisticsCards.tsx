/**
 * Statistics Cards Component
 * Displays story statistics in a grid layout with icons
 * Reusable across different screens
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { StatCard } from './StatCard';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * Statistics Cards Grid Component
 * Displays multiple statistics cards in a grid layout
 */
export interface StatisticsCardsProps {
  statistics: {
    characterCount: number;
    sceneCount: number;
    chapterCount: number;
    blurbCount: number;
  };
  animated?: boolean;
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ 
  statistics, 
  animated = false 
}) => {
  const { t } = useTranslation();
  
  return (
    <View style={styles.statsContainer}>
      <StatCard
        icon={<Ionicons name="people" size={32} color={colors.primary} />}
        label={t('entities:characters.title')}
        value={statistics.characterCount}
        animated={animated}
        animationDelay={250}
      />
      <StatCard
        icon={<FontAwesome6 name="paragraph" size={32} color={colors.info} />}
        label={t('entities:scenes.title')}
        value={statistics.sceneCount}
        animated={animated}
        animationDelay={300}
      />
      <StatCard
        icon={<Ionicons name="reader" size={32} color={colors.warning} />}
        label={t('entities:chapters.title')}
        value={statistics.chapterCount}
        animated={animated}
        animationDelay={350}
      />
      <StatCard
        icon={<FontAwesome5 name="pen-fancy" size={32} color={colors.secondary} />}
        label={t('entities:blurbs.title')}
        value={statistics.blurbCount}
        animated={animated}
        animationDelay={400}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
});

export default StatisticsCards;
