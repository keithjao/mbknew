# MBK 4.0 - Angular Application

A modern, scalable, and future-proof Angular application with a professional navigation bar and modular architecture.

## 🎯 Project Overview

This project is built with **Angular 21+** using:
- Standalone Components
- Routing with lazy loading support
- SCSS for styling
- Scalable folder structure
- TypeScript

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                 # Core module - singleton services, interceptors
│   │   ├── services/        # Application services
│   │   └── interceptors/    # HTTP interceptors
│   │
│   ├── shared/              # Shared module - reusable components, directives, pipes
│   │   ├── components/      # Reusable components
│   │   ├── directives/      # Custom directives
│   │   └── pipes/           # Custom pipes
│   │
│   ├── features/            # Feature modules - lazy-loaded pages
│   │   ├── menu/           # Menu feature page
│   │   ├── merchandise/    # Merchandise feature page
│   │   └── rewards/        # Rewards feature page
│   │
│   ├── layouts/            # Layout components
│   │   └── navigation/     # Main navigation bar
│   │
│   ├── app.ts             # Root component
│   ├── app.html           # Root template
│   ├── app.scss           # Root styles
│   ├── app.routes.ts      # Application routes
│   └── app.config.ts      # Angular configuration
│
├── styles.scss            # Global styles
├── main.ts               # Application bootstrap
└── index.html            # HTML entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Angular CLI 21+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:4200/`

## 🎨 Navigation Bar Features

The application includes a professional navigation bar with:

### Left Navigation
- **Menu** - Navigation to the menu page
- **Merchandise** - Navigation to merchandise page
- **Rewards** - Navigation to rewards page

### Right Navigation
- **Account Menu** - Dropdown menu with:
  - Login option
  - Register option
- Hover activation for dropdown display
- Responsive design for mobile devices

## 📦 Available Commands

```bash
# Development server
npm start
# or
ng serve

# Production build
npm run build

# Run tests
ng test

# Run e2e tests
ng e2e

# Generate components
ng generate component path/component-name

# Generate services
ng generate service path/service-name
```

## 🏗️ Architecture & Scalability

### Core Module
- **Location**: `src/app/core/`
- **Purpose**: Singleton services, HTTP interceptors, guards
- **Scalability**: Add new services or interceptors as needed

### Shared Module
- **Location**: `src/app/shared/`
- **Purpose**: Reusable components, directives, and pipes
- **Scalability**: Build a component library for consistent UI

### Feature Modules
- **Location**: `src/app/features/`
- **Purpose**: Feature-specific pages and components
- **Scalability**: Each feature can be lazy-loaded for better performance

### Layouts
- **Location**: `src/app/layouts/`
- **Purpose**: Layout components (navigation, footer, sidebars)
- **Scalability**: Add additional layout variations as needed

## 🎯 Next Steps

1. **Replace Placeholders**: Update login/register endpoints
2. **Add Services**: Create services in `src/app/core/services/`
3. **Build Features**: Implement feature modules with real content
4. **Add Shared Components**: Create reusable UI components in `src/app/shared/components/`
5. **Styling**: Customize colors and themes in SCSS variables

## 📚 Angular Best Practices

- ✅ Standalone Components
- ✅ Reactive approach with Signals
- ✅ Lazy loading for feature modules
- ✅ Separation of concerns
- ✅ SCSS modules for scoped styling
- ✅ Strong typing with TypeScript
- ✅ Proper error handling

## 🔧 Development Workflow

### Creating a New Feature

```bash
# Create feature folder
ng generate component features/my-feature/my-feature

# Create service
ng generate service core/services/my-service

# Create shared component
ng generate component shared/components/my-component
```

### Adding Routes

Edit `src/app/app.routes.ts`:

```typescript
export const routes: Routes = [
  {
    path: 'my-feature',
    component: MyFeature
  }
];
```

## 📱 Responsive Design

The navigation bar is fully responsive with:
- Desktop layout (full navigation visible)
- Tablet layout (optimized spacing)
- Mobile layout (compact view with hamburger menu ready)

## 🎨 Styling

Global styles are located in:
- `src/styles.scss` - Global CSS reset and base styles
- `src/app/app.scss` - App-level styles
- Component `.scss` files - Component-scoped styles

## 🚀 Production Build

```bash
npm run build
```

Output will be in `dist/mbk-app/` ready for deployment.

## 📄 License

This project is part of the MBK 4.0 initiative.

## 🤝 Contributing

Follow the established folder structure and component patterns when adding new features.

---

**Built with Angular 21+ | Standalone Components | SCSS | TypeScript**
