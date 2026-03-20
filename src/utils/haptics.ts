import * as Haptics from 'expo-haptics';

/** Light tap — navigation, tab switch, minor toggle */
export const hapticTap = () => {
  try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
};

/** Medium impact — standard button press, card selection */
export const hapticPress = () => {
  try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
};

/** Heavy impact — destructive action, confirmed swipe */
export const hapticConfirm = () => {
  try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
};

/** Notification success — positive outcome (signing, transfer accepted) */
export const hapticSuccess = () => {
  try { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
};

/** Notification warning — rejection, budget warning */
export const hapticWarning = () => {
  try { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
};

/** Notification error — failed action */
export const hapticError = () => {
  try { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
};
