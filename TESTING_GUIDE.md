# Testing Guide Before PlayStore Upload

## Why Expo Go Doesn't Catch All Crashes

Expo Go runs in a managed environment that masks some native errors. PlayStore builds are production builds with different error handling. The crash handler you've implemented needs testing in a real build.

## Testing Strategy (Recommended Order)

### 1. **Local Testing with Expo Go** (Current - 5 mins)
✅ **What it does:** Tests React/JS logic, navigation, UI
✅ **When to use:** During development, quick iterations

```bash
npm start
# Open in Expo Go on Android/iOS
```

❌ **Limitations:** Doesn't test native modules, production error handling, or app lifecycle

---

### 2. **Development Build** (Recommended - 15-30 mins)
✅ **What it does:** Real native app on your device, still debuggable
✅ **Catches:** Native errors, unhandled JS exceptions, memory leaks
✅ **Best for:** Testing crash handlers before production

```bash
# Create development build locally or via EAS
eas build --platform android --profile preview
# OR for quick local build
expo prebuild --clean
npx expo run:android
```

Then test your crash scenarios:
- Force a null pointer error
- Disconnect network and test API calls
- Close/reopen app rapidly
- Low memory simulation
- Test error handler alerts

---

### 3. **Internal Testing on Android** (Fast - 5 mins per iteration)
✅ **Fastest real build testing without PlayStore delays**
✅ **Steps:**
   1. Build and upload to internal testing track (not production)
   2. Share link with testers (even just yourself)
   3. Install from link on device
   4. Test thoroughly
   5. Can update multiple times without PlayStore review

**Time saved:** Internal testing updates go live in ~15 minutes vs PlayStore review (24-48 hours)

```bash
# Build for internal testing
eas build --platform android --profile preview

# Upload to Internal Testing track in Google Play Console
# Go to: Testing → Internal testing → Create new release
```

---

### 4. **Crash Handler Testing Checklist**

Before any real build, manually trigger and verify:

#### Test 1: Network Error Handler
```typescript
// In any screen, add temporary button for testing
<Button 
  onPress={async () => {
    try {
      const response = await fetch('https://invalid-domain-12345.com');
      await response.json();
    } catch (error) {
      console.error('Network test error:', error);
      // Should be caught by errorHandler
    }
  }}
  title="Test Network Error"
/>
```

#### Test 2: Null Property Access
```typescript
// This would normally crash - should be caught
const user: any = null;
const name = user?.profile?.name || 'Unknown'; // ✅ Safe with optional chaining

// Or using validation helper:
import { getNestedValue } from '@/services/validation';
const name = getNestedValue(user, 'profile.name', 'Unknown');
```

#### Test 3: Unhandled Promise Rejection
```typescript
// This would crash the app - now caught
Promise.reject(new Error('Test rejection'))
  .catch(err => console.error('Caught:', err)); // ✅ Always add .catch()
```

#### Test 4: Global Error Handler
```typescript
// Add temp button to test global handler
<Button 
  onPress={() => {
    throw new Error('Test fatal error');
  }}
  title="Test Crash"
/>
// Should show alert instead of closing
```

---

### 5. **Automated Testing** (Optional - Better for CI/CD)

Add simple smoke tests:

```bash
npm install --save-dev jest react-native-testing-library
```

Create `__tests__/crash-handler.test.ts`:
```typescript
import { safeAsync, retryAsync } from '@/services/errorHandler';
import { getNestedValue, validateString } from '@/services/validation';

describe('Error Handling', () => {
  it('safeAsync catches errors', async () => {
    const result = await safeAsync(
      () => Promise.reject(new Error('test')),
      { onError: (err) => expect(err.message).toBe('test') }
    );
    expect(result).toBeNull();
  });

  it('getNestedValue handles null safely', () => {
    const value = getNestedValue(null, 'a.b.c', 'default');
    expect(value).toBe('default');
  });

  it('validateString rejects invalid input', () => {
    expect(validateString(null)).toBe(false);
    expect(validateString('hello')).toBe(true);
  });
});
```

Run tests:
```bash
npm test
```

---

## Real Device Testing (Most Important)

### Android Emulator Testing
```bash
# Start Android emulator, then:
npx expo run:android
```

### Physical Device Testing
```bash
# Connect device via USB, enable Developer Mode
npx expo run:android

# Or via wireless
adb connect <device-ip>:5555
npx expo run:android
```

**Test scenarios:**
- Kill app while loading data
- Turn off WiFi mid-request
- Clear app data
- Multiple rapid restarts
- Background → foreground transitions
- Memory pressure (run other apps)

---

## PlayStore Upload Checklist

Before uploading to production:

- [ ] Tested in dev build on real device
- [ ] Tested in internal testing track first
- [ ] All 4 crash handler tests pass
- [ ] No console errors in logcat: `adb logcat | grep -i error`
- [ ] Navigation works without crashes
- [ ] Network requests handle failures gracefully
- [ ] Error messages display correctly
- [ ] App restarts cleanly from error state

---

## Debugging Crashes on Device

### View Logs During Development Build
```bash
# Android
adb logcat | grep -E "RN|ReactNative|FATAL|Exception"

# Or Expo CLI logs
eas build --platform android --profile preview
```

### Check Crash Reports After PlayStore Upload
1. Google Play Console → Your app → Vitals → Crashes
2. View stack traces to identify patterns
3. Fix and upload new version to internal testing first

---

## Recommended Testing Flow

```
Local Dev (Expo Go)
       ↓ (5-10 mins)
Development Build (npx expo run:android)
       ↓ (10-20 mins - test crash handlers manually)
Internal Testing Track (EAS build)
       ↓ (15 mins - wait for build + install on device)
Device Testing (Real scenarios)
       ↓ (30 mins - various network/memory conditions)
PlayStore Production Upload
```

**Total time: ~1-2 hours** vs 24-48 hours waiting for PlayStore review

---

## Why This Matters for Your App

Your app had unhandled crashes that closed on launch. The error handler prevents this, but you need to:

1. ✅ Verify the handler works (dev build)
2. ✅ Test async errors are caught (internal track)
3. ✅ Confirm no regressions on real device
4. ✅ Monitor crash reports in Play Console

After first upload, monitor Vitals dashboard for:
- ANRs (app not responding)
- Native crashes
- JS exceptions
- Memory issues

If issues appear, they'll show up in the crash stack trace in Play Console.
