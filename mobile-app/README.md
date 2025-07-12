# 📱 Ice Truck Mobile App

**Track your fleet in real time, anywhere.**

---

## 🚀 Features
- Real-time truck location and status
- Push notifications (Expo)
- Secure authentication (JWT)
- Offline support and data sync
- Deep linking (ice-truck://)
- Mapbox integration
- Performance monitoring & crash reporting
- iOS & Android support

---

## 🏗️ Project Structure

```
apps/mobile-app/
├─ src/
│  ├─ components/
│  ├─ contexts/
│  ├─ hooks/
│  ├─ navigation/
│  ├─ screens/
│  └─ services/
├─ app.json
├─ package.json
└─ ...
```

---

## ⚡️ Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Expo CLI (`npm install -g expo-cli`)
- Android/iOS device or emulator

### 1. Install dependencies
```bash
cd apps/mobile-app
npm install
```

### 2. Configure Environment
Create `.env` file:
```
API_BASE_URL=https://api.icetrucktracking.com
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 3. Start the App
```bash
npx expo start
```
- Scan QR code with Expo Go (iOS/Android)
- Or run on emulator: `npx expo run:android` / `npx expo run:ios`

---

## 🧪 Testing

| Type      | Command                |
|-----------|------------------------|
| Unit      | `npm test`             |
| E2E (Detox) | `detox test`         |

---

## 🚀 Deployment

| Platform   | Build Command                                      |
|------------|----------------------------------------------------|
| iOS        | `eas build --profile production --platform ios`    |
| Android    | `eas build --profile production --platform android`|
| OTA Update | `eas update --branch production --message "..."`   |

---

## 🔒 Security
- JWT token authentication
- Secure token storage (Expo SecureStore)
- API request encryption
- Biometric authentication support

---

## 🛠️ Troubleshooting
| Issue                  | Solution                                 |
|------------------------|------------------------------------------|
| API not reachable      | Check `API_BASE_URL` in `.env`           |
| Push notifications fail| Check Expo credentials & permissions     |
| Map not loading        | Check `MAPBOX_ACCESS_TOKEN`              |
| App crashes            | Run `npm install`, clear cache, restart  |

---

## 🤝 Contributing
- Fork the repository
- Create a feature branch
- Make changes and add tests
- Commit with [conventional commits](https://www.conventionalcommits.org/)
- Open a Pull Request

---

## 📄 License
MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built for global, real-time ice truck operations.**
