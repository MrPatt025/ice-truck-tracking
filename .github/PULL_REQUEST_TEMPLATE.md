# Pull Request

## Description

<!-- Provide a clear and concise description of your changes -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Style/UI update (formatting, styling, no code change)
- [ ] ♻️ Code refactor (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test addition or update
- [ ] 🔧 Configuration/build change
- [ ] ♿ Accessibility improvement

## Checklist

### Code Quality (Required)

- [ ] ✅ Lint passes (`pnpm lint`) - **BLOCKING**
- [ ] ✅ TypeScript compiles (`pnpm typecheck`) - **BLOCKING**
- [ ] ✅ All tests pass (`pnpm test`) - **BLOCKING**
- [ ] ✅ Accessibility tests pass (`pnpm test:a11y`) - **BLOCKING**
- [ ] ✅ Production build succeeds (`pnpm build`) - **BLOCKING**
- [ ] 📝 Code follows project conventions and style guide
- [ ] 🔍 No console.log or debug statements left in code
- [ ] 🧹 No commented-out code blocks (unless with explanation)

### Testing (Required)

- [ ] ✅ Unit tests added/updated for new functionality
- [ ] ✅ E2E tests added/updated if user-facing changes
- [ ] ✅ Accessibility tests cover new UI components
- [ ] 📊 Tests have meaningful assertions (no false positives)
- [ ] 🎭 Manual testing performed on local dev environment

### Accessibility (Required for UI changes)

- [ ] ♿ Keyboard navigation works (tab order logical, no traps)
- [ ] ♿ Screen reader announces changes correctly
- [ ] ♿ Focus states visible on all interactive elements
- [ ] ♿ Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] ♿ ARIA attributes used correctly (tested with axe DevTools)
- [ ] ♿ Forms have proper labels and error messages
- [ ] ♿ No hover-only interactions (pointer + keyboard parity)

### Performance (Required for major changes)

- [ ] ⚡ Bundle size impact checked (if significant, documented)
- [ ] ⚡ No unnecessary re-renders (React DevTools profiler checked)
- [ ] ⚡ Heavy components lazy-loaded with `next/dynamic`
- [ ] ⚡ Images optimized with `next/image`
- [ ] ⚡ No blocking operations on main thread

### Security (Required for API/data changes)

- [ ] 🔒 No sensitive data exposed in client code
- [ ] 🔒 Environment variables validated (no secrets in repo)
- [ ] 🔒 Input validation on all user inputs
- [ ] 🔒 No SQL injection or XSS vulnerabilities
- [ ] 🔒 Dependencies audited (`pnpm audit`)

### Documentation

- [ ] 📝 README updated (if applicable)
- [ ] 📝 API docs updated (if endpoints changed)
- [ ] 📝 Inline comments added for complex logic
- [ ] 📝 Migration guide provided (if breaking changes)
- [ ] 📝 CHANGELOG updated (if user-facing changes)

### Git Hygiene

- [ ] 🌿 Branch is up-to-date with `main`/`develop`
- [ ] 💬 Commit messages follow convention (e.g., `feat:`, `fix:`, `docs:`)
- [ ] 🔀 No merge commits (rebased cleanly)
- [ ] 📦 No large binary files committed
- [ ] 🏷️ PR title clearly describes the change

## CI Status

<!-- GitHub Actions will automatically update this section -->

**All CI checks must pass before merge:**

- ⏳ Lint (Prettier + ESLint + Markdown)
- ⏳ TypeScript Type Check
- ⏳ Unit Tests
- ⏳ Accessibility Tests (Axe)
- ⏳ E2E Tests (Playwright)
- ⏳ Production Build
- ⏳ Bundle Analysis

## Screenshots/Videos

<!-- If UI changes, add before/after screenshots or screen recordings -->

**Before:**

<!-- Screenshot or video of current state -->

**After:**

<!-- Screenshot or video of changes -->

## Testing Instructions

<!-- Step-by-step instructions for reviewers to test your changes -->

1. Checkout this branch: `git checkout <branch-name>`
2. Install dependencies: `pnpm install`
3. Run dev server: `pnpm dev`
4. Navigate to: [specific page/feature]
5. Test scenario: [describe what to test]
6. Expected result: [what should happen]

## Related Issues

<!-- Link related issues/PRs with keywords: Closes #123, Fixes #456, Relates to #789 -->

Closes #
Relates to #

## Breaking Changes

<!-- If breaking changes, describe migration path for users -->

**None** / **See below:**

<!-- List breaking changes and migration instructions -->

## Additional Context

<!-- Any additional information, trade-offs, or decisions made -->

## Reviewer Notes

<!-- Specific areas where you'd like feedback -->

- [ ] Please review accessibility implementation carefully
- [ ] Performance impact needs assessment
- [ ] Breaking change requires approval from @team-lead
- [ ] Security implications - needs security review

---

## Post-Merge Checklist (for maintainers)

- [ ] Deployment successful to staging
- [ ] Smoke tests passed on staging
- [ ] Production deployment scheduled/completed
- [ ] Monitoring dashboards checked (no regressions)
- [ ] Documentation site updated (if applicable)
