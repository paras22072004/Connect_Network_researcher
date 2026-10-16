import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/theme';
import { searchCatalogApi, suggestCatalogItemApi } from '../services/catalogService';
import { searchLocalCatalog, resolveCanonicalName } from '../constants/catalogs';

/**
 * Standardized Searchable Catalog Multi-Select Component.
 * Supports:
 * - type: 'skill' | 'interest' | 'domain'
 * - selectedValues: Array<string> or string (if singleSelect)
 * - onValuesChange: (newValues: Array<string> | string) => void
 * - singleSelect: boolean (default false)
 * - placeholder: string
 * - label: string (optional)
 * - disabled: boolean (optional)
 */
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
  // Normalize selected values into array of strings
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

  // Suggest Custom Item Modal State
  const [isSuggestModalVisible, setIsSuggestModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [submittingCustom, setSubmittingCustom] = useState(false);

  const debounceTimer = useRef(null);

  // Default labels and placeholders based on catalog type
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
          placeholder: placeholder || 'Search interests (e.g. NLP, Computer Vision, GNN)...',
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

  // Perform search query when input changes
  useEffect(() => {
    if (!isDropdownVisible && !searchQuery.trim()) {
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Instant local results for snappy responsive feeling
    const immediateLocal = searchLocalCatalog(type, searchQuery, 15);
    setSuggestions(immediateLocal);

    // Debounced API query for full synced catalog
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchCatalogApi(type, searchQuery, 25);
        if (Array.isArray(results) && results.length > 0) {
          setSuggestions(results);
        }
      } catch (err) {
        // Fallback to local already set
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, type, isDropdownVisible]);

  // Handle selection of a canonical item
  const handleSelectItem = (item) => {
    const canonicalName = item.name || resolveCanonicalName(type, item);
    if (!canonicalName) return;

    if (singleSelect) {
      onValuesChange(canonicalName);
      setSearchQuery('');
      setIsDropdownVisible(false);
      return;
    }

    // Prevent duplicates (case-insensitive canonical check)
    const exists = currentList.some(
      (v) => v.toLowerCase() === canonicalName.toLowerCase()
    );

    if (exists) {
      // Remove if already selected
      handleRemoveItem(canonicalName);
    } else {
      if (maxItems && currentList.length >= maxItems) {
        Alert.alert('Limit Reached', `You can select up to ${maxItems} items.`);
        return;
      }
      const updated = [...currentList, canonicalName];
      onValuesChange(updated);
    }

    setSearchQuery('');
  };

  // Handle removing a chip
  const handleRemoveItem = (itemToRemove) => {
    if (disabled) return;
    if (singleSelect) {
      onValuesChange('');
      return;
    }
    const updated = currentList.filter(
      (v) => v.toLowerCase() !== itemToRemove.toLowerCase()
    );
    onValuesChange(updated);
  };

  // Open the "Suggest Custom Item" modal
  const handleOpenSuggest = () => {
    const initialName = searchQuery.trim();
    setCustomName(initialName);
    setCustomCategory('');
    setCustomDesc('');
    setIsSuggestModalVisible(true);
    setIsDropdownVisible(false);
  };

  // Submit custom suggestion
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
        Alert.alert('Submitted', `"${addedName}" has been added to your profile and submitted for catalog review.`);
      }

      // Add to current selection
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
      // If server error or unauthenticated, still allow user to add locally
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
    return currentList.some(
      (v) => v.toLowerCase() === itemName.toLowerCase()
    );
  };

  return (
    <View style={styles.container}>
      {/* Optional Label */}
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {singleSelect && <Text style={styles.singleBadge}>Single select</Text>}
        </View>
      ) : null}

      {/* Selected Items Chips (Multi-Select Mode) */}
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
                  <Ionicons name="close" size={14} color={COLORS.primaryDark} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Single Select Selected Item Badge */}
      {singleSelect && currentList.length > 0 && (
        <View style={styles.singleSelectedBox}>
          <View style={styles.singleSelectedLeft}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
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
              <Ionicons name="close-circle" size={18} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search Input Bar */}
      {(!singleSelect || currentList.length === 0) && (
        <View style={[styles.inputWrapper, isDropdownVisible && styles.inputWrapperFocused]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={isDropdownVisible ? COLORS.primary : COLORS.sage}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={typeLabels.placeholder}
            placeholderTextColor={COLORS.textLight}
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
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
          )}
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Helper text if provided */}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {/* Dropdown Suggestions List */}
      {isDropdownVisible && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>
              {searchQuery ? `Suggestions for "${searchQuery}"` : `Standard ${typeLabels.title}`}
            </Text>
            <TouchableOpacity
              onPress={() => setIsDropdownVisible(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.dropdownCloseText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {suggestions.map((item, idx) => {
              const selected = isItemSelected(item);
              return (
                <TouchableOpacity
                  key={`${item.id || item.name}-${idx}`}
                  style={[
                    styles.suggestionItem,
                    selected && styles.suggestionItemSelected
                  ]}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionLeft}>
                    <View style={styles.suggestionNameRow}>
                      <Text
                        style={[
                          styles.suggestionName,
                          selected && styles.suggestionNameActive
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.matchedAlias && (
                        <View style={styles.aliasBadge}>
                          <Text style={styles.aliasBadgeText}>
                            Matched: &quot;{item.matchedAlias}&quot;
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.category && (
                      <Text style={styles.suggestionCategory}>{item.category}</Text>
                    )}
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={selected ? COLORS.primary : COLORS.sageMuted}
                  />
                </TouchableOpacity>
              );
            })}

            {suggestions.length === 0 && (
              <View style={styles.emptySuggestionBox}>
                <Ionicons name="sparkles-outline" size={24} color={COLORS.sage} />
                <Text style={styles.emptySuggestionText}>
                  No catalog match found for &quot;{searchQuery}&quot;
                </Text>
              </View>
            )}

            {/* Controlled "Suggest Custom Item" Button */}
            <TouchableOpacity
              style={styles.suggestActionBtn}
              onPress={handleOpenSuggest}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.suggestActionBtnText}>
                {searchQuery.trim()
                  ? `Can't find it? Suggest "${searchQuery.trim()}"`
                  : `+ Suggest new ${typeLabels.typeName}`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Suggest Custom Item Modal */}
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
                <Ionicons name="bulb-outline" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>{typeLabels.suggestTitle}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSuggestModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
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
                placeholder={`e.g. LangChain, Graph Neural Networks`}
                placeholderTextColor={COLORS.textLight}
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
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Short Description (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                value={customDesc}
                onChangeText={setCustomDesc}
                placeholder="Brief explanation of how this skill or topic is applied..."
                placeholderTextColor={COLORS.textLight}
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
                  <ActivityIndicator size="small" color={COLORS.textWhite} />
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
    marginVertical: 4
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
    color: COLORS.textMain,
    letterSpacing: 0.2
  },
  singleBadge: {
    fontSize: 11,
    color: COLORS.sage,
    fontWeight: '500'
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderColor: '#C7DEC9',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginRight: 4,
    maxWidth: 200
  },
  chipCloseBtn: {
    padding: 2,
    borderRadius: 8
  },
  singleSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    borderColor: '#B9D5BC',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6
  },
  singleSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  singleSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1
  },
  singleRemoveBtn: {
    padding: 4
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44
  },
  inputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.bgCard
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
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
    color: COLORS.textLight,
    marginTop: 4
  },
  dropdownContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    maxHeight: 250,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4
      }
    }),
    zIndex: 999
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12
  },
  dropdownHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  dropdownCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary
  },
  dropdownScroll: {
    maxHeight: 200
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  suggestionItemSelected: {
    backgroundColor: COLORS.primaryLight
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
    color: COLORS.textMain
  },
  suggestionNameActive: {
    color: COLORS.primaryDark
  },
  aliasBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6
  },
  aliasBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500'
  },
  suggestionCategory: {
    fontSize: 11,
    color: COLORS.sageMuted,
    marginTop: 2
  },
  emptySuggestionBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySuggestionText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center'
  },
  suggestActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F3F7F4',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight
  },
  suggestActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 36, 30, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.md
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 16
  },
  modalFormGroup: {
    marginBottom: 12
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4
  },
  modalInput: {
    backgroundColor: COLORS.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textMain
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted
  },
  modalSubmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textWhite
  }
});

export default CatalogMultiSelect;
