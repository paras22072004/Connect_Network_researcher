import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // or 'react-native-vector-icons/Ionicons'

import { useAuth } from '../context/AuthContext';
import LoadingView from '../components/LoadingView';
import { COLORS } from '../theme/theme';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Tab Screens
import DiscoverScreen from '../screens/DiscoverScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Detail Screens
import ChatScreen from '../screens/ChatScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TeamBuilderScreen from '../screens/TeamBuilderScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import WorkspacesScreen from '../screens/WorkspacesScreen';
import WorkspaceDetailScreen from '../screens/WorkspaceDetailScreen';
import CreateWorkspaceScreen from '../screens/CreateWorkspaceScreen';
import ResearchDiscoveryScreen from '../screens/ResearchDiscoveryScreen';
import QRProfileScreen from '../screens/QRProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Vector Icons configuration with outline and filled variants (Native Mobile standard)
const TAB_CONFIG = {
  Discover: { iconFocused: 'compass', iconUnfocused: 'compass-outline', label: 'Discover' },
  Connections: { iconFocused: 'people', iconUnfocused: 'people-outline', label: 'Connections' },
  Messages: { iconFocused: 'chatbubbles', iconUnfocused: 'chatbubbles-outline', label: 'Messages' },
  Profile: { iconFocused: 'person', iconUnfocused: 'person-outline', label: 'Profile' },
};

// Modern, Clean Native Bottom Tab Bar
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 8 },
      ]}
    >
      <View style={styles.tabBarRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const tabMeta = TAB_CONFIG[route.name] || {
            iconFocused: 'grid',
            iconUnfocused: 'grid-outline',
            label: route.name,
          };

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : tabMeta.label;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, merge: true });
            }
          };

          const iconName = isFocused ? tabMeta.iconFocused : tabMeta.iconUnfocused;
          const iconColor = isFocused
            ? COLORS.primary || '#007AFF'
            : COLORS.textMuted || '#8E8E93';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName} size={24} color={iconColor} style={styles.tabIcon} />
              <Text
                style={[
                  styles.tabItemText,
                  { color: iconColor, fontWeight: isFocused ? '600' : '400' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.bgCard || '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: COLORS.border || '#E5E5EA',
        },
        headerTitleStyle: {
          color: COLORS.textMain || '#000000',
          fontSize: 17,
          fontWeight: '600',
        },
        headerTitleAlign: 'center',
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: 'Discover Nearby',
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{
          title: 'Connections',
          tabBarLabel: 'Connections',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          tabBarLabel: 'Messages',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingView message="Initializing GeoConnect..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.bgCard || '#FFFFFF',
          },
          headerTitleStyle: {
            color: COLORS.textMain || '#000000',
            fontSize: 17,
            fontWeight: '600',
          },
          headerTintColor: COLORS.primary || '#007AFF',
          headerBackTitleVisible: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainApp"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.user?.name || 'Chat',
                headerBackTitle: 'Back',
              })}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: 'Edit Profile' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings & Privacy' }}
            />
            <Stack.Screen
              name="TeamBuilder"
              component={TeamBuilderScreen}
              options={{ title: 'Build a Team' }}
            />
            <Stack.Screen
              name="Events"
              component={EventsScreen}
              options={{ title: 'Events & Conferences' }}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ title: 'Event Networking' }}
            />
            <Stack.Screen
              name="CreateEvent"
              component={CreateEventScreen}
              options={{ title: 'Host an Event' }}
            />
            <Stack.Screen
              name="Workspaces"
              component={WorkspacesScreen}
              options={{ title: 'Research Workspaces' }}
            />
            <Stack.Screen
              name="WorkspaceDetail"
              component={WorkspaceDetailScreen}
              options={{ title: 'Project Workspace' }}
            />
            <Stack.Screen
              name="CreateWorkspace"
              component={CreateWorkspaceScreen}
              options={{ title: 'New Workspace' }}
            />
            <Stack.Screen
              name="ResearchDiscovery"
              component={ResearchDiscoveryScreen}
              options={{ title: 'Discover Research Papers' }}
            />
            <Stack.Screen
              name="QRProfile"
              component={QRProfileScreen}
              options={{ title: 'QR Profile Sharing' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Clean Native iOS / Android Style Guidelines
const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: COLORS.bgCard || '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border || '#E5E5EA',
    paddingTop: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 -1px 3px rgba(0,0,0,0.05)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
    }),
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabItemText: {
    fontSize: 10,
    letterSpacing: -0.1,
  },
});

export default AppNavigator;