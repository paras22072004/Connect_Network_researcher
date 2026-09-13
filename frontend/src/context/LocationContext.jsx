import React, { createContext, useState, useContext } from 'react';
import { updateLocation as apiUpdateLocation } from '../services/locationService';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [coordinates, setCoordinates] = useState(null); // { latitude, longitude }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | loading | active | error | denied
  const [locationError, setLocationError] = useState(null);

  /**
   * Triggers browser Geolocation API prompt to obtain user coordinates
   * and posts them securely to MongoDB backend.
   */
  const requestAndSaveLocation = async () => {
    setLocationStatus('loading');
    setLocationError(null);

    if (!navigator.geolocation) {
      const errMsg = 'Geolocation is not supported by your browser.';
      setLocationError(errMsg);
      setLocationStatus('error');
      return { success: false, message: errMsg };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setCoordinates({ latitude: lat, longitude: lng });

          try {
            // Update MongoDB GeoJSON Point location
            const res = await apiUpdateLocation(lat, lng);
            if (res.success) {
              setLocationStatus('active');
              resolve({ success: true, latitude: lat, longitude: lng });
            } else {
              setLocationStatus('error');
              setLocationError(res.message || 'Failed to update backend location');
              resolve({ success: false, message: res.message });
            }
          } catch (err) {
            console.error('Error saving location to backend:', err);
            setLocationStatus('error');
            const msg = err.response?.data?.message || 'Server connection error during location update.';
            setLocationError(msg);
            resolve({ success: false, message: msg });
          }
        },
        (error) => {
          console.warn('Geolocation Error:', error);
          let errorMsg = 'Failed to obtain GPS location.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Location permission was denied. Please allow location access in your browser settings.';
            setLocationStatus('denied');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'Location information is unavailable.';
            setLocationStatus('error');
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'Location request timed out.';
            setLocationStatus('error');
          }
          setLocationError(errorMsg);
          resolve({ success: false, message: errorMsg });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
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
