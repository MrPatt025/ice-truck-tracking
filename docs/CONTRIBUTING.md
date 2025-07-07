# 🤝 Contributing Guide

Thank you for your interest in contributing to the Ice Truck Tracking Platform! We welcome contributions from everyone—individuals, teams, and enterprise partners.

---

## 🛠️ Development Setup

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/ice-truck-tracking.git
   cd ice-truck-tracking
   ```
3. **Install dependencies (root)**
   ```bash
   npm install
   ```
4. **Setup environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local as needed
   ```
5. **Run tests**
   ```bash
   npm run test:all
   ```

---

## 🔄 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes**
   - Follow the existing code style and architecture
   - Add/Update tests for new functionality
   - Update documentation if needed
3. **Run quality checks**
   ```bash
   npm run lint && npm run test:all && npm run format
   ```
4. **Commit your changes**
   - Use [Conventional Commits](https://www.conventionalcommits.org/)
   - Example: `feat: add driver location tracking`
5. **Push and open a Pull Request**
   - Fill out the PR template
   - Ensure all CI checks pass

---

## 📝 Commit Convention

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

**Example:**
```bash
feat: add driver location tracking
fix: resolve authentication token expiration
docs: update API documentation
test: add unit tests for auth controller
```

---

## 🧪 Testing Guidelines

- Write unit tests for all new functions
- Add integration tests for API endpoints
- Ensure all tests pass before submitting PR
- Maintain test coverage above 90%

**Test Structure:**
```
apps/backend/tests/
├─ unit/           # Unit tests
├─ integration/    # Integration tests
└─ e2e/            # End-to-end tests
```

---

## 📁 Code Organization

- Follow the monorepo structure (`apps/`, `packages/`, `infra/`, `scripts/`, `docs/`)
- Use Clean Architecture: Controllers → Services → Repositories → Database/API
- Centralized configs: ESLint, Prettier, Husky, lint-staged, commitlint

---

## 🎨 Code Style

- Use ESLint and Prettier (auto-checked in CI)
- Follow naming conventions and add JSDoc comments
- Keep functions small and focused

---

## 🔍 Pull Request Process

- Ensure your PR:
  - Has a clear title and description
  - References related issues (if any)
  - Includes tests for new functionality
  - Updates documentation if needed
- At least one approval required
- All CI checks must pass
- Address review feedback promptly

---

## 🐛 Bug Reports & 💡 Feature Requests

- Use [GitHub Issues](https://github.com/ice-truck-tracking/ice-truck-tracking/issues) for bugs and features
- Include environment, steps to reproduce, expected/actual behavior, and logs/screenshots
- For features: provide use case, expected behavior, and possible implementation

---

## 🏆 Recognition

- All contributors are recognized in:
  - README.md contributors section
  - Release notes
  - Project documentation

---

**Thank you for helping us build a world-class ice truck tracking platform!**
