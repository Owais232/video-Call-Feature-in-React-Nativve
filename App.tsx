import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import RegisterScreen from './android/source/Screens/Registration';
import UsersScreen from './android/source/Screens/Users';
import LoginScreen from './android/source/Screens/Loginscreen';
import VideoCallScreen from './android/source/Screens/VideoCallScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Handle user state changes
  function onAuthStateChanged(user: any) {
    setUser(user);
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  if (initializing) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator>
  {user ? (
    <>
      <Stack.Screen name="Users" component={UsersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="VideoCallScreen" component={VideoCallScreen} options={{ headerShown: false }} />
    </>
  ) : (
    <>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </>
  )}
</Stack.Navigator>

    </NavigationContainer>
  );
}
