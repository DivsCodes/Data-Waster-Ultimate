# Phase 9 — Community backend integration plan

The Phase 9 UI included in this ZIP is a local-first community workspace. It does **not** create online accounts, send invitations, sync contacts, host teams, or publish a global leaderboard. Those functions require a hosted identity/database service and a public deployment configuration.

## Recommended hosted architecture

Use Supabase Auth + Postgres + Row Level Security (or an equivalent managed backend with equivalent guarantees). Keep all client-facing keys limited to public/anonymous keys protected by strict RLS. A service-role key must only exist in a trusted server/Edge Function environment and must never be placed in a `VITE_` variable or committed to Git.

Suggested entities:

- `community_profiles`: `user_id` (auth user FK), unique lowercase `handle`, `display_name`, `bio`, `visibility`, `created_at`, `updated_at`.
- `friendships`: `id`, `requester_id`, `addressee_id`, `status` (`pending`, `accepted`, `blocked`), timestamps; unique unordered user pair and no self-friendship.
- `community_teams`: `id`, `owner_id`, `name`, `tag`, `description`, `visibility`, timestamps.
- `community_team_members`: `team_id`, `user_id`, `role`, `joined_at`; unique `(team_id, user_id)`.
- `community_challenges`: `id`, `owner_id`, optional `team_id`, `title`, `metric`, `target`, `starts_at`, `ends_at`, `status`.
- `community_stats`: user ID, XP, completed games, completed sessions, updated time. Writes should be server-controlled, not accepted directly from a browser client.

## Security requirements

1. Require authentication for contact/friendship, team and challenge mutations.
2. Add RLS to every user-owned table. Users can only update their own profile and owned teams/challenges; friendship reads and updates are limited to participants.
3. Public profile reads must filter by `visibility = 'public'`; private profiles must not leak through leaderboard joins or RPCs.
4. Validate handles, lengths, target ranges, dates and status transitions on the server as well as in the UI.
5. Prevent self-friendships, duplicate requests, duplicate team membership and ownerless teams with database constraints.
6. Calculate XP and leaderboard scores on trusted server code from verifiable events. Do not accept arbitrary client-submitted XP or transferred-byte claims.
7. Rate-limit account, friendship, challenge and search endpoints. Add abuse reporting and account deletion/export flows before a public launch.
8. Never store passwords in Data Waster localStorage. Delegate sign-in and credential handling to the identity provider.

## Suggested API surface

- `GET /me` and `PATCH /me`
- `GET /profiles/:handle` (public profiles only)
- `GET /friends`, `POST /friend-requests`, `POST /friend-requests/:id/accept`, `DELETE /friends/:id`
- `GET /teams`, `POST /teams`, `POST /teams/:id/members`, `DELETE /teams/:id/members/:userId`
- `GET /challenges`, `POST /challenges`, `PATCH /challenges/:id`, `POST /challenges/:id/join`
- `GET /leaderboard?period=weekly|monthly|all-time`

## Integration boundary

The frontend community model is in `src/features/community/community.ts`. Keep the UI independent of a specific vendor by introducing an asynchronous `CommunityRepository` interface (profile, friendships, teams, challenges, leaderboard) when a backend is provisioned. The current localStorage helpers can remain as a local-preview implementation. Do not silently switch to mock remote data when requests fail; show connection/error states.

Before enabling an online connection, provision the database schema, RLS policies, authentication providers, allowed origins and environment variables, then test with at least two separate accounts and verify private-profile, cross-user and abuse cases.
