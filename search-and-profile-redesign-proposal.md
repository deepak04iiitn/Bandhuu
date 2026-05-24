# Bandhuu — Search Tab & User Profile Screen Redesign Proposal

---

## What Currently Exists and What's Wrong

### SearchTab
1. **Hardcoded mock data everywhere** — "Trending Yaaris" shows Ishaan Malik and Meera V. with hardcoded Google photo URLs. "Discover in Your City" and "Suggested for You" are completely static. None of this is real user data.
2. **Wrong color system** — Old blue (#004ac6) and orange (#e8380d) throughout. Completely inconsistent with the warm terracotta system established in HomeTab, PostTab, and NotificationsTab.
3. **No filter dimension** — You can only search by name/username. No way to filter by hometown, current city, or gender from the search tab directly.
4. **Discover view has no personality** — Three sections of fake cards don't tell the user anything meaningful about who's on the platform in their city.
5. **Search results are in a separate bordered card** — the results sit inside a "resultsCard" with a box shadow and border, which creates a container-within-container visual noise.
6. **"Add Yaari" button uses old colors** — primary blue or grey, not the terracotta system.

### UserProfileScreen
1. **Wrong color system** — Blue (#004ac6) on icon wraps, connect button, map polyline. Inconsistent.
2. **No posts preview** — You see someone's profile but have no idea what they post about. A posts preview is the most natural way to understand a person's community presence.
3. **Stats row is two plain boxes** — "Posts 3" and "Yaaris 5" in bordered rectangles. Underwhelming for metrics that communicate community involvement.
4. **Avatar has a squared blue border** — Inconsistent with the circular avatar design used everywhere else in the app.
5. **Profile details card is a flat list** — Occupation, gender, hometown, location — 4 rows in a box. No visual hierarchy. All items feel equally important (they're not — hometown is the most important).
6. **Journey Map is underutilized** — It's genuinely cool but it's buried in a card at the bottom, the same visual weight as "Profile Details." It deserves to be a headline feature.
7. **No mutual connections indicator** — If you have connections in common with this person, you have no way to know from the profile.
8. **"Bandhuu Member" pill consumes space** — The top of the hero card wastes real estate on a badge that's obvious.

---

## The Design Direction

Both screens share a theme: **discovering and understanding people.** The SearchTab is how you find them; the ProfileScreen is how you know them. The redesign makes both feel like tools for human connection, not people-finder utilities.

Key principles:
- Terracotta system, warm off-white surfaces, serif for human names and headlines
- **Hometown is the hero data point** — it should be visually prominent on both screens
- Real data everywhere — the discover view uses actual users from the API
- Generous whitespace, no cluttered rows of tiny info

---

## Part 1 — Search Tab Redesign

---

### 1.1 Screen Architecture

The screen has two modes, identical to HomeTab:

**Empty / Discover mode** (when search bar is empty): Shows the discovery content
**Search mode** (when user has typed): Shows live results

The sticky header contains the search input only. No "SEARCH PEOPLE" label above it — the search bar is self-explanatory. The header is minimal.

---

### 1.2 Sticky Header

**Search bar**: Same design as the HomeTab search bar — warm surface background, soft shadow, terracotta border on focus. Placeholder: *"Search by name or city…"* — hints that city is a valid search term.

**No section label** above the search bar. Just the bar + an optional filter button.

**Filter button** (right of search bar): Opens a bottom sheet with quick filters:
- Hometown (free text)
- Current city (free text)
- Gender (Male / Female / Other chips)

When a filter is active, the filter button fills with terracotta (same pattern as HomeTab). This gives search a powerful dimension beyond just name.

---

### 1.3 Discover Mode — Complete Redesign

The discover view is rebuilt around **real data** fetched from the API instead of hardcoded mock content.

#### Section A — "Your Hometown Circle"

The first and most prominent section. Fetched via `searchUsers(user.hometown, 1, 6)`.

**Visual design**: A full-width warm terracotta-tinted banner card at the top of the discover content. Not a horizontal scroll — a dedicated feature card.

```
┌──────────────────────────────────────────────────────────┐
│  ● People from Patna in your city                        │
│                                                          │
│  [avatar] [avatar] [avatar] +12 more people              │
│                                                          │
│  Your hometown circle is here. Start connecting.         │
│  [  Find them →  ]                                       │
└──────────────────────────────────────────────────────────┘
```

- Background: `#FDF0EA` (terraLight) with a subtle terracotta left accent border (3px)
- Hometown name in bold serif terracotta
- Shows up to 3 stacked circular avatars of actual users + "+N more" count
- "Find them →" button runs a search for `user.hometown` and populates results
- Only shown if `user.hometown` is set AND `searchUsers(user.hometown)` returns results

**Why it's first**: This is the entire purpose of the app. Opening the search screen should immediately tell you: here are people from your hometown, already in your city, waiting to be found.

#### Section B — "People You Might Know"

A horizontally scrollable strip of 5–6 profile cards. Data source: same `searchUsers(user.hometown, 1, 6)` call.

Each card (portrait orientation, ~140×180px):
- Profile photo (full top half of the card, circular crop over a warm background)
- Name (bold, 13px, serif)
- Hometown → current city (terracotta dot + text, same as notification pattern)
- A small "Connect" pill button (terracotta outlined → fills on connect)

**Card active/connected state**: The connect button changes to "Connected ✓" in monsoon green. No page navigate required to connect from the discover view.

Section header: "FROM YOUR HOMETOWN" (same all-caps section label style as HomeTab)

#### Section C — "Recently Active"

Replaced "Trending Yaaris" with something meaningful: users who were recently active on the platform (have recent posts or meetups). Data source: `searchUsers(user.location?.split(",")[0], 1, 4)` — people in the same current city, ordered by recency.

Horizontal scroll. Same card design as Section B. Section label: "ACTIVE IN YOUR CITY"

#### Section D — "New Here"

People who joined recently (within 30 days). Small strip, 4–5 people. Section label: "NEW TO BANDHUU". Each card shows a "NEW" badge. Source: same `searchUsers` filtered/sorted appropriately.

If any of sections B/C/D return no data (incomplete profile, no location set), that section is hidden cleanly with no empty state shown.

#### What's Removed
- "Join Jaipur Circle" promo card (hardcoded, meaningless)
- "TRENDING YAARIS" with hardcoded photos
- The empty-state hint at the bottom ("More suggestions coming soon")

---

### 1.4 Search Mode — Results Design

**Results count**: A small label above results: *"12 people match '[query]'"* — in muted text, no bold, no box.

**Result items (redesigned `SearchResultItem`)**:
Each result is a flat row (no borders, no card container):
- 44px circular avatar (with initial fallback in terracotta tint)
- Name (14px bold, serif) + username (11px muted) stacked
- Hometown tag: terracotta dot + hometown city (the signature element)
- Right side: a small "Connect" pill button with 3 states (Connect → Sent → Connected)

Between results: a hairline divider (only between items, not after the last one).

The results are no longer inside a big bordered card — they are just clean rows on the screen background with subtle separators.

**Load more**: Instead of a "Show more" button at the bottom, use `onEndReached` on FlatList to auto-load the next page. Show a small spinner at the bottom while loading.

---

### 1.5 Empty Search State

When user searches and no results are found:

```
🔍
No one found for "[query]".
Try searching by their hometown city or first name.
```

Serif for the main message. No icon in a circle — just the emoji + text. Warm and conversational.

---

## Part 2 — User Profile Screen Redesign

---

### 2.1 Screen Architecture

The screen has three sections that scroll vertically:

1. **Header zone** — Full-width, no card border, blends with the screen background. Contains avatar, name, hometown journey, primary actions.
2. **About section** — Bio, stats, occupation
3. **Journey Map** — Elevated to a featured section, not buried

All section content sits on the warm `#F5F0EB` background. No "floating card" effect for the header — it's integrated into the page.

---

### 2.2 Header Zone (Complete Redesign)

**Remove**: The "Bandhuu Member" pill (obvious, wastes space). The gradient LinearGradient card. The blue border on the avatar.

**Avatar**: 88px, perfectly circular (not squared with radius). A 3px terracotta ring around it. If no photo: initials in a warm tinted circle.

**Name line** (below avatar): Full name in serif, 24px, bold. Username below in 12px muted sans.

**The hometown journey tag** — immediately below the username, this is the most important line on the profile:

```
● Patna  →  Bengaluru
```

A terracotta dot + hometown name (bold) + right arrow + current city (muted). This replaces the occupation/location meta chips. The journey is the headline, not the occupation.

**Action buttons**: Below the journey tag. Two full-width buttons side by side:

- **Connect button**: Solid terracotta pill. States: "Connect" → "Requested" (outlined, monsoon green) → "Connected ✓" (solid monsoon green) → "Accept" (when request_received, solid terracotta).
- **Message button**: Outlined pill (border terracotta). When not connected: `🔒 Message` in muted grey, tapping shows a snackbar "Connect first to message."

**Mutual connections** (new element): If there are shared connections, a small row below the action buttons:

```
[avatar1][avatar2]  Connected with Priya and 2 others
```

Two small (24px) overlapping circular avatars of mutual connections + text. Only shown if `mutualConnections.length > 0`. Source: needs backend support (or compute client-side from connections list). If not available, omit.

**Bio** (if set): One paragraph of italic text directly below the actions. No "BIO" label — the italic style makes it self-evident. 14px, `C.inkMid` color.

**More (⋮) button**: Top-right corner of the header, absolutely positioned. Same as current.

---

### 2.3 About Section

**Stats bar (redesigned)**:

Instead of two separate boxed widgets, a single horizontal row with three numbers:

```
12          47           8
Posts     Yaaris    Meetups
```

Three columns, center-aligned, no box borders. The numbers are large (26px, bold), the labels below are 10px muted all-caps. A thin vertical divider separates them. This is the clean stat row pattern from modern social apps (Instagram, LinkedIn).

If `meetupsCount` is not available from the API, just show Posts and Yaaris.

**Profile Details (redesigned)**:

Instead of a flat 4-row list, group the information into two visual rows:

Row 1 — Occupation:
```
🎓  Final year B.Tech at IIT Delhi
```
A single icon + text row. Clean, no card.

Row 2 — Gender badge: A small colored pill (blue for Male, pink for Female) next to the name line (or just remove it if not architecturally important).

The "Current Location" and "Hometown" are already in the journey tag at the top, so they don't need to be repeated in the details section.

---

### 2.4 Recent Posts Preview (New Section)

**The problem it solves**: Currently you see a profile and have no idea what this person posts about. Are they looking for a flatmate? Do they travel? Are they active in the community? Their posts tell you this immediately.

**Implementation**: A horizontally scrollable strip of the user's last 6 posts. Tap any post to navigate to it.

Each mini post card (portrait, ~110×150px):
- Category colored top strip (4px, Housing = blue, Travel = teal, etc.)
- Post title text (2 lines, 12px bold)
- Relative time (tiny, bottom)

Header: "RECENT POSTS" with the count

If the user has no posts: don't show the section.

Data source: this requires a public endpoint to fetch a user's posts by username/userId. The `getMyPosts` function exists but is for the current user. A `getUserPosts(userId)` endpoint may need to be added, or this section only appears on the current user's own profile view.

---

### 2.5 Journey Map (Elevated Treatment)

The Journey Map is genuinely the most unique feature of this app — showing the physical distance between where someone grew up and where they live now. It should be treated like a hero element, not a card buried below a profile details list.

**New placement**: Immediately after the stats bar, before the profile details. It's the second thing you see after the header.

**Visual redesign**:
- Height: 200px (from current 220px — slightly more compact)
- The map card has a rounded top with a gradient header overlay (warm cream to transparent, 40px) with the city names overlaid in a clean line: `Patna → Bengaluru`
- The Polyline stroke color changes from blue to the terracotta `#C84B0C`
- The hometown marker uses a custom terracotta pin, the current city uses a monsoon green pin — consistent with the app's color language
- Bottom bar: the current implementation (city names with colored dots) stays, but colors update to terracotta + green

---

### 2.6 Interest Tags (New Element)

Below the Journey Map: a row of category chips showing the post categories this person has been active in.

```
● Flatmate / Housing   ● Travel   ● Hangouts
```

Each chip uses the category's own accent color (Housing = blue chip, Travel = teal chip, Hangouts = coral chip). Horizontally scrollable.

These are derived from the user's post history (count by category). If a user has posted in 3+ categories, show all. If 0 posts, don't show.

Header: "INTERESTS" (muted all-caps, 10px)

---

### 2.7 Loading and Error States

**Loading state** (current: a plain spinner):
A skeleton version of the profile — gray animated placeholder circles and rectangles in the same layout as the actual profile. Warm gray color (`#EDE5DB`) consistent with the NotificationsTab skeleton treatment.

**Error / not found state** (current: "User not found" text):
```
😕
This profile isn't available.
They may have deleted their account or blocked you.
[← Go back]
```

Emoji + serif text + a back button. Warm and human instead of generic.

---

## Part 3 — Elements Shared Between Both Screens

### User Card (unified component)

Currently, the SearchResultItem component (in `src/components/search/SearchResultItem.jsx`) and the SuggestionCard in SearchTab are two different designs for the same thing: a person's profile summary.

The redesign unifies them into a single `PersonCard` component used in both search results and the discover view. Design:

```
[44px avatar]  [Name]           [Connect pill]
               ● Patna → Bengaluru
               Student at BITS Pilani
```

This component handles all connection states (Connect / Sent / Connected) inline. Tapping the row navigates to the profile. Tapping the connect button sends a request without navigating.

### Connect button states (consistent)

Across both screens, the connect button follows the same visual language:
| State | Style |
|---|---|
| Not connected | Terracotta outlined pill, "+ Connect" text |
| Requesting (loading) | Opacity 0.5, "···" text |
| Request sent | Monsoon green outlined, "Requested" text |
| Connected | Solid monsoon green, "Connected ✓" text |
| Accept (incoming) | Solid terracotta, "Accept" text |

---

## Part 4 — Screen-by-Screen Layout Summary

### Search Tab

```
[Sticky: Search bar + filter button]

── DISCOVER MODE (empty search) ──

[Your Hometown Circle card — terracotta tinted, full-width]
  Avatars facepile + "Find them →" button

FROM YOUR HOMETOWN
[PersonCard] [PersonCard] [PersonCard]  (horizontal scroll)

ACTIVE IN YOUR CITY
[PersonCard] [PersonCard] [PersonCard]  (horizontal scroll)

NEW TO BANDHUU
[PersonCard] [PersonCard]  (horizontal scroll)

── SEARCH MODE (query typed) ──

12 people match "rahul"

[PersonCard row — flat, hairline separated]
[PersonCard row]
[PersonCard row]
[PersonCard row]
... auto-load on scroll
```

### User Profile Screen

```
[AppTopHeader — absolute, floating]

[Avatar + Name + @username]
  ● Patna → Bengaluru  (journey tag)
  [Connect pill]  [Message pill]
  [avatar][avatar] + 2 mutual connections (if any)
  
  "Final year student at NIT Trichy who moved
   to Bengaluru for work. Love hiking and chai." (bio)

[Stats bar: Posts  |  Yaaris  |  Meetups]

[Journey Map — 200px, elevated, terracotta polyline]

INTERESTS
  [Housing chip]  [Travel chip]  [Hangouts chip]

RECENT POSTS
[mini post card] [mini post card] [mini post card] (horiz scroll)

[⋮ more button — top right, report/block]
```

---

## Part 5 — What Is Not Changing

- All API calls (`searchUsers`, `getUserProfile`, `sendConnectionRequest`, `removeConnection`, `respondToConnectionRequest`, `blockUser`, `reportUser`) — unchanged
- The MapView + geocoding + Polyline logic — preserved exactly, only colors updated
- ProfileCompletionGateModal trigger — unchanged
- UserActionsMenu + ReportSheet — unchanged (only their trigger button redesigned)
- Pagination logic (page, hasMore, loadMore) in SearchTab — unchanged
- Navigation: `navigation.navigate("UserProfile", { username })` — unchanged
- All 4 connection status states — unchanged, just visual redesign

---

## Part 6 — New API Needs

| Feature | Current | Needed |
|---|---|---|
| Hometown circle | Not real | `searchUsers(hometown, page, limit)` — already exists ✓ |
| Mutual connections | Not shown | Needs `mutualConnections` field in user profile response (backend) |
| Recent posts on profile | Not shown | `getUserPosts(userId)` — needs new backend endpoint |
| Interest tags | Not shown | Derivable from posts categories client-side if posts are returned |
