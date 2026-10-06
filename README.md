# ArcX

Making a productive working app. WinterARC mobile tracking companion built with Expo SDK 57, React Native, and Supabase.

## Tech Stack

- **Framework**: Expo SDK 57 (React Native 0.86, New Architecture)
- **Routing**: Expo Router (file-based navigation)
- **UI & Styling**: Custom design tokens & Winter Arc dark theme
- **Backend**: Supabase (Auth & Database)
- **State & Query**: TanStack React Query + Zustand

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and set your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Start the application:
   ```bash
   npx expo start
   ```

## Scripts

- `npm run start` - Start Expo development server
- `npm run lint` - Run ESLint checks
- `npx tsc --noEmit` - TypeScript typecheck
- `npm run reset-project` - Reset starter code
