import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/theme';

const EmptyStateView = ({ title, description, children }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || 'No Items Found'}</Text>
      <Text style={styles.description}>
        {description || 'There are no items to display at this time.'}
      </Text>
      {children ? <View style={styles.actionContainer}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
    textAlign: 'center'
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20
  },
  actionContainer: {
    marginTop: 16
  }
});

export default EmptyStateView;
