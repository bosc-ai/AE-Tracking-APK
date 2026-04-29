# Building the D2C Delivery Driver APK

This guide walks you through generating an Android APK from this project using Capacitor.

## Prerequisites

- **Node.js** 18+ installed
- **Android Studio** installed (for building the APK)
  - Download: https://developer.android.com/studio
  - During setup, install Android SDK 34+ and Android Build Tools
- **Java JDK 17+** installed
- Your `.env` file configured with Supabase keys

## Step-by-Step Build

### 1. Build the Web App
```bash
npm run build
```
This generates the production bundle in `./dist`.

### 2. Initialize Android Platform
```bash
npx cap add android
```
This creates the `android/` directory with a full Android Studio project.

### 3. Sync Web Assets to Android
```bash
npx cap sync android
```
This copies the `dist/` build output into the Android project and syncs Capacitor plugins.

### 4. Add Required Permissions
Open `android/app/src/main/AndroidManifest.xml` and ensure these permissions are present inside `<manifest>`:

```xml
<!-- GPS for live tracking -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Camera for delivery proof -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />
```

### 5. Open in Android Studio
```bash
npx cap open android
```
This opens the project in Android Studio.

### 6. Build APK
In Android Studio:
1. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the build to complete
3. Find the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 7. Build Signed Release APK (for Play Store)
1. Go to **Build → Generate Signed Bundle / APK**
2. Create or use a keystore
3. Select **APK** (not AAB for sideloading)
4. Choose **release** build variant
5. Click **Finish**

## Development Tips

### Live Reload During Development
To test changes instantly on your device/emulator:

1. Find your local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Edit `capacitor.config.ts`:
   ```ts
   server: {
     url: 'http://YOUR_LOCAL_IP:5173',
     cleartext: true,
   }
   ```
3. Run `npm run dev` and `npx cap sync android`
4. Re-run the app in Android Studio

### Re-syncing After Code Changes
After making changes to the web code:
```bash
npm run build && npx cap sync android
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `JAVA_HOME not set` | Install JDK 17 and set `export JAVA_HOME=/path/to/jdk` |
| White screen on app load | Check `webDir` in `capacitor.config.ts` points to `dist` |
| GPS not working | Ensure location permissions are in AndroidManifest.xml |
| Camera not working | Ensure camera permissions are in AndroidManifest.xml |
