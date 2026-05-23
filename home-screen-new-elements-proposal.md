# Bandhuu Home Screen — New Elements Proposal

---

## Guiding Principle

Every new element must earn its place. The test: does it make the user feel more connected to their community, or does it just add noise? If it doesn't directly help someone find a person, join something, or share something — it doesn't belong.

All five elements below pass that test.

---

## Element 1 — Quick Compose Bar

### What it is
A one-line, always-visible shortcut to create a post. Sits at the very top of the Posts feed content area (below the sticky header, before the carousel).

### What it looks like
A single horizontal row with the user's own circular profile photo on the left (small, 34px), followed by a soft-background rounded input-shaped area that says **"What's happening in [City]?"** (the city is the user's current city pulled from their profile). On the right end of this bar, a small terracotta **"Post"** pill button.

The bar is not a real text input — tapping anywhere on it navigates to the Post creation screen. It is a visual affordance, not a functional input. This is the same pattern as LinkedIn/Facebook's composer bar: your face + a fake prompt + a CTA.

### Why it's there
The feed looks like a passive read-only space right now. This bar breaks that: it reminds the user every time they open the app that they can contribute. Apps that surface this reminder prominently get 3–5× more posting than apps that hide it behind a FAB.

### Exact placement
Directly below the sticky header, before the "HAPPENING SOON" carousel. It appears only on the Posts tab. It is NOT sticky — it scrolls with the content.

### Design details
- Background: `surface` white with a 1px warm border
- Profile image: the logged-in user's own avatar (so it feels personal)
- Placeholder text: italic, muted
- "Post" pill: solid terracotta, small, right-aligned
- Subtle shadow — same as cards
- Tap: navigates to the Post tab's create screen

### Data needed
- `user.profileImageUri` — already in AuthContext ✓
- `user.location` (current city) — already in user object ✓

---

## Element 2 — Category Quick-Filter Chips

### What it is
A horizontal scrollable row of category chips sitting just above the posts feed (after the carousel, before the first post card). Tapping a chip filters the feed to that category instantly — without opening the full filter modal.

### What it looks like
Single-line horizontal scroll strip. Each chip is a compact pill with a small icon on the left and the category name. The chips use each category's own accent color when active. When no chip is selected, all chips are in the default pale state.

Categories and their icons:
| Category | Icon |
|---|---|
| All | grid_view (or apps) |
| Housing | home |
| Travel | flight |
| Hangouts | local_activity |
| Help | help_outline |
| General | chat_bubble_outline |

Active chip: filled with that category's color, white text.
Inactive chip: pale warm background, muted text.

