import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/theme';
import { searchCatalogApi, suggestCatalogItemApi } from '../services/catalogService';
import { searchLocalCatalog, resolveCanonicalName } from '../constants/catalogs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CatalogMultiSelect = ({
  type = 'skill',
  selectedValues = [],
  onValuesChange,
  singleSelect = false,
  placeholder,
  label,
  helperText,
  disabled = false,
  maxItems
}) => {
  const currentList = useMemo(() => {
    if (!selectedValues) return [];
    if (Array.isArray(selectedValues)) return selectedValues.filter(Boolean);
    if (typeof selectedValues === 'string') {
      return selectedValues
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [selectedValues]);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isSuggestModalVisible, setIsSuggestModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [submittingCustom, setSubmittingCustom] = useState(false);

  const debounceTimer = useRef(null);

  const typeLabels = useMemo(() => {
    switch (type) {
      case 'skill':
        return {
          title: 'Technical Skills',
          placeholder: placeholder || 'Search skills (e.g. Python, PyTorch, React)...',
          typeName: 'Skill',
          suggestTitle: 'Suggest a New Skill'
        };
      case 'interest':
        return {
          title: 'Research Interests',
          placeholder: placeholder || 'Search interests (e.g. NLP, Computer Vision)...',
          typeName: 'Research Topic',
          suggestTitle: 'Suggest a Research Topic'
        };
      case 'domain':
        return {
          title: 'Research / Professional Domain',
          placeholder: placeholder || 'Search domains (e.g. Healthcare, AI, Climate)...',
          typeName: 'Domain',
          suggestTitle: 'Suggest a Research Domain'
        };
      default:
        return {
          title: 'Catalog Items',
          placeholder: placeholder || 'Search catalog...',
          typeName: 'Item',
          suggestTitle: 'Suggest Custom Item'
        };
    }
  }, [type, placeholder]);

  useEffect(() => {
    if (!isDropdownVisible && !searchQuery.trim()) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const immediateLocal = searchLocalCatalog(type, searchQuery, 15);
    setSuggestions(immediateLocal);

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchCatalogApi(type, searchQuery, 25);
        if (Array.isArray(results) && results.length > 0) {
          setSuggestions(results);
        }
      } catch (err) {
        // Fallback to local
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, type, isDropdownVisible]);

  const handleSelectItem = (item) => {
    const canonicalName = item.name || resolveCanonicalName(type, item);
    if (!canonicalName) return;

    if (singleSelect) {
      onValuesChange(canonicalName);
      setSearchQuery('');
      setIsDropdownVisible(false);
      Keyboard.dismiss();
      return;
    }

    const exists = currentList.some(
      (v) => v.toLowerCase() === canonicalName.toLowerCase()
    );

    if (exists) {
      handleRemoveItem(canonicalName);
    } else {
      if (maxItems && currentList.length >= maxItems) {
        Alert.alert('Limit Reached', `You can select up to ${maxItems} items.`);
        return;
      }
      onValuesChange([...currentList, canonicalName]);
    }
    setSearchQuery('');
  };

  const handleRemoveItem = (itemToRemove) => {
    if (disabled) return;
    if (singleSelect) {
      onValuesChange('');
      return;
    }
    onValuesChange(
      currentList.filter((v) => v.toLowerCase() !== itemToRemove.toLowerCase())
    );
  };

  const handleOpenSuggest = () => {
    setCustomName(searchQuery.trim());
    setCustomCategory('');
    setCustomDesc('');
    setIsSuggestModalVisible(true);
    setIsDropdownVisible(false);
  };

  const handleSubmitCustom = async () => {
    if (!customName.trim()) {
      Alert.alert('Required', 'Please enter a name for the suggestion.');
      return;
    }

    setSubmittingCustom(true);
    try {
      const res = await suggestCatalogItemApi({
        type,
        name: customName.trim(),
        category: customCategory.trim(),
        description: customDesc.trim()
      });

      const addedName = res?.canonicalName || customName.trim();

      if (res?.alreadyExists) {
        Alert.alert('Recognized Standard', `Recognized and mapped to canonical: "${addedName}".`);
      } else {
        Alert.alert('Submitted', `"${addedName}" has been added to your profile.`);
      }

      if (singleSelect) {
        onValuesChange(addedName);
      } else {
        const exists = currentList.some(
          (v) => v.toLowerCase() === addedName.toLowerCase()
        );
        if (!exists) {
          onValuesChange([...currentList, addedName]);
        }
      }

      setIsSuggestModalVisible(false);
      setSearchQuery('');
    } catch (err) {
      const fallbackName = customName.trim();
      if (singleSelect) {
        onValuesChange(fallbackName);
      } else {
        const exists = currentList.some(
          (v) => v.toLowerCase() === fallbackName.toLowerCase()
        );
        if (!exists) {
          onValuesChange([...currentList, fallbackName]);
        }
      }
      setIsSuggestModalVisible(false);
      setSearchQuery('');
    } finally {
      setSubmittingCustom(false);
    }
  };

  const isItemSelected = (item) => {
    const itemName = item.name || item;
    return currentList.some((v) => v.toLowerCase() === itemName.toLowerCase());
  };

  return (
    <View style={[styles.container, isDropdownVisible && styles.containerActive]}>
      {/* Outside touch auto-dismiss backdrop */}
      {isDropdownVisible && (
        <TouchableWithoutFeedback
          onPress={() => {
            setIsDropdownVisible(false);
            Keyboard.dismiss();
          }}
          accessible={false}
        >
          <View style={styles.backdropOverlay} />
        </TouchableWithoutFeedback>
      )}

      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {singleSelect && <Text style={styles.singleBadge}>Single select</Text>}
        </View>
      ) : null}

      {!singleSelect && currentList.length > 0 && (
        <View style={styles.chipContainer}>
          {currentList.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {item}
              </Text>
              {!disabled && (
                <TouchableOpacity
                  onPress={() => handleRemoveItem(item)}
                  style={styles.chipCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item}`}
                >
                  <Ionicons name="close" size={13} color={COLORS.primaryDark || '#15803D'} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {singleSelect && currentList.length > 0 && (
        <View style={styles.singleSelectedBox}>
          <View style={styles.singleSelectedLeft}>
            <Ionicons name="checkmark-circle" size={17} color={COLORS.primary || '#15803D'} style={{ marginRight: 8 }} />
            <Text style={styles.singleSelectedText} numberOfLines={1}>
              {currentList[0]}
            </Text>
          </View>
          {!disabled && (
            <TouchableOpacity
              onPress={() => handleRemoveItem(currentList[0])}
              style={styles.singleRemoveBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.danger || '#DC2626'} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {(!singleSelect || currentList.length === 0) && (
        <View style={[styles.inputWrapper, isDropdownVisible && styles.inputWrapperFocused]}>
          <Ionicons
            name="search-outline"
            size={17}
            color={isDropdownVisible ? (COLORS.primary || '#15803D') : '#9CA3AF'}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={typeLabels.placeholder}
            placeholderTextColor={COLORS.textLight || '#9CA3AF'}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (!isDropdownVisible) setIsDropdownVisible(true);
            }}
            onFocus={() => setIsDropdownVisible(true)}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading && (
            <ActivityIndicator size="small" color={COLORS.primary || '#15803D'} style={styles.loader} />
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {isDropdownVisible && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <View style={styles.dropdownHeaderLeft}>
              <Ionicons
                name={searchQuery ? 'search-outline' : 'sparkles-outline'}
                size={13}
                color={COLORS.sage || '#5A7D69'}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.dropdownHeaderText} numberOfLines={1}>
                {searchQuery ? `Suggestions for "${searchQuery}"` : `Standard ${typeLabels.title}`}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {suggestions.map((item, idx) => {
              const selected = isItemSelected(item);
              return (
                <TouchableOpacity
                  key={`${item.id || item.name}-${idx}`}
                  style={[styles.suggestionItem, selected && styles.suggestionItemSelected]}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionLeft}>
                    <View style={styles.suggestionNameRow}>
                      <Text style={[styles.suggestionName, selected && styles.suggestionNameActive]}>
                        {item.name}
                      </Text>
                      {item.matchedAlias && (
                        <View style={styles.aliasBadge}>
                          <Text style={styles.aliasBadgeText}>Matched: &quot;{item.matchedAlias}&quot;</Text>
                        </View>
                      )}
                    </View>
                    {item.category && <Text style={styles.suggestionCategory}>{item.category}</Text>}
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={selected ? (COLORS.primary || '#15803D') : '#9CA3AF'}
                  />
                </TouchableOpacity>
              );
            })}

            {suggestions.length === 0 && (
              <View style={styles.emptySuggestionBox}>
                <Ionicons name="sparkles-outline" size={22} color="#9CA3AF" />
                <Text style={styles.emptySuggestionText}>
                  No catalog match found for &quot;{searchQuery}&quot;
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.suggestActionBtn} onPress={handleOpenSuggest} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={17} color={COLORS.primary || '#15803D'} />
              <Text style={styles.suggestActionBtnText}>
                {searchQuery.trim()
                  ? `Can't find it? Suggest "${searchQuery.trim()}"`
                  : `Suggest new ${typeLabels.typeName}`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <Modal
        visible={isSuggestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSuggestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bulb-outline" size={20} color={COLORS.primary || '#15803D'} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>{typeLabels.suggestTitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSuggestModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={COLORS.textMuted || '#6B7280'} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Help expand the GeoConnect knowledge base. Suggestions are normalized and verified by our system.
            </Text>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Item Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder="e.g. LangChain, Graph Neural Networks"
                placeholderTextColor={COLORS.textLight || '#9CA3AF'}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Category / Sub-field (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="e.g. AI & Data Science, Robotics"
                placeholderTextColor={COLORS.textLight || '#9CA3AF'}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Short Description (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 64, textAlignVertical: 'top' }]}
                value={customDesc}
                onChangeText={setCustomDesc}
                placeholder="Brief explanation of how this skill or topic is applied..."
                placeholderTextColor={COLORS.textLight || '#9CA3AF'}
                multiline
              />
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsSuggestModalVisible(false)}
                disabled={submittingCustom}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitCustom}
                disabled={submittingCustom}
              >
                {submittingCustom ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Add & Suggest</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    position: 'relative'
  },
  containerActive: {
    zIndex: Platform.OS === 'ios' ? 9999 : 1000
  },
  backdropOverlay: {
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 990
      },
      default: {
        position: 'absolute',
        top: -SCREEN_HEIGHT * 2,
        left: -SCREEN_WIDTH * 2,
        width: SCREEN_WIDTH * 5,
        height: SCREEN_HEIGHT * 5,
        zIndex: 990
      }
    }),
    backgroundColor: 'transparent'
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    letterSpacing: -0.1
  },
  singleBadge: {
    fontSize: 11,
    color: COLORS.sage || '#6B7280',
    fontWeight: '500'
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    zIndex: 1000
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    borderColor: '#C4DEC9',
    borderWidth: 0.8,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark || '#15803D',
    marginRight: 6,
    maxWidth: 220
  },
  chipCloseBtn: {
    padding: 2,
    borderRadius: 10
  },
  singleSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    borderColor: '#C4DEC9',
    borderWidth: 0.8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    zIndex: 1000
  },
  singleSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  singleSelectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark || '#15803D',
    flex: 1
  },
  singleRemoveBtn: {
    padding: 2
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    height: 44,
    zIndex: 1000
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary || '#24563B',
    borderWidth: 1.5,
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 3px rgba(36, 86, 59, 0.12)'
      },
      ios: {
        shadowColor: COLORS.primary || '#24563B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4
      },
      android: {
        elevation: 2
      }
    })
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain || '#1C1C1E',
    paddingVertical: 0
  },
  loader: {
    marginLeft: 6
  },
  clearSearchBtn: {
    padding: 4
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textLight || '#9CA3AF',
    marginTop: 4,
    marginLeft: 2
  },
  dropdownContainer: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    marginTop: 6,
    maxHeight: 260,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(26, 36, 30, 0.12)'
      },
      ios: {
        shadowColor: '#1A221E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12
      },
      android: {
        elevation: 6
      }
    }),
    zIndex: 1001
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: COLORS.borderLight || 'rgba(0,0,0,0.05)',
    backgroundColor: '#F9FAFB'
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  dropdownHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted || '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1
  },
  dropdownScroll: {
    maxHeight: 210
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight || 'rgba(0,0,0,0.04)'
  },
  suggestionItemSelected: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9'
  },
  suggestionLeft: {
    flex: 1,
    marginRight: 8
  },
  suggestionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E'
  },
  suggestionNameActive: {
    color: COLORS.primaryDark || '#15803D'
  },
  aliasBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6
  },
  aliasBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500'
  },
  suggestionCategory: {
    fontSize: 11,
    color: COLORS.sageMuted || '#9CA3AF',
    marginTop: 2
  },
  emptySuggestionBox: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySuggestionText: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 6,
    textAlign: 'center'
  },
  suggestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 0.8,
    borderTopColor: COLORS.borderLight || 'rgba(0,0,0,0.06)'
  },
  suggestActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary || '#15803D',
    marginLeft: 6
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    ...SHADOWS.md
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain || '#1C1C1E'
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    lineHeight: 16,
    marginBottom: 16
  },
  modalFormGroup: {
    marginBottom: 12
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E',
    marginBottom: 5
  },
  modalInput: {
    backgroundColor: COLORS.bgInput || '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textMain || '#1C1C1E'
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18
  },
  modalCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border || 'rgba(0,0,0,0.08)',
    backgroundColor: COLORS.bgInput || '#F3F4F6'
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain || '#1C1C1E'
  },
  modalSubmitBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.primary || '#15803D'
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});

export default CatalogMultiSelect;