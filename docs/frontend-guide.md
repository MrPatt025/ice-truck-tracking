# 🎨 Frontend Development Guide

## Architecture Overview

The Ice Truck Tracking Dashboard is built with modern React/Next.js architecture focusing on performance, accessibility, and maintainability.

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: React Context + Custom Hooks
- **Testing**: Jest + Cypress + Storybook
- **Performance**: Bundle splitting, lazy loading, image optimization

## Design System

### Location: `/src/ui/`

Our design system provides consistent, reusable components:

```typescript
import { Button } from '@/ui/components/Button'
import { theme } from '@/ui/tokens/theme'
import { cn } from '@/ui/utils'
```

### Components
- **Button**: 5 variants, 3 sizes, loading states
- **ErrorBoundary**: Graceful error handling with retry
- **PreferencesPanel**: User customization interface

### Design Tokens
```typescript
// Colors, spacing, typography defined in theme.ts
const { colors, spacing, typography } = theme
```

## Performance Optimizations

### Bundle Optimization
- **Code Splitting**: Route-based + component-based
- **Tree Shaking**: Unused code elimination
- **Bundle Analysis**: Webpack Bundle Analyzer integration

### Runtime Performance
- **Lazy Loading**: React.lazy + Suspense
- **Image Optimization**: Next.js Image component
- **Caching**: Service Worker + HTTP caching

### Metrics Targets
- **FCP**: < 2s
- **LCP**: < 3s
- **CLS**: < 0.1
- **TTI**: < 3s

## Accessibility (WCAG 2.1 AA)

### Features Implemented
- **Semantic HTML**: Proper landmarks and headings
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Focus Management**: Focus traps and indicators
- **Color Contrast**: 4.5:1 minimum ratio

### Testing
```bash
# Automated accessibility testing
npm run test:a11y

# Manual testing with screen reader
# Use NVDA, JAWS, or VoiceOver
```

## Internationalization (i18n)

### Supported Languages
- **English** (en)
- **Thai** (th)

### Usage
```typescript
import { messages } from '@/i18n/messages'

// In components
const t = useTranslation()
t('dashboard.title') // "Ice Truck Tracking Dashboard"
```

### RTL Support
- Automatic layout flipping
- Icon and image mirroring
- Text direction handling

## Error Handling

### Error Boundaries
```typescript
<ErrorBoundary onError={logError}>
  <MapView />
</ErrorBoundary>
```

### Error Reporting
- **Development**: Console + React DevTools
- **Production**: Sentry integration
- **User Feedback**: Graceful fallbacks

## User Preferences

### Customizable Settings
- **Map Style**: Streets, Satellite, Terrain, Dark
- **Language**: EN/TH switching
- **Notifications**: Email, Push, Slack
- **Dashboard Layout**: Grid/List view
- **Privacy**: Analytics opt-in/out

### Storage
```typescript
// Preferences stored in localStorage
const preferences = useUserPreferences()
preferences.update('mapStyle', 'dark')
```

## Testing Strategy

### Unit Tests (Jest)
```bash
npm run test
npm run test:coverage
```

### E2E Tests (Cypress)
```bash
npm run cypress:open
npm run cypress:run
```

### Visual Regression (Storybook)
```bash
npm run storybook
npm run test:visual
```

### Performance Tests (Lighthouse CI)
```bash
npm run lighthouse
```

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Storybook
npm run storybook

# Run tests
npm run test
```

### Code Quality
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Husky**: Pre-commit hooks

### Git Workflow
```bash
# Feature development
git checkout -b feat/new-component
git commit -m "feat(ui): add new component"

# Performance improvements
git commit -m "perf(map): optimize marker rendering"

# Bug fixes
git commit -m "fix(a11y): improve keyboard navigation"
```

## Component Development

### Creating New Components

1. **Create Component**
```typescript
// src/ui/components/NewComponent.tsx
export function NewComponent({ ...props }) {
  return <div>...</div>
}
```

2. **Add Stories**
```typescript
// stories/NewComponent.stories.tsx
export default {
  title: 'UI/NewComponent',
  component: NewComponent,
}
```

3. **Write Tests**
```typescript
// __tests__/NewComponent.test.tsx
describe('NewComponent', () => {
  it('renders correctly', () => {
    render(<NewComponent />)
  })
})
```

### Best Practices
- **Accessibility First**: ARIA labels, keyboard support
- **Performance**: Memoization, lazy loading
- **Type Safety**: Full TypeScript coverage
- **Testing**: Unit + E2E + Visual
- **Documentation**: Storybook stories

## Map Integration

### Enhanced MapView Features
- **Multiple Styles**: Streets, Satellite, Terrain, Dark
- **Clustering**: Automatic truck grouping
- **Heatmap**: Density visualization
- **Context Menus**: Right-click actions
- **Smooth Animations**: Marker transitions

### Usage
```typescript
<EnhancedMapView
  trucks={trucks}
  selectedTruck={selectedTruck}
  onSelectTruck={setSelectedTruck}
  geofences={geofences}
/>
```

## Performance Monitoring

### Metrics Collection
- **Core Web Vitals**: FCP, LCP, CLS, FID
- **Custom Metrics**: API response times, error rates
- **User Analytics**: Feature usage, preferences

### Monitoring Tools
- **Lighthouse CI**: Automated performance audits
- **Web Vitals**: Real user monitoring
- **Bundle Analyzer**: Bundle size tracking

## Deployment

### Build Optimization
```bash
# Production build
npm run build

# Analyze bundle
npm run analyze

# Performance audit
npm run lighthouse
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_MAPBOX_TOKEN=your-token
NEXT_PUBLIC_SENTRY_DSN=your-dsn
```

## Troubleshooting

### Common Issues

**Slow Performance**
- Check bundle size with analyzer
- Verify lazy loading implementation
- Monitor Core Web Vitals

**Accessibility Issues**
- Run automated tests: `npm run test:a11y`
- Test with screen readers
- Verify keyboard navigation

**Build Failures**
- Check TypeScript errors
- Verify import paths
- Update dependencies

### Debug Tools
- **React DevTools**: Component inspection
- **Lighthouse**: Performance auditing
- **axe DevTools**: Accessibility testing
- **Bundle Analyzer**: Bundle inspection

---

**🎨 Frontend Excellence Achieved!**

The dashboard now provides world-class user experience with:
- ⚡ Lightning-fast performance
- ♿ Full accessibility compliance
- 🌍 Complete internationalization
- 🧪 Comprehensive testing coverage
- 📱 Responsive design
- 🎨 Consistent design system