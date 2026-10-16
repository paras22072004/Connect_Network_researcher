import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID } from '../constants/avatars';
import { COLORS } from '../theme/theme';

/**
 * AvatarPicker Component
 * Renders 3 clean, built-in avatar options for GeoConnect users.
 * Supports active selection indicators, custom title/subtitles, and accessible touch targets.
 */
const AvatarPicker = ({
  selectedAvatarId = DEFAULT_AVATAR_ID,
  onSelectAvatar,
  title = 'Choose Your Avatar',
  subtitle = 'Select a scholar persona for your research profile'
}) => {
  return (
    <View style={styles.container}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}

      <View style={styles.avatarRow}>
        {AVATAR_OPTIONS.map((avatar) => {
          const isSelected = (selectedAvatarId || DEFAULT_AVATAR_ID) === avatar.id;

          return (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarCard,
                isSelected && styles.avatarCardSelected
              ]}
              onPress={() => onSelectAvatar && onSelectAvatar(avatar.id, avatar.uri)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${avatar.label}, ${avatar.subtitle}`}
            >
              <View style={[styles.imageWrapper, isSelected && styles.imageWrapperSelected]}>
                <Image
                  source={{ uri: avatar.uri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <Text style={[styles.avatarLabel, isSelected && styles.avatarLabelSelected]} numberOfLines={1}>
                {avatar.label}
              </Text>
              <Text style={styles.avatarSubtitle} numberOfLines={1}>
                {avatar.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  avatarCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  avatarCardSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  imageWrapper: {
    position: 'relative',
    width: 62,
    height: 62,
    borderRadius: 31,
    padding: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  imageWrapperSelected: {
    borderColor: COLORS.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  avatarSubtitle: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default AvatarPicker;
