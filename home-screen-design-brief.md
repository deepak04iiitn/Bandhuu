# Bandhuu — Home Screen Design Brief

## App Overview

**Bandhuu** is a community app built around a very specific human connection: people from the same hometown who are now living in a different city. The name loosely means "bond" or "kin." The premise is that when you move to a big city, there's comfort in finding someone who grew up in the same small town as you — you share the same festivals, the same dialect, the same food memories, the same route home during holidays. Bandhuu is the platform that makes those connections intentional.

The app is **not** a generic social network. It is not LinkedIn, not Instagram, not a dating app. It is a tight-knit, community-first platform for diaspora communities within a city.

---

## What the Home Screen Is

The Home screen is the **central hub** of the app. It is the first thing a user sees after login. It has two distinct content worlds that live side-by-side, switched between via two top-level tabs:

1. **Posts** — A community feed of posts from people in the same city
2. **Meetups** — In-person gatherings organized by members of the community

Both tabs live on the same screen. The user can **swipe left/right** to navigate between them, or tap the tab labels. The transition is animated.

---

## Section 1: Posts Tab

### Purpose

The Posts feed is where members of the community share things relevant to their life in the city — asking for help, finding flatmates, planning trips, organizing hangouts, or just talking. Every post is tied to a specific person with a real profile.

### What Is Displayed Above the Feed (Sticky Header on Posts mode)

Before the feed, at the very top of the screen (this part is sticky — it stays fixed as the user scrolls), there are two controls:

- **Search bar**: Full-text search across all posts. Has a search icon on the left and a clear (×) button that appears when there is text. Focuses inline without navigating away.
- **Filter button**: Opens a filter bottom sheet. When any filter is actively applied, the button changes its visual state to indicate that filters are active.

### Upcoming Meetups Carousel (inside Posts tab)

Before the posts feed itself, there is a **horizontal scroll strip** titled "Upcoming Meetups" with a "See all →" link that switches to the Meetups tab. This strip shows up to 3 of the nearest upcoming meetups in card form.

Each carousel card contains:
- A cover image for the meetup
- The date (e.g., "MON, 2 JUN") and time (e.g., "6:30 PM") — shown as a compact line
- The meetup title
- A hometown tag (e.g., "For Patna") — only visible if the meetup is targeted at a specific hometown community
- Remaining spots count (e.g., "3 left" or "Full")
- A small action button in the corner:
  - **"RSVP"** if the user hasn't joined (tapping joins the meetup and redirects to its group chat in Messages)
  - **"JOINED"** badge if the user is already a member
  - **"YOURS"** badge if the current user created this meetup

This carousel is only visible when there are upcoming meetups. If there are none, it is not shown.

### The Posts Feed

Below the carousel is the main post feed, titled "Your Feed."

#### Each Post Card Contains

**Author row (top of each card):**
- Circular profile photo of the post author
- Author's full name
- Time since posting — relative format (e.g., "5m ago", "3h ago", "2d ago")
- A **connect button** on the right side of the author row:
  - If not connected: shows an "add person" icon — tapping sends a connection request
  - If request already sent: shows a checkmark icon — tapping does nothing (request pending)
  - If already connected: shows a "remove person" icon — tapping removes the connection
  - If loading: shows a hourglass icon
  - If it is the logged-in user's own post: the button is disabled (dimmed)
  - Tapping connect when profile is incomplete triggers a **profile completion gate modal** prompting the user to complete their profile before connecting

**Post body:**
- A **category pill** label — e.g., GENERAL, FLATMATE / HOUSING, TRAVELMATE, TRIP, HANGOUTS, HELP / QUESTIONS
- Post **title** — prominently displayed, the headline of the post
- Post **body/details** — the full text description. If longer than ~120 characters, it is truncated at 4 lines with a "Read more" tap-to-expand link. "Show less" collapses it again.
- Optional **image** — if the post has an attached photo, it appears below the body text in a wide 16:9 aspect ratio frame

**Post action bar (bottom of each card):**
- **Like button** with count — toggled; when active the icon fills and changes color
- **Dislike button** with count — toggled; mutually exclusive with Like (liking removes a dislike and vice versa)
- **Comment button** with count — tapping opens a **comments bottom sheet** anchored to that post
- **Bookmark button** (far right, no count) — saves/unsaves the post; when saved the icon fills

#### Empty & Error States

- If no posts match the current filters/search: shows a centered icon, a title "Nothing here yet", and a subtitle "Posts from your city will show up here."
- If loading: shows a centered spinner
- If the API fails: shows an error message centered on screen

---

## Section 2: Meetups Tab

### Purpose

Meetups are **real-world, in-person events** organized by community members. Any user can create a meetup targeted at people from their hometown currently living in the same city. Meetups have limited capacity and are joinable from the app. Joining a meetup auto-adds the user to a private group chat for that meetup.

### What Is Displayed Above the Meetup List (Sticky Header on Meetups mode)

- **Search bar**: Searches meetup titles and details in real time (debounced)
- **Status filter pills**: Three toggle pills — "Upcoming", "Completed", "All". Only one can be active at a time.
- **Date filter button**: Opens a date picker to filter meetups on a specific date. When a date is selected, a chip appears below the filters showing the chosen date with an × to clear it.

### Each Meetup Card Contains

**Image area (top half of card):**
- A full-width cover image
- A **date badge** overlaid on the image top-left (e.g., "MON, 2 JUN")
- A **spots badge** overlaid on the image bottom-right (e.g., "4 left" or "Full")

