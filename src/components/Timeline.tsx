import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, MoreHorizontal } from 'lucide-react-native';
import { useTheme, fonts } from '../theme';

export interface TimelineItem {
  id: string;
  clientName: string;
  businessType: string;
  status: 'done' | 'in_progress' | 'planned';
  statusLabel?: string;
  time: string;
  dealValue?: number;
}

export interface TimelineProps {
  items: TimelineItem[];
}

export const Timeline: React.FC<TimelineProps> = ({ items }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const isDone = item.status === 'done';
        const isInProgress = item.status === 'in_progress';
        const isPlanned = item.status === 'planned';

        return (
          <View key={item.id} style={styles.row}>
            {/* Status indicator node */}
            {isDone && (
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: theme.colors.timelineDone,
                    borderColor: theme.colors.accent,
                    borderWidth: 2,
                  },
                ]}
              >
                <Check size={16} color={theme.colors.text} strokeWidth={2.5} />
              </View>
            )}

            {isInProgress && (
              <View
                style={[
                  styles.node,
                  {
                    borderColor: theme.colors.muted,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                  },
                ]}
              >
                <MoreHorizontal size={16} color={theme.colors.muted} />
              </View>
            )}

            {isPlanned && (
              <View
                style={[
                  styles.node,
                  {
                    borderColor: theme.colors.border,
                    borderWidth: 2,
                  },
                ]}
              />
            )}

            <View style={styles.info}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {item.clientName}
                {item.statusLabel ? ` · ${item.statusLabel}` : ''}
                {item.dealValue ? ` ₹${item.dealValue.toLocaleString('en-IN')}` : ''}
              </Text>
              <Text style={[styles.sub, { color: theme.colors.muted }]}>{item.businessType}</Text>
            </View>

            <Text style={[styles.time, { color: theme.colors.muted }]}>{item.time}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 18,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  node: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  time: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
});
