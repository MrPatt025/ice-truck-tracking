# 📱 Ice Truck Mobile App

React Native Expo app for real-time ice truck tracking.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`

### Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

### Building

```bash
# Development build
eas build --profile development --platform android

# Production build
eas build --profile production --platform all
```

## 📱 Features

### ✅ Core Features

- **Authentication**: Secure login with JWT tokens
- **Real-time Tracking**: Live truck locations on map
- **Offline Support**: Queue actions when offline
- **Push Notifications**: Alerts and updates
- **Trip History**: Past routes and statistics
- **Settings**: User preferences and app configuration

### 🗺️ Map Features

- Interactive map with truck markers
- Real-time location updates
- Geofence visualization
- Custom callouts with truck details
- Map style switching (standard/satellite)

### 🔔 Notifications

- Push notifications for alerts
- Deep linking support
- In-app notification handling
- Background notification processing

### 🎨 UI/UX

- Light/Dark theme support
- Responsive design for phones and tablets
- Native navigation with bottom tabs
- Smooth animations and transitions

## 🏗️ Architecture

### Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth, Theme, Notifications)
├── hooks/          # Custom React hooks
├── navigation/     # Navigation configuration
├── screens/        # Screen components
├── services/       # API services
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

### Key Technologies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and tools
- **React Navigation**: Navigation library
- **React Native Maps**: Map integration
- **Expo Notifications**: Push notifications
- **Expo SecureStore**: Secure token storage

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### E2E Tests (Detox)

```bash
# Build for testing
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

## 🚀 Deployment

### App Store Deployment

```bash
# Build for production
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios
```

### Google Play Deployment

```bash
# Build for production
eas build --profile production --platform android

# Submit to Google Play
eas submit --platform android
```

### OTA Updates

```bash
# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```
API_BASE_URL=https://api.icetrucktracking.com
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### Deep Linking

App supports deep links with scheme `ice-truck://`:

- `ice-truck://alert/123` - Open specific alert
- `ice-truck://truck/456` - View truck details

## 📊 Performance

### Optimization Features

- Code splitting and lazy loading
- Image optimization
- Bundle size optimization
- Memory leak prevention
- Smooth 60fps animations

### Monitoring

- Crash reporting with Sentry
- Performance monitoring
- User analytics
- Error tracking

## 🔒 Security

### Security Features

- JWT token authentication
- Secure token storage
- API request encryption
- Certificate pinning
- Biometric authentication support

## 📱 Platform Support

### iOS

- iOS 13.0+
- iPhone and iPad support
- Native iOS components
- App Store ready

### Android

- Android 6.0+ (API 23)
- Phone and tablet support
- Material Design components
- Google Play ready

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**🚚❄️ Ice Truck Mobile - Track your fleet on the go!**
