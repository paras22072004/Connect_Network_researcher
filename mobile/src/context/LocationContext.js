import React, { createContext, useState, useContext } from 'react';
import * as Location from 'expo-location';
import { updateLocation as apiUpdateLocation } from '../services/locationService';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [coordinates, setCoordinates] = useState(null); // { latitude, longitude }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | loading | active | error | denied
  const [locationError, setLocationError] = useState(null);

  /**
   * Requests foreground GPS permission from device using expo-location
   * and updates MongoDB backend.
   */
  const requestAndSaveLocation = async () => {
    setLocationStatus('loading');
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        const errorMsg = 'Location permission was denied. Please allow location access in settings.';
        setLocationStatus('denied');
        setLocationError(errorMsg);
        return { success: false, message: errorMsg };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      setCoordinates({ latitude: lat, longitude: lng });

      // Save to backend MongoDB GeoJSON Point
      const res = await apiUpdateLocation(lat, lng);
      if (res.success) {
        setLocationStatus('active');
        return { success: true, latitude: lat, longitude: lng };
      } else {
        setLocationStatus('error');
        setLocationError(res.message || 'Failed to update location on server.');
        return { success: false, message: res.message };
      }
    } catch (err) {
      console.error('[Expo Location Error]:', err);
      const msg = err.message || 'Error acquiring device GPS coordinates.';
      setLocationStatus('error');
      setLocationError(msg);
      return { success: false, message: msg };
    }
  };

  return (
    <LocationContext.Provider
      value={{
        coordinates,
        locationStatus,
        locationError,
        requestAndSaveLocation
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
