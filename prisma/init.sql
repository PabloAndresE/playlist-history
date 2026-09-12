-- Enums
CREATE TYPE "SnapshotSource" AS ENUM ('CRON', 'ON_DEMAND');
CREATE TYPE "ChangeType" AS ENUM ('ADDED', 'REMOVED');

-- User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");

-- TrackedPlaylist
CREATE TABLE "TrackedPlaylist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyPlaylistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "ownerSpotifyId" TEXT NOT NULL,
    "ownerDisplayName" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isCollaborative" BOOLEAN NOT NULL DEFAULT false,
    "trackCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrackedPlaylist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrackedPlaylist_userId_spotifyPlaylistId_key" ON "TrackedPlaylist"("userId", "spotifyPlaylistId");

-- PlaylistSnapshot
CREATE TABLE "PlaylistSnapshot" (
    "id" TEXT NOT NULL,
    "trackedPlaylistId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackCount" INTEGER NOT NULL,
    "source" "SnapshotSource" NOT NULL,
    "tracks" JSONB NOT NULL,
    CONSTRAINT "PlaylistSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlaylistSnapshot_trackedPlaylistId_takenAt_idx" ON "PlaylistSnapshot"("trackedPlaylistId", "takenAt");

-- PlaylistChange
CREATE TABLE "PlaylistChange" (
    "id" TEXT NOT NULL,
    "trackedPlaylistId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "trackSpotifyId" TEXT NOT NULL,
    "trackName" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumImageUrl" TEXT,
    "changeType" "ChangeType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBySpotifyId" TEXT,
    CONSTRAINT "PlaylistChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlaylistChange_trackedPlaylistId_detectedAt_idx" ON "PlaylistChange"("trackedPlaylistId", "detectedAt");

-- TrackGenreCache
CREATE TABLE "TrackGenreCache" (
    "id" TEXT NOT NULL,
    "artistSpotifyId" TEXT NOT NULL,
    "genres" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackGenreCache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrackGenreCache_artistSpotifyId_key" ON "TrackGenreCache"("artistSpotifyId");

-- Foreign keys
ALTER TABLE "TrackedPlaylist" ADD CONSTRAINT "TrackedPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistSnapshot" ADD CONSTRAINT "PlaylistSnapshot_trackedPlaylistId_fkey" FOREIGN KEY ("trackedPlaylistId") REFERENCES "TrackedPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistChange" ADD CONSTRAINT "PlaylistChange_trackedPlaylistId_fkey" FOREIGN KEY ("trackedPlaylistId") REFERENCES "TrackedPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaylistChange" ADD CONSTRAINT "PlaylistChange_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "PlaylistSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
