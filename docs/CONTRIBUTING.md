# Contributing to Ice Truck Tracking System

## 🤝 How to Contribute

We welcome contributions to the Ice Truck Tracking System! This document provides guidelines for contributing to the project.

## 📋 Development Setup

1. **Fork the repository**
2. **Clone your fork**

   ```bash
   git clone https://github.com/your-username/ice-truck-tracking.git
   cd ice-truck-tracking
   ```

3. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

4. **Setup environment**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 🔄 Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Run quality checks**

   ```bash
   npm run lint
   npm run test
   npm run format
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

## 📝 Commit Convention

We follow [Conventional Commits](https://conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Examples

```bash
feat: add driver location tracking
fix: resolve authentication token expiration
docs: update API documentation
test: add unit tests for auth controller
```

## 🧪 Testing Guidelines

- Write unit tests for all new functions
- Add integration tests for API endpoints
- Ensure all tests pass before submitting PR
- Maintain test coverage above 80%

### Test Structure

```
tests/
├─ unit/           # Unit tests
│  ├─ auth.test.js
│  └─ health.test.js
└─ integration/    # Integration tests
   ├─ setup.js
   └─ api.test.js
```

## 📁 Code Organization

Follow the established project structure:

```
src/
├─ controllers/    # HTTP request handlers
├─ routes/        # API route definitions
├─ services/      # Business logic
├─ repositories/  # Data access
├─ middleware/    # Express middleware
└─ config/        # Configuration
```

## 🎨 Code Style

- Use ESLint and Prettier configurations
- Follow existing naming conventions
- Add JSDoc comments for functions
- Keep functions small and focused

## 🔍 Pull Request Process

1. **Ensure your PR**:
   - Has a clear title and description
   - References related issues
   - Includes tests for new functionality
   - Updates documentation if needed

2. **PR Template**:

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring

   ## Testing

   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   ```

3. **Review Process**:
   - At least one approval required
   - All CI checks must pass
   - Address review feedback promptly

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: OS, Node.js version, etc.
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Error messages/logs**
- **Screenshots** (if applicable)

## 💡 Feature Requests

For new features:

- Check existing issues first
- Provide clear use case
- Describe expected behavior
- Consider implementation approach

## 📞 Getting Help

- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Documentation**: Check `docs/` directory

## 🏆 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to the Ice Truck Tracking System! 🚚❄️
