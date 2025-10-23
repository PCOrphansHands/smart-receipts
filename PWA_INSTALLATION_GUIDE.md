# PWA Installation Guide

**Orphans Hands - Smart Receipts** can now be installed as a Progressive Web App (PWA) on your iPhone or Android device!

---

## ✨ What is a PWA?

A Progressive Web App allows you to install the web application on your phone's home screen just like a native app from the App Store or Google Play. You get:

- **📱 Home Screen Icon** - Tap to launch like any other app
- **🚀 Faster Loading** - Cached resources load instantly
- **📵 Offline Support** - Some features work without internet
- **🎯 Full Screen Experience** - No browser UI clutter
- **🔔 Native Feel** - Looks and feels like a real mobile app

---

## 📱 Installation Instructions

### iPhone / iPad (iOS Safari)

1. **Open Safari** on your iPhone/iPad
2. **Navigate** to your Smart Receipts app URL (e.g., `https://your-domain.com`)
3. **Tap the Share button** (the square with an arrow pointing up) at the bottom of the screen
4. **Scroll down** and tap **"Add to Home Screen"**
5. **Edit the name** if desired (default: "Smart Receipts")
6. **Tap "Add"** in the top-right corner
7. **Done!** The app icon will appear on your home screen

#### iOS Features:
- Opens in full-screen mode (no Safari UI)
- Status bar matches app theme color
- Works like a native iOS app

---

### Android (Chrome)

1. **Open Chrome** on your Android device
2. **Navigate** to your Smart Receipts app URL
3. **Tap the menu** (three dots) in the top-right corner
4. **Select "Add to Home screen"** or "Install app"
5. **Confirm** by tapping "Add" or "Install"
6. **Done!** The app will appear on your home screen

#### Alternative Method (Android):
- Chrome will automatically show an **"Install app"** banner at the bottom of the screen
- Simply tap "Install" when prompted

#### Android Features:
- Opens in standalone mode (no browser chrome)
- Can be found in your app drawer
- Fully integrated with Android

---

### Desktop (Chrome, Edge, Brave)

Desktop installation also works:

1. **Visit the app** in Chrome, Edge, or Brave browser
2. **Look for the install icon** (⊕) in the address bar
3. **Click "Install"** when prompted
4. **The app opens in its own window** without browser tabs

---

## 🔧 Technical Details

### What Gets Cached:
- ✅ App shell (HTML, CSS, JavaScript)
- ✅ Images and icons
- ✅ Google Fonts
- ✅ Supabase API responses (24 hours)

### Service Worker:
The app uses Workbox for intelligent caching:
- **NetworkFirst** strategy for Supabase API calls (tries network, falls back to cache)
- **CacheFirst** strategy for static assets like fonts (fast loading)
- **Auto-updates** when new versions are deployed

### Manifest Configuration:
- **App Name**: "Orphans Hands - Smart Receipts"
- **Short Name**: "Smart Receipts"
- **Theme Color**: `#1e40af` (blue)
- **Display Mode**: Standalone (full-screen)
- **Icons**: 192x192, 512x512, 180x180 (iOS), and original logo

---

## 🚀 Benefits for Orphans Hands Users

### For Field Staff:
- **Quick Access** - Tap icon, instant launch
- **Reliable** - Cached assets work in low connectivity
- **Professional** - Feels like a dedicated app

### For Administrators:
- **No App Store** - No approval process or publishing fees
- **Instant Updates** - Push changes, users get them automatically
- **Cross-Platform** - One codebase works on iOS and Android

---

## ⚙️ Deployment Requirements

To enable PWA features in production:

1. **HTTPS Required** - PWAs only work on secure connections
2. **Valid SSL Certificate** - Use Let's Encrypt, Cloudflare, or your hosting provider
3. **Deploy to a domain** - e.g., `https://receipts.orphanshands.org`

**Note**: PWA features work in development on `localhost` without HTTPS.

---

## 🔍 Verifying Installation

After deploying to production, verify PWA is working:

### Chrome DevTools (Desktop):
1. Press F12 to open DevTools
2. Go to **Application** tab
3. Check:
   - **Manifest** - Should show "Orphans Hands - Smart Receipts"
   - **Service Workers** - Should show "activated"
   - **Cache Storage** - Should list cached resources

### Lighthouse Audit:
1. Open DevTools → **Lighthouse** tab
2. Select **Progressive Web App** category
3. Click **Generate Report**
4. Should score **90+** on PWA metrics

---

## 📝 Customization

To customize PWA settings, edit:

### Manifest (`vite.config.ts`):
```typescript
VitePWA({
  manifest: {
    name: "Your Custom Name",
    short_name: "Short Name",
    theme_color: "#your-color",
    // ... other settings
  }
})
```

### Icons:
Replace icons in `frontend/public/`:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)
- `apple-touch-icon.png` (180x180px)

### Caching Strategy:
Modify `workbox.runtimeCaching` in `vite.config.ts` to adjust caching behavior.

---

## ❓ Troubleshooting

### "Add to Home Screen" not showing (iOS):
- Ensure you're using Safari (not Chrome)
- Visit the site at least once
- Check that you have a valid SSL certificate

### Service Worker not registering:
- Check browser console for errors
- Verify the site is served over HTTPS (or localhost)
- Clear cache and hard reload (Cmd/Ctrl + Shift + R)

### Icons not displaying:
- Verify icon files exist in `/public/` folder
- Check that icons are accessible (visit `/icon-192.png` directly)
- Ensure proper sizes: 192x192, 512x512, 180x180

### Updates not appearing:
- PWA caches aggressively for performance
- Close all app windows/tabs
- Reopen the app - service worker will update in background
- Or manually unregister service worker in DevTools

---

## 🎉 Success!

Your Smart Receipts app is now installable on any modern smartphone or tablet. Users get a native app experience without the complexity of app stores!

**Pro Tip**: Once deployed, share the direct URL via SMS or email. Users can install it instantly without visiting app stores.

---

## 📚 Additional Resources

- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [iOS PWA Support](https://webkit.org/blog/7929/introducing-the-progressive-web-app/)
- [Android PWA Installation](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)

---

**Generated**: 2025-10-23
**App Version**: 1.0.0
**Status**: ✅ Production Ready
