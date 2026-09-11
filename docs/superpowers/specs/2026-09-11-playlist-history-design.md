# Playlist History for Spotify — Design Spec

## Overview

A web app that tracks changes to Spotify playlists over time, providing analytics on playlist evolution, social features for collaborative playlists, and the ability to restore playlists to previous states. Built as a portfolio project.

Inspired by [playlisthistory.app](https://playlisthistory.app/) but with a differentiated feature set: analytics, social/collaborative insights, and snapshot & restore.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Database:** PostgreSQL on Supabase
- **Auth:** NextAuth.js v5 (Auth.js) with Spotify OAuth
- **ORM:** Prisma
- **Styles:** Tailwind CSS 4
- **Cron:** Vercel Cron Functions
- **Deploy:** Vercel

## Spotify OAuth Scopes

- `user-read-email` — user identification
- `playlist-read-private` — access private playlists
- `playlist-read-collaborative` — access collaborative playlists
- `playlist-modify-public` — restore feature (write back to playlists)
- `playlist-modify-private` — restore feature (private playlists)

## Data Model

### User
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| spotifyId | String | unique |
| email | String | |
| displayName | String | |
| avatarUrl | String? | |
| accessToken | String | encrypted |
| refreshToken | String | encrypted |
| tokenExpiresAt | DateTime | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### TrackedPlaylist
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| userId | String | FK -> User |
| spotifyPlaylistId | String | |
| name | String | |
| description | String? | |
| coverImageUrl | String? | |
| ownerSpotifyId | String | |
| ownerDisplayName | String | |
| isPublic | Boolean | |
| isCollaborative | Boolean | |
| trackCount | Int | current count |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Unique constraint on (userId, spotifyPlaylistId).

### PlaylistSnapshot
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| trackedPlaylistId | String | FK -> TrackedPlaylist |
| takenAt | DateTime | |
| trackCount | Int | |
| source | Enum: CRON, ON_DEMAND | |
| tracks | JSON | full track list at this point |

### PlaylistChange
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| trackedPlaylistId | String | FK -> TrackedPlaylist |
| snapshotId | String | FK -> PlaylistSnapshot |
| trackSpotifyId | String | |
| trackName | String | |
| artistName | String | |
| albumName | String | |
| albumImageUrl | String? | |
| changeType | Enum: ADDED, REMOVED | |
| detectedAt | DateTime | |
| changedBySpotifyId | String? | for collaborative playlists |

### TrackGenreCache
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| artistSpotifyId | String | unique |
| genres | JSON | string array |
| fetchedAt | DateTime | |

## Pages & Routes

### Public
- `/` — Landing page: hero, demo table with example changes, FAQ, explore CTA
- `/explore` — Public playlists being tracked by other users (no auth required)

### Protected (require auth)
- `/dashboard` — Overview of tracked playlists, recent changes summary
- `/playlist/[id]` — Playlist detail: full change timeline, snapshot history
- `/playlist/[id]/analytics` — Genre trends, artist rotation, track longevity charts
- `/playlist/[id]/restore` — Browse snapshots and restore playlist to a previous state
- `/social` — Collaborative playlist activity: who added/removed what

### API Routes
- `/api/auth/[...nextauth]` — Auth.js handlers
- `/api/playlists` — GET user's Spotify playlists, POST to start tracking one
- `/api/playlists/[id]/sync` — POST trigger on-demand sync for a playlist
- `/api/playlists/[id]/restore` — POST restore playlist to a snapshot
- `/api/playlists/[id]/analytics` — GET analytics data
- `/api/cron/sync` — GET endpoint called by Vercel Cron every 6 hours

## Core Features

### 1. Playlist Tracking
- User logs in, sees their Spotify playlists
- Selects which ones to track
- Initial snapshot is taken immediately
- Subsequent checks: every 6h via cron + on-demand when user visits playlist detail

### 2. Change Detection (Diff Engine)
- Fetch current tracks from Spotify API
- Compare with most recent snapshot
- For each difference, create a PlaylistChange record
- Save new snapshot with full track list
- Skip snapshot if no changes detected (save storage)

### 3. Timeline / History View
- Chronological list of changes grouped by date
- Each change shows: track name, artist, album art, ADDED/REMOVED badge
- For collaborative playlists: show who made the change
- Filter by change type, date range

### 4. Analytics
- **Genre evolution:** stacked area chart showing genre distribution over time
- **Artist rotation:** which artists come and go most frequently
- **Track longevity:** average time a track stays in the playlist
- **Growth chart:** playlist size over time (like GitHub contribution graph)
- Genre data comes from TrackGenreCache (fetched from Spotify artist endpoint)

### 5. Social / Collaborative
- For collaborative playlists, show per-user activity
- "Who added the most tracks this month?"
- Activity feed showing changes attributed to specific users
- Uses Spotify's `added_by` field on playlist tracks

### 6. Snapshot & Restore
- Browse previous snapshots with track count and date
- Preview: see what the playlist looked like at that point
- Restore: overwrite current playlist tracks with snapshot tracks via Spotify API
- Confirmation dialog before destructive action

### 7. Explore Page
- Shows public playlists being tracked by users who opted in
- Preview of recent changes without needing to log in
- CTA to sign up and track your own

## Sync Logic (Diff Engine)

```
1. Fetch all tracks from Spotify playlist (paginated, 100 per request)
2. Load most recent snapshot for this playlist
3. If no previous snapshot: save current as first snapshot, no diffs, done
4. Compare track IDs:
   - In current but not in previous → ADDED
   - In previous but not in current → REMOVED
5. If changes exist:
   a. Create new PlaylistSnapshot with current tracks
   b. Create PlaylistChange records for each diff
   c. Update TrackedPlaylist.trackCount
6. If no changes: do nothing (no empty snapshots)
```

## Token Refresh

Spotify access tokens expire after 1 hour. Before any API call:
1. Check if tokenExpiresAt is in the past (or within 5 min buffer)
2. If expired, use refreshToken to get new accessToken
3. Update user record with new tokens
4. Proceed with API call

## Cron Job

Vercel Cron calls `/api/cron/sync` every 6 hours.
- Secured with CRON_SECRET env var (Vercel injects this)
- Iterates through all tracked playlists
- Refreshes tokens as needed
- Runs diff engine for each playlist
- Handles rate limiting: Spotify allows ~180 requests/min, batch accordingly

## UI Design Direction

- Clean, minimal, white background (similar to original)
- Spotify green (#1DB954) as accent color
- Red/green indicators for removed/added tracks
- Tailwind for all styling, no component library
- Responsive: mobile-first
- Charts: Recharts (lightweight, React-native)

## Environment Variables

```
DATABASE_URL=            # Neon PostgreSQL connection string
NEXTAUTH_URL=            # App URL
NEXTAUTH_SECRET=         # Random secret for session encryption
SPOTIFY_CLIENT_ID=       # From Spotify Developer Dashboard
SPOTIFY_CLIENT_SECRET=   # From Spotify Developer Dashboard
CRON_SECRET=             # Vercel cron authorization
```

## Out of Scope (for now)

- Email/push notifications
- Auto-playlist creation (adding new tracks to a separate playlist)
- Real-time websocket updates
- Mobile app
