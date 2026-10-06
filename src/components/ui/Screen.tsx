import type { ReactNode } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Render inside a ScrollView. */
  scroll?: boolean;
  /** Apply default horizontal padding. */
  padded?: boolean;
  /** Safe-area edges to inset. Defaults to top + bottom. */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  background?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  style,
  contentContainerStyle,
  background = colors.background,
  refreshing,
  onRefresh,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const safeStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const padStyle: ViewStyle = padded ? { paddingHorizontal: spacing.xl } : {};

  if (scroll) {
    return (
      <View style={[styles.root, { backgroundColor: background }, safeStyle, style]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, padStyle, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh
              ? (
                  <RefreshControl
                    refreshing={!!refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                  />
                )
              : undefined
          }
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: background }, safeStyle, padStyle, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingVertical: spacing.lg, flexGrow: 1 },
});