When a chip is active, the filter button in the sticky header also shows its "active" state (so the two controls stay in sync — the chips are a shortcut to the filter modal's category field).

### Why it's there
The filter modal requires 3 taps to filter by category (filter button → pick category → apply). Category chips do it in 1 tap. Category-based browsing is probably the most common filter use case ("I'm looking for a flatmate right now, show me only housing posts"). Making it one tap dramatically changes how users explore the feed.

### Exact placement
Inside the Posts page, below the carousel section, above the first post card. Horizontally scrollable, full-width, 20px left padding so it aligns with the cards.

### Design details
- Chip height: 34px
- Chip internal padding: 12px horizontal, no vertical (height handles it)
- Icon size: 14px
- Gap between chips: 8px
- The strip does NOT have a section label (no "Filter by category" header — the chips are self-explanatory)
- Small spring animation when a chip is selected (scale 0.95 → 1.05 → 1.0)

### Data/behavior
- Selecting a chip immediately calls `loadPosts({ category: selectedCategory })`
- Selecting an already-active chip deselects it (restores full feed)
- Category state is shared with the existing `activeCategory` state — they are the same filter, just two entry points
- When the filter modal is opened and category is changed there, the chips update to reflect that selection too

---

## Element 3 — "People from Your Hometown" Strip

### What it is
A horizontal scroll strip showing 5–8 people who are from the same hometown as the logged-in user and are currently in the same city. Each person appears as a small "profile chip" — circular photo + name + a connect button.

### What it looks like
Section title: **"FROM YOUR HOMETOWN"** (same small all-caps label treatment as "HAPPENING SOON").

Each person card is a small portrait-oriented chip (approximately 80px wide × 110px tall):
- Top 50%: circular profile photo (50px), centered
- Bottom 50%: first name (1 line, truncated), then a small connect button ("+ Add" or checkmark if already connected)

The connect button on each card is a tiny pill: terracotta outlined for "Add", solid green for "Connected", muted for "Requested".

### Why it's there
This is the core value proposition of Bandhuu and it should be surfaced directly on the home screen. Right now, discovery only happens through posts — you see someone's post and then decide to connect. This strip brings people-discovery to the surface: you open the app and immediately see "these are your people." It turns a passive browsing app into an active connection app.

It should only appear when there are matches (>= 1 person from your hometown in your city) and only when the user has fewer than ~20 connections (to avoid redundancy for well-connected users).

### Exact placement
Inside the Posts page, between the Quick Compose Bar and the "HAPPENING SOON" carousel. This ordering means the first thing after the compose prompt is "here are people you should know," before events and before posts.

### Design details
- Strip height: ~125px total (label + scroll area)
- Each profile chip card: ~80px wide, white surface, very soft shadow, 12px border radius
- Profile photo: 48px circle, centered horizontally within the card
- Name text: 11px, bold, centered, 1-line truncated
- Connect button: 22px tall pill, 100% card width minus 12px margins
- A "See all →" link on the right of the section header navigates to the Search tab with hometown pre-filtered

### Data needed
- New API call: `searchUsers({ hometown: user.hometown, location: user.location, limit: 8 })` — the `searchUsers` function already exists in `userService.js` ✓
- `user.hometown` and `user.location` — already in user object ✓
- Connection state reuses the existing `connectedUsers` and `requestedUsers` maps ✓

### Edge cases
- If user has no hometown set in their profile: strip is hidden entirely
- If no matches found: strip is hidden (no empty state)
- If user has > 20 connections: strip is hidden (they've already used this feature well)
- The strip persists as long as there are people to show — it doesn't get dismissed permanently

---

## Element 4 — Meetup Tab: "Create a Meetup" Invitation Card

### What it is
A soft call-to-action card that appears at the top of the Meetups page (above the meetup list) when the user has never created a meetup. It's a gentle nudge, not a pushy banner.

### What it looks like
A wide, single card occupying full width (same margins as meetup cards). It has:
- A small illustration or emoji cluster (e.g., 🎉 🤝 🏘) on the left
- Heading: **"Gather your people"** in the serif font
- Subtext: "Create a meetup for folks from [hometown] in [city]. It only takes a minute."
- A full-width terracotta button: **"Create a Meetup"**

The card has a warm, slightly textured background — the `terraLight` color (#FDF0EA) — making it visually distinct from the white meetup cards without being aggressive.

### Why it's there
The Meetups tab currently shows a list you can only observe and join. Most users don't know they can create meetups themselves. This card surfaces that capability. Apps with explicit "you can create too" prompts get significantly more UGC. It also creates a virtuous cycle: more meetups → more users joining → more meetups.

### Exact placement
At the top of the Meetups page, above the list of meetup cards. Scrolls with the content (not sticky).

### Exact trigger condition
- Shown only when: `user` has never created a meetup (backend returns this in user activity summary)
- OR: simpler to implement — always shown unless dismissed, using AsyncStorage to persist the dismissal
- A small × dismiss button in the top-right corner of the card hides it permanently for that user

### Data needed
- AsyncStorage key `bandhuu_hide_create_meetup_cta` — simple dismiss persistence, no API needed
- Navigation to the create meetup flow: `navigation.navigate("Post", { openMeetupComposer: true })` (or whatever the correct route is)

---

## Element 5 — Pull-to-Refresh with Branded Animation

### What it is
Both the Posts feed and the Meetups list support pull-to-refresh. When the user pulls down, instead of the default platform spinner, a branded micro-animation plays in the refresh zone.

### What it looks like
When the user pulls down, a small area appears at the top of the scroll container showing:
- The app's signature terracotta dot (the same one from the hometown tag design)
- A brief breathing/pulsing animation: the dot expands and contracts twice while loading
- Text: **"Finding your feed…"** in tiny italic serif, fading in below the dot

When the refresh completes, the dot does a quick spring-pop and disappears upward.

### Why it's there
Pull-to-refresh is one of the most-used interactions in any feed app. The default gray spinner is a missed branding moment. A custom refresh animation makes the app feel crafted and alive — it's the equivalent of a bookstore having a nice smell when you walk in: you don't consciously notice it, but it shapes how you feel about the product.

### Technical approach
React Native's `ScrollView` has a `refreshControl` prop that accepts a `RefreshControl` component. On Android, `RefreshControl` accepts `colors` and `tintColor`. On iOS, it accepts `tintColor`. We set both to the terracotta accent.

The custom animation (dot + text) can be layered over the standard `RefreshControl` or implemented as a `FlatList`-style header animation if needed. At minimum, the `tintColor: C.terra` change alone is a 2-line fix that immediately looks better than the default.

For the full branded experience: use a `FlatList` (replacing the inner ScrollView for posts) with a custom `ListHeaderComponent` that shows the animation when `isRefreshing` is true.

### Data/behavior
- Posts feed: triggers `loadPosts(activeFilters.current)` — already exists ✓
- Meetups: triggers the meetups refetch — already exists ✓
- Carousel: refreshes simultaneously when feed refreshes ✓

---

## Implementation Order (Recommended)

| Priority | Element | Effort | Impact |
|---|---|---|---|
| 1 | Category Quick-Filter Chips | Low — purely frontend, reuses existing state | High — daily use feature |
| 2 | Quick Compose Bar | Low — single Pressable, no new state | High — drives posting behaviour |
| 3 | Pull-to-Refresh (branded) | Very low — 2-line tintColor change | Medium — polish |
| 4 | People from Your Hometown | Medium — new API call + new component | Very high — core value prop |
| 5 | Create Meetup CTA Card | Low — static card + AsyncStorage dismiss | Medium — drives UGC |

---

## Screen Layout After All Elements

### Posts Tab
```
[Sticky header]
  greeting
  Posts | Meetups tabs
  Search bar + filter button

[Scroll content]
  Quick Compose Bar          ← NEW #1
  People from Your Hometown  ← NEW #4 (conditional)
  HAPPENING SOON carousel
  Category Filter Chips      ← NEW #2
  Your Feed (post cards)
```

### Meetups Tab
```
[Sticky header — meetup controls]
  Search bar
  Status pills (Upcoming / Completed / All)
  Date filter

[Scroll content]
  Create a Meetup CTA card   ← NEW #5 (conditional, dismissible)
  Meetup cards list
```

---

## What This Proposal Is NOT Adding

To keep the screen intentional, these were considered and rejected:

- **Stories / ephemeral status circles** — too much like Instagram, wrong product identity
- **"Active now" indicators** — creates social anxiety, wrong tone for a hometown community app
- **Like counts as trending** — gamification that changes why people post
- **Notification badges on feed posts** — makes the feed feel anxious
- **Ads or sponsored posts** — obviously
- **"Explore" discovery tab within Home** — that belongs on the Search tab, not here
