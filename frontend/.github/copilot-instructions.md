# MBK 4.0 Angular Project - Copilot Instructions

This file provides guidelines for working with the MBK 4.0 Angular project.

## Project Overview

- **Framework**: Angular 21+
- **Style**: SCSS
- **Architecture**: Modular with Core, Shared, and Features modules
- **Components**: Standalone components with routing

## Folder Structure Rules

### Core Module (`src/app/core/`)
- **services/**: Application-wide singleton services (authentication, API, etc.)
- **interceptors/**: HTTP interceptors for handling requests/responses
- **guards/**: Route guards for protected routes

**When to use**: Services that need to be available throughout the application

### Shared Module (`src/app/shared/`)
- **components/**: Reusable UI components
- **directives/**: Custom Angular directives
- **pipes/**: Custom transformation pipes

**When to use**: Components/directives/pipes used across multiple features

### Features Module (`src/app/features/`)
- Each feature folder contains its own component with routes
- Create subfolders for each major feature
- Can have their own services specific to that feature

**When to use**: Feature-specific pages and components

### Layouts (`src/app/layouts/`)
- Contains layout components like navigation, footer, sidebars
- Currently includes navigation component

**When to use**: Application-wide layout structures

## Component Generation Guidelines

### Generate a Service
```bash
ng generate service core/services/my-service
```

### Generate a Shared Component
```bash
ng generate component shared/components/my-component --skip-tests --style=scss
```

### Generate a Feature Component
```bash
ng generate component features/my-feature/my-feature --skip-tests --style=scss
```

## Routing Rules

- All routes are defined in `src/app/app.routes.ts`
- Feature modules should be routable from this file
- Use lazy loading for better performance when adding new features
- Maintain the hierarchy: path → component

## Styling Guidelines

- Use SCSS variables for consistent theming
- Component styles go in component `.scss` files
- Global styles in `src/styles.scss`
- App-level styles in `src/app/app.scss`
- Current color scheme:
  - Primary text: `#333333`
  - Secondary text: `#666666`
  - Accent color: `#ff6b6b`
  - Background: `#f8f9fa`
  - Border: `#e0e0e0`

## Navigation Component

The navigation component (`src/app/layouts/navigation/`) includes:
- Logo area (MBK)
- Left navigation: Menu, Merchandise, Rewards
- Right navigation: Account dropdown with Login/Register

**Important**: This component is used in the main `app.html` template. Do not modify routes or paths without updating corresponding links.

## State Management

Currently using Angular Signals for state management. Examples:
- `isAccountDropdownOpen = signal(false)` in navigation component
- Update with `.set()` and `.update()` methods

For complex state, consider adding a service-based state management solution.

## Code Quality Standards

- Use strict TypeScript typing (avoid `any`)
- Standalone components with explicit imports
- Proper component encapsulation
- Meaningful variable and function names
- Add JSDoc comments for public methods

## Testing

When adding tests:
- Create `.spec.ts` files alongside components
- Use Vitest for unit tests
- Test component logic, not templates
- Keep tests simple and focused

## Before Deployment

- Run `npm run build` to compile production code
- Check console for any warnings
- Verify all routes work properly
- Test responsive design on mobile devices

## Adding New Features

1. Create component in `features/` folder
2. Add route in `app.routes.ts`
3. Create services in `core/services/` if needed
4. Use shared components for UI consistency
5. Add to navigation if it's a main feature

## Common Tasks

### Adding a New Page
1. Generate component: `ng generate component features/new-page`
2. Add route to `app.routes.ts`
3. Add link in navigation if needed
4. Create page-specific services in `core/services/`

### Creating a Reusable Component
1. Generate in shared: `ng generate component shared/components/new-component`
2. Export from `shared.module.ts` (if needed)
3. Import in components that need it

### Adding Authentication
1. Create `auth.service.ts` in `core/services/`
2. Create `auth.guard.ts` in `core/guards/`
3. Apply guard to protected routes in `app.routes.ts`
4. Update login/register links in navigation component

## Performance Tips

- Use OnPush change detection for components when possible
- Implement lazy loading for feature modules
- Use trackBy in *ngFor loops
- Minimize bundle size by removing unused dependencies

## Dependencies

- Angular 21+
- TypeScript 5+
- SCSS
- Angular Routing

## Project Configuration

- TypeScript: `tsconfig.json`
- Angular: `angular.json`
- Styling: Global `styles.scss`
- Environment configs: `src/environments/`

---

**Last Updated**: May 14, 2026
**Version**: 1.0
