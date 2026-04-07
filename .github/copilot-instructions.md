# Copilot Instructions for My Photogrammetry App

## Project Overview
This is a professional photogrammetry desktop software built with Electron, React, and Firebase for processing images into 3D models. The app focuses on user authentication and will expand to include photogrammetry processing features.

See [README.md](README.md) for basic project setup and Vite configuration.

## Tech Stack
- **Frontend**: React 18.2 + TypeScript 5.2 (strict mode), Vite 5.1 for build tooling
- **Desktop**: Electron 30.0 with electron-builder for Windows NSIS installers
- **Styling**: Tailwind CSS 4.2 for utility-first CSS
- **Icons**: Lucide React for consistent iconography
- **Routing**: React Router DOM v7 for navigation
- **Backend**: Firebase v12 (Authentication with Email/Password, Google, Facebook, GitHub + Firestore)
- **Linting**: ESLint with TypeScript rules, strict configuration

## Architecture Decisions
The app follows Electron's three-process model:
- **Main Process** (`electron/main.ts`): Handles application lifecycle, creates 1280×720 window with hidden title bar, manages DevTools (auto-open in dev)
- **Preload Script** (`electron/preload.ts`): Provides secure IPC bridge via contextBridge, exposing safe `ipcRenderer` methods
- **Renderer Process** (`src/`): React application with isolated context

**Component Structure**:
- Views in `src/Views/` orchestrate page-level logic
- Reusable components in `src/Components/`
- Props-driven communication, local state management with `useState`
- No global state library yet (suitable for current scope)

**Firebase Integration**:
- Centralized config in `src/Config/Firebase.ts`
- Auth methods: Email/password, social providers
- Firestore for data storage (not yet implemented)

## Key Conventions
- **Components**: Functional components with React hooks, TypeScript interfaces for props
- **Styling**: Tailwind utility classes only, no custom CSS files
- **State Management**: `useState` in views, callback props to child components
- **Error Handling**: Caught exceptions logged to console (no user-facing error UI yet)
- **API Calls**: Firebase SDK used directly in component event handlers
- **File Organization**: 
  - Auth-related components in `src/Components/`
  - Single view `src/Views/LogIn.tsx` manages auth flow states
- **Build Output**: Renderer to `dist/`, Electron processes to `dist-electron/`, installers to `release/{version}/`

## Build and Development Workflow
```bash
npm run dev       # Start Vite dev server with HMR (renderer only hot-reloads)
npm run build     # TypeScript compilation → Vite build → electron-builder packaging
npm run lint      # Run ESLint with zero warnings allowed
npm run preview   # Preview production build locally
```

**Development Notes**:
- Main/preload process changes require full app restart
- Use existing auth card components as templates for new features
- Firebase credentials are currently hardcoded (address security before production)

## Common Pitfalls and Issues
- **Security**: Firebase API keys exposed in client bundle; DevTools auto-open in production builds
- **User Experience**: Authentication errors only logged, no feedback to user
- **Scalability**: Local state will become unwieldy with multiple interconnected screens
- **Navigation**: No routing setup yet; app hardcoded to login view
- **Testing**: No test framework installed; high risk for regressions
- **Performance**: Sequential build steps (tsc → vite → electron-builder) can be slow
- **Environment**: No support for `.env` files; credentials must be hardcoded or require build config changes

## Development Best Practices
- Follow the existing auth card pattern for consistent UI/UX
- Add user-facing error handling for all Firebase operations
- Implement React Router when adding multiple screens
- Set up Jest or Vitest for component testing early
- Use environment variables for Firebase configuration
- Keep Tailwind as the sole styling approach
- Document IPC channels when implementing main ↔ renderer communication

## Links and Resources
- [Firebase Documentation](https://firebase.google.com/docs) for auth and database
- [Electron Documentation](https://www.electronjs.org/docs) for desktop integration
- [Vite Documentation](https://vitejs.dev/) for build tooling
- [Tailwind CSS Documentation](https://tailwindcss.com/) for styling
- [React Router Documentation](https://reactrouter.com/) for navigation

## Future Considerations
- Add photogrammetry processing logic (likely in main process or worker threads)
- Implement global state management (Zustand, Redux) as app grows
- Add comprehensive error boundaries and loading states
- Set up CI/CD for automated builds and releases
- Consider security audit for production deployment</content>
<parameter name="filePath">c:\Users\Becem\Desktop\Electron\my-photogrammetry-app\.github\copilot-instructions.md