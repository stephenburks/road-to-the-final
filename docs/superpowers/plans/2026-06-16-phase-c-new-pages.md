# Phase C — New Pages & Navigation

**Date:** 2026-06-16 | **Status:** In Progress
**Agents needed:** @fred (arch), @velma (data script), @daphne (UI components), @shaggy (tests), @scooby (review)

## Step 1: Add `DailyMatch` types and `dailyMatches` to data script
- [x] Add `DailyMatch` interface to `src/types.ts`
- [x] Add `dailyMatches` to `AppData` type
- [x] Add `dailyMatches` export to `scripts/update-data.js` output JSON
- [ ] Verify JSON output includes `dailyMatches`

## Step 2: Add `view` state to `useAppState`
- [x] Add `View` type: `'home' | 'standings' | 'team'`
- [x] Update `readURLParams()` to include `view`
- [x] Add `view` state to `useAppState` with derivation logic
- [x] Add `handleViewChange` callback
- [x] Update `writeURLParams()` to include `view`
- [x] Update `useAppState` return interface

## Step 3: Update Nav.tsx to view-based navigation
- [x] Replace hash-anchor links with view toggle buttons
- [x] Add active state styling
- [x] Keep live/historical badge

## Step 4: Update App.tsx for conditional rendering
- [x] Conditionally render HomePage, StandingsPage, or TeamPage based on `view`
- [x] Ensure data loading gates work for all views

## Step 5: Create DailyMatchCard component
- [x] Two-team match card with flags, names, score/status
- [x] CSS module

## Step 6: Create HomePage component
- [x] Yesterday/Today/Tomorrow match sections
- [x] "View Your Team" and "View Standings" buttons
- [x] CSS module

## Step 7: Create StandingsPage component
- [x] 12 GroupTable grid
- [x] CSS module

## Step 8: Create NewsSection component
- [x] Fetch ESPN news API
- [x] Article cards with thumbnail, headline, description, byline, timestamp
- [x] Section header with disclaimer
- [x] CSS module

## Step 9: Write tests
- [x] `useAppState.test.ts` — add view state tests
- [x] `utils.test.ts` — add URL params tests for view
- [x] `DailyMatchCard.test.tsx`
- [x] `HomePage.test.tsx`
- [x] `StandingsPage.test.tsx`
- [x] `NewsSection.test.tsx`
- [ ] Run `npm test` — all pass
- [ ] Run `npm run build` — no errors

## Step 10: Verify
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