**Content area (bottom half of card):**
- Meeting time (e.g., "6:30 PM") — styled as a subtle label
- A **hometown tag** next to the time if the meetup is for a specific hometown community (e.g., "For Patna folks")
- Meetup **title** — prominent headline
- Meetup **description/details** — with same "Read more / Show less" expand logic as posts
- **Location row** — venue name and/or address, styled as a small pill or inline tag with a location pin icon
- **Footer row**:
  - Member count display (e.g., "4/10") with a group icon
  - An action button on the right that changes based on state:
    - **"RSVP NOW"** — user hasn't joined and there are spots available; tapping joins and navigates to group chat
    - **"JOINED ✓"** — user is a member; tapping this leaves the meetup
    - **"FULL"** — no spots left; disabled/greyed state
    - **"YOUR MEETUP"** — the logged-in user created this meetup; disabled/informational state

#### Empty & Error States

- No meetups matching filters: shows a centered card with an icon (search-off or event-busy depending on whether filters are active), a title, a subtitle explanation, and — if filters are applied — a "Clear filters" button
- Loading: centered spinner

---

## Interaction Behaviors

### Tab Switching
- Tapping "Posts" or "Meetups" labels switches the visible content with an animated slide
- Swiping left on Posts reveals Meetups; swiping right on Meetups reveals Posts
- The swipe has resistance at the boundaries (can't swipe further than the last tab)
- The header updates its controls (search bar, filter pills) to match the active tab

### Post Interactions
- **Like / Dislike**: Optimistic UI — the count updates instantly before server response
- **Bookmark**: Optimistic UI — saves or unsaves; reverts on failure with an error message
- **Comments**: Opens a bottom sheet anchored to the post; does not navigate away
- **Connect**: Sends a connection request; shows status transitions inline on the button

### Meetup Interactions
- **RSVP**: Joins the meetup, shows a success snackbar, refreshes the carousel and list, then navigates to the Messages tab with the meetup group chat opened
- **Leave (JOINED ✓ button)**: Leaves the meetup, shows a snackbar, refreshes data

### Snackbar Notifications
All action outcomes (RSVP success, connection request sent, bookmark error, etc.) are communicated via a system-wide snackbar/toast — not inline UI changes.

### Profile Completion Gate
If a user tries to send a connection request without a complete profile, a modal interrupts them explaining that they need to complete their profile first. The modal has a CTA to navigate to the Account screen.

---

## Data Fields Reference

### Post Object
| Field | What it is |
|---|---|
| `user.profileImageUri` | Author's profile photo URL |
| `user.fullName` | Author's display name |
| `user._id` | Author's unique ID (used for connection state) |
| `createdAt` | ISO timestamp — displayed as relative time |
| `category` | One of: General, Flatmate / Housing, Travelmate, Trip, Hangouts, Help / Questions |
| `title` | Short headline of the post |
| `details` | Full body text |
| `imageUri` | Optional attached image |
| `likes` | Array of user IDs who liked |
| `dislikes` | Array of user IDs who disliked |
| `comments` | Count of comments |
| `savedBy` | Array of user IDs who bookmarked |

### Meetup Object
| Field | What it is |
|---|---|
| `title` | Meetup name |
| `date` | ISO date string |
| `time` | "HH:MM" string |
| `details` | Description text |
| `venue` | Name of the venue |
| `meetupLocation` / `location` | Address or location string |
| `hometown` | Which hometown community this is for (optional) |
| `imageUri` | Cover photo |
| `maxMembers` | Capacity limit |
| `members` | Array of joined member objects |
| `user` | The creator |

---

## Filter System (Posts)

Accessible from the filter button next to the search bar. Opens a bottom sheet with the following controls:

| Filter | Options |
|---|---|
| **Location — Hometown** | Free text input: filter posts by the author's hometown city |
| **Location — Current City** | Free text input: filter posts by the author's current city |
| **Gender** | Chips: Male / Female / Other |
| **Sort By** | Newest First / Oldest First / Most Liked / Most Disliked |
| **Category** | General / Flatmate / Housing / Travelmate / Trip / Hangouts / Help / Questions |

The filter sheet has a "Reset All" option and an "Apply Filters" button. When filters are active, the filter button in the header shows a visual indicator.

---

## Screen Architecture Notes

- The two tabs (Posts / Meetups) are rendered simultaneously side-by-side at all times (not lazily loaded on demand). The visible one is controlled by an animated offset. This means there is no loading flicker when switching tabs — the content is already rendered.
- The sticky header (search, tabs, filter controls) is separate from the scroll container, so it remains visible as the user scrolls through content.
- Meetups shown in the carousel on the Posts tab are a separate subset from the full meetups list — only up to 3 "upcoming" meetups are fetched for the carousel.
- The full meetups list on the Meetups tab is filtered independently by the sub-tab (upcoming / completed / all), search query, and date filter.

---

## Key Design Principles to Preserve in the Redesign

1. **Community warmth over corporate polish** — This is not a SaaS dashboard. It should feel like a community noticeboard, not an enterprise app. Real people, shared roots.
2. **Information density matters** — Posts and meetups carry a lot of fields. The design must handle long titles, multi-line body text, truncation/expand patterns, and multiple status states per card gracefully.
3. **Clear action states** — Every interactive element (connect button, RSVP button, bookmark, like/dislike) has 3–4 distinct visual states. The design must make these states immediately readable without explanation.
4. **The hometown tag is a signature element** — Any time a piece of content is tied to a specific hometown, that should be surfaced prominently. It is the core identity signal of the platform.
5. **Dual-mode screen** — Posts and Meetups must feel like they belong together but are also clearly distinct modes. The transition between them should feel natural.
6. **Mobile-first, thumb-friendly** — All primary actions should be reachable in the lower portion of the screen. Cards scroll vertically. The sticky header stays at the top.
