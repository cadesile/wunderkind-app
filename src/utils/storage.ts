import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Zustand persist storage adapter backed by AsyncStorage */
export const zustandStorage = createJSONStorage(() => AsyncStorage);
