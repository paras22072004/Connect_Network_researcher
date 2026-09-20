import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'geoconnect_jwt_token';
const USER_KEY = 'geoconnect_user_data';

export const saveToken = async (token) => {
  try {
    if (Platform.OS !== 'web' && SecureStore.setItemAsync) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
  } catch (e) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
};

export const getToken = async () => {
  try {
    if (Platform.OS !== 'web' && SecureStore.getItemAsync) {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;
    }
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return await AsyncStorage.getItem(TOKEN_KEY);
  }
};

export const removeToken = async () => {
  try {
    if (Platform.OS !== 'web' && SecureStore.deleteItemAsync) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
};

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
  } catch (e) {
    console.error('Error saving user data:', e);
  }
};

export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const removeUserData = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Error removing user data:', e);
  }
};
