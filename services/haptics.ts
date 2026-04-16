import * as Haptics from 'expo-haptics';

/**
 * Light haptic feedback for subtle interactions
 * Examples: dismiss, screen navigation, minor action completion
 */
export async function hapticLight() {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Medium haptic feedback for standard interactions
 * Examples: button press, form submission, adding to watchlist
 */
export async function hapticMedium() {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Heavy haptic feedback for important interactions
 * Examples: critical confirmation, major action
 */
export async function hapticHeavy() {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Success notification haptic
 * Three pulses indicating successful completion
 */
export async function hapticSuccess() {
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Warning notification haptic
 * Two slower pulses indicating caution
 */
export async function hapticWarning() {
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Error notification haptic
 * Pattern indicating an error occurred
 */
export async function hapticError() {
    try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Selection haptic for when a choice is highlighted
 */
export async function hapticSelection() {
    try {
        await Haptics.selectionAsync();
    } catch (error) {
        console.error('Haptic feedback error:', error);
    }
}

/**
 * Suggested places to add haptics:
 *
 * - Mark episode watched: hapticSuccess()
 * - Add to watchlist: hapticMedium()
 * - Submit vote: hapticMedium()
 * - Unlock achievement: hapticSuccess()
 * - Sign out: hapticLight()
 * - Navigation: hapticLight()
 * - Poll vote: hapticLight()
 * - Streak at risk: hapticWarning()
 * - Error in form: hapticError()
 */
