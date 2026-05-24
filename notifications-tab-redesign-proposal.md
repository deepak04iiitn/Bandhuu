# Bandhuu — Notifications Tab Redesign Proposal

---

## Current Screen: What Exists and What's Wrong

The existing NotificationsTab has solid bones — filter chips, type badges, connection request actions, a mark-all-read FAB. The foundation is correct. But several things make it feel generic and inconsistent:

1. **Blue (#004ac6) everywhere** — unread accent bar, filter chips, FAB, avatar fallback, empty state icon. Completely out of sync with the terracotta identity established in HomeTab and PostTab.
2. **All notifications look the same** — a like notification and a connection request look identical in layout. A connection request requires a real human decision; a like is passive. They should feel meaningfully different.
3. **No temporal context** — 47 notifications in a flat list with no "today", "yesterday", "this week" grouping. Reading your inbox without time anchors is disorienting.
4. **No post context** — when someone likes or comments on your post, you have no idea which post they're referring to unless you remember the notification message exactly. A tiny content snippet would make likes and comments feel meaningful instead of abstract.
5. **Grouped interactions missing** — if 8 people liked the same post, there are 8 identical rows. This is noise. Modern notification systems collapse them.
6. **The FAB for "mark all read" is intrusive** — a floating button that appears/disappears is a higher-stakes interaction than the action deserves. It should be inline and subtle.
7. **Filter chips don't show counts** — you can't tell at a glance that there are "3 pending requests" without switching to the Requests filter.
8. **No loading skeleton** — the screen shows empty until data arrives. A skeleton loading state is now a baseline expectation.
9. **Empty states are generic** — one empty message for all filter types. Per-filter empty states with personality match the app's editorial voice.
10. **No connection between the actor's hometown and the notification** — Bandhuu's entire identity is about hometown connections. If someone from Patna liked your post, that should be surfaced. Currently it shows the actor's city but buries it in the meta row.

---

## The Central Idea

Notifications in Bandhuu are not just system events. They are moments of human recognition — someone from your hometown, in your city, reached out or responded to something you said. The redesign makes those moments feel **human, warm, and contextual** rather than mechanical.

Two principles guide every decision:
1. **Hierarchy by importance** — Connection requests (actions required) deserve more space and prominence than passive events (likes, comments). The design should immediately communicate what needs attention.
2. **Context-first** — Every notification should tell you enough to respond or understand without leaving the screen. Who triggered it, what they were reacting to, when it happened — all visible at a glance.

---

## 1. Color System

The notifications tab adopts the same token set as HomeTab and PostTab. Blue is removed as a primary action color.

| Element | Old | New |
|---|---|---|
| Active filter chip | Blue background | Terracotta fill |
| Unread row background | `#f0f4ff` (blue tint) | `#FDF7F2` (warm tint) |
| Unread accent indicator | Blue left bar | Terracotta dot (right side only) |
| Accept button | Blue fill | Terracotta fill (green for "Connected" state) |
| FAB | Blue square | Removed (replaced inline) |
| Empty state icon | Blue circle | Warm terracotta tint |
| Type badge colors | Mix of blue/accent/pink/purple | Per-type system (preserved but tuned) |

**Per-notification-type color system (preserved, with tuning):**
- `connection_request` → monsoon green (`#1A6B4A`) / `#E8F5EE`
- `connection_accepted` → monsoon green (positive confirmation)
- `post_liked` → terracotta (`#C84B0C`) / `#FDF0EA`
- `post_commented` → slate blue (`#3B6CA8`) / `#EEF3FC`
- `comment_liked` → warm rose (`#B83055`) / `#FDEEF3`
- `comment_replied` → violet (`#7040B8`) / `#F3EEFE`
- `meetup_joined` → teal (`#1A7A5E`) / `#E8F5F1`

---

## 2. Header Redesign

### Title line

The header no longer uses "Notifications" in a heavy sans weight. It uses the same greeting/section-title pattern from HomeTab:

- **Title**: "Notifications" in the serif font, medium weight — editorial, not utilitarian
- **Unread pill**: A small terracotta pill showing "X new" — positioned to the right of the title, visible only when there are unread items
- **"Mark all read" link**: A small terracotta text button on the far right of the title row, replacing the FAB entirely. It says "Clear all" and only appears when there are unread notifications. Tapping it has the same punch-scale animation as before, then marks everything read.

### Filter chips

The filter chips are redesigned to show **per-type count badges**:

```
[All  18] [Requests  3] [Likes  8] [Comments  5] [Replies  2]
```

Each chip:
- **Inactive**: pale warm background, muted text, a small colored dot on the left (the type's accent color)
- **Active**: filled with the type's accent color, white text and dot

The count badge inside each chip is a small number after the label. When count is zero for a filter, the chip is shown but dimmed slightly (still tappable, but clearly empty).

The filter list is simplified to 5 filters (removing "Comment Likes" as a standalone — too granular, so it merges into "Likes"):
1. **All** — everything
2. **Requests** — `connection_request` + `connection_accepted`
3. **Likes** — `post_liked` + `comment_liked`
4. **Comments** — `post_commented` + `comment_replied`
5. **Meetups** — `meetup_joined` + any future meetup notification types

---

## 3. Time-Grouped Sections

Notifications are grouped into time buckets with section headers. This is the single change that most improves readability.

**Section structure:**
```
TODAY
  [notifications from today]
  
YESTERDAY
  [notifications from yesterday]
  
THIS WEEK
  [notifications from 2–6 days ago]
  
OLDER
  [everything before this week]
```

**Section header style**: same as HomeTab's `sectionTitle` — 10px, all-caps, `letterSpacing: 1.5`, muted warm grey. The section header for "TODAY" has the "Clear all" text link inline on the right (if there are unread items today). Other sections don't have this action.

**Logic:**
```
today:      createdAt >= start of today
yesterday:  createdAt >= start of yesterday, < start of today
this week:  createdAt >= 6 days ago, < yesterday
older:      everything else
```

If a section is empty for the current filter, it is not rendered at all — sections only appear when they have content.

---

## 4. Connection Request Card (Special Treatment)

Connection requests are the most important notification type. They require a binary decision. The current design buries them in the same compact row as a like notification.

**New design: the connection request card**

Connection request notifications render as a **distinct expanded card**, not a row. This card floats within the notifications list with slightly more padding, a terracotta-tinted left edge (2px stripe, warm accent, not blue), and a slightly elevated shadow.

```
┌────────────────────────────────────────────┐
│ [52px avatar]  Anuj Sharma                 │
│                ● Patna → Bengaluru         │  ← hometown tag (dot + "Patna") + current city
│                "Final year student..."     │  ← 1-line bio snippet (truncated)
│                                      2h   │  ← time top-right
│                                            │
│  [    ✓ Accept    ]  [  Decline  ]         │
└────────────────────────────────────────────┘
```

**Details:**
- Avatar: 52px (vs 44px for standard rows)
- Name: 15px bold serif — makes it feel like a name, not a label
- Hometown tag: the same `hometownDot + text` pattern from HomeTab — a tiny terracotta dot + "From Patna" in small bold sans
- Current city: shown as `→ Bengaluru` after the hometown, muted
- Bio snippet: 1 line, italic, muted — truncated with ellipsis. If no bio, show nothing here
- Time: top-right corner in small muted text
- Accept button: terracotta fill, white text, "Accept" — confident primary action
- Decline button: outlined, muted border, muted text — the secondary, lower-prominence action

**For "connection_accepted" type** (someone accepted your request):
```
┌────────────────────────────────────────────┐
│ [avatar]  Anuj Sharma accepted your request│
│           ● Patna → Bengaluru         2h   │
│                                            │
│  [  💬 Send a message  ]                   │
└────────────────────────────────────────────┘
```
A single action button: "Send a message" — navigates to the chat with that person.

---

## 5. Standard Notification Row (Likes, Comments, Replies)

### Layout redesign

Current: `[avatar+badge] [message text] [meta row: @user · city · time] [unread dot]`

New:
```
[avatar+badge]  [message text — bold if unread]     [time]
                [post preview snippet]
                [hometown tag — if from same hometown]
```

**Changes:**
- Time moves to the **top-right** of the content column (like iMessage) — not in the meta row. This makes the temporal information more scannable.
- `@username` is removed from meta row — it's redundant with the avatar and the actor's name in the message
- City is removed from meta row — it's moved into a hometown tag only if it matches the logged-in user's hometown (see section 6)
- The meta row is eliminated — time and actor context are now integrated into the card naturally
- Message text: 14px (slightly larger), `lineHeight: 21` — more readable
- Unread state: row background shifts to the warm tint (`#FDF7F2`). A small 6px terracotta dot on the right side indicates unread (not blue).
- The left accent bar is removed — it was blue and redundant with the row background tint.

**Avatar + badge**
- Avatar: 46px circular
- Type badge: same overlapping badge at bottom-right of avatar — but slightly larger (22px diameter vs 20px) for better readability
- Avatar fallback: initials in the notification type's accent color on the type's light background

---

## 6. Post Context Snippet

For `post_liked`, `post_commented`, `comment_liked`, `comment_replied` — a small snippet of the post being reacted to appears below the message text.

```
Riya liked your post
┌───────────────────────────────────────────┐
│ "Looking for a flatmate in Koramangala..."│  ← 1-line italic quote
└───────────────────────────────────────────┘
                                         3h
```

**Design:**
- A small inset box (full width, 8px top padding, left border 2px in the type's accent color)
- Background: the type's light background color (very subtle tint)
- Text: 12px, italic, muted — 1 line, truncated with ellipsis
- Border-left: 2px, the notification type's accent color

**What text is shown:**
- If `notif.refPost?.title` is available: show the post title
- If not: show the first 60 chars of `notif.refPost?.details`
- If neither: don't render the snippet at all (don't force a visual placeholder)

This snippet is the most important "new element" in the redesign. It transforms "Riya liked your post" (meaningless out of context) into "Riya liked your post 'Looking for a flatmate in Koramangala'" — suddenly the notification is anchored in reality.

---

## 7. Hometown Tag on Actor

When the actor who triggered the notification shares the logged-in user's hometown, a hometown tag appears below the message text:

```
Anuj commented on your post
● From Patna, like you                     3h
```

The tag: a 6px terracotta dot + "From [hometown]" in 10px bold sans in the terracotta color. Then optionally "like you" if it matches the user's own hometown.

This is the app's signature element. Finding it inside a notification — "this person who liked your post is also from Patna" — is a micro-moment of connection that reinforces the app's entire purpose.

**Logic**: render this tag if `notif.actor?.hometown === currentUser?.hometown` and the hometown is set on both.

---

## 8. Grouped Notifications

When multiple people perform the same action on the same post within a reasonable timeframe, they are collapsed into a single grouped row.

**How it looks:**
```
[avatar1][avatar2][+3]  Riya, Arjun and 3 others liked
                        "Looking for a flatmate..."
                                                   2h
```

**Avatar cluster:**
- Show up to 2 individual circular avatars (36px, overlapping by 8px)
- If more than 2: add a "+N" circle in the ink/muted background after the two avatars
- This cluster replaces the single avatar in the standard row

**Message format:**
- 1 person: "Riya liked your post"
- 2 people: "Riya and Anuj liked your post"
- 3+ people: "Riya, Anuj and 4 others liked your post"

**Grouping key**: `(notif.type + notif.refPost?._id)` — same type on the same post, within 24 hours, by different people.

**Data requirement**: this grouping happens client-side. The raw notifications array from the API is grouped before rendering using a reduce pass. No backend changes required.

---

## 9. New Notification Types

### `meetup_joined`
When someone joins a meetup you created.

```
[avatar+🗓badge]  Priya joined your meetup
                  "Patna gang chai meetup"     ← meetup title snippet
                  📍 Indiranagar, Bengaluru    ← meetup location (if available)
                  Now 4/10 members             ← member count
                                          1h
```

Color system: teal (`#1A7A5E`) — same as the travel/teal category.

### `connection_accepted`
When someone accepts your outgoing connection request.

Already described in Section 4. The key addition: a "Send a message" button that opens the chat.

### (Future) `post_mentioned`
When someone mentions you or your hometown in a post. Not implemented yet but the type system should be designed to accommodate it.

---

## 10. Skeleton Loading State

When the tab first mounts or the filter changes, show 4–5 skeleton rows instead of an empty screen.

**Skeleton row design:**
- Same dimensions as a standard notification row (padding, height)
- A 46px grey circle where the avatar goes
- Two grey rounded rectangles for the message lines (different widths — 80% and 55% of content width)
- One narrow grey rectangle for the time position
- The grey color: `#E8E0D8` (same as the border token — warm, not cold grey)
- Animation: a slow shimmer sweep (opacity 0.5 → 1.0 → 0.5, looping, 1.5s duration)

Show 4 skeleton rows in the "TODAY" section placeholder while loading.

---

## 11. Swipe-to-Dismiss (Optional / Phase 2)

Swiping a notification row to the left reveals a red dismiss/delete action. This is a phase-2 feature since it requires additional API support and gesture handling complexity. Noting it here for completeness.

When implemented:
- Swipe threshold: 40% of screen width
- Revealed action: a terracotta/red strip on the right with a trash icon and "Dismiss" label
- Spring back if not swiped far enough
- If swiped fully: the row collapses with a height animation

---

## 12. Per-Filter Empty States

Each filter has its own empty state with a distinct message and a contextual action.

| Filter | Illustration | Headline | Sub-text | Action button |
|---|---|---|---|---|
| All | 🔔 emoji (large) | "You're all caught up." | "When people interact with you, it'll show up here." | None |
| Requests | 🤝 emoji | "No pending requests." | "Find people from your hometown on the Search tab." | "Find people" → Search tab |
| Likes | ❤️ emoji | "No likes yet." | "Share a post — someone from your city might relate." | "Create a post" → Post tab |
| Comments | 💬 emoji | "No comments yet." | "Start a conversation by posting something." | "Create a post" → Post tab |
| Meetups | 🗓 emoji | "No meetup activity." | "Create a meetup and see who joins." | "Plan a meetup" → Post tab |

Each empty state uses:
- Large emoji (48px) instead of a generic icon in a circle
- Serif headline (consistent with HomeTab empty state treatment)
- Muted sans sub-text
- Optional terracotta outlined CTA button

---

## 13. Interaction Details

### Mark all read
Moved from FAB to inline text button in the TODAY section header ("Clear all" → terracotta, 12px, bold). On press: punch animation (scale 0.85 → 1.0 spring), then a cascading row animation — each unread row's background transitions from warm tint to plain white in sequence (40ms stagger), giving a satisfying "reading through your notifications" feel.

### Accept connection — state transitions
1. User taps "Accept"
2. Both buttons immediately disable and go to 0.5 opacity (prevents double-tap)
3. After API response: the entire connection request card morphs into the compact `connection_accepted` format — showing "You're now connected with [name]" + the "Send a message" button
4. If API fails: buttons re-enable and a snackbar error appears

### Tapping a notification
Tapping any notification row (not the action buttons) should navigate to the relevant context:
- `post_liked`, `post_commented`, `comment_liked`, `comment_replied` → navigate to the post
- `connection_request` → tapping the row (outside buttons) navigates to the actor's profile
- `connection_accepted` → navigates to the actor's profile (or their chat)
- `meetup_joined` → navigates to the meetup (in the Home Meetups tab)

Currently tapping does nothing. This is a major usability gap.

### Unread dots auto-clear on view
When the user scrolls past a notification, it is marked as read in local state (not API call — just visual). The API call for "mark as read" only fires when the user taps "Clear all." This gives the screen a living, responsive feel without hammering the API.

---

## 14. Fully Revised Screen Layout

### Header (sticky)

```
┌─────────────────────────────────────────────┐
│  Notifications   [3 new]     [Clear all]    │  ← title row
│  [All 18][Requests 3][Likes 8][Comments 5]  │  ← filter chips with counts
└─────────────────────────────────────────────┘
```

### Today section

```
TODAY                                          │  ← section label
────────────────────────────────────────────── │

[CONNECTION REQUEST CARD]
  [52px avatar]  Riya Sharma           2h
                 ● Patna → Bengaluru
                 "Final year at Christ..."
  [ ✓ Accept ]  [ Decline ]

[GROUPED LIKE ROW]
  [avt1][avt2]+3  Riya, Anuj and 3 others liked
  ┌────────────────────────────────────────┐
  │ "Looking for a flatmate in Koraman..." │
  └────────────────────────────────────────┘
  ● From Patna, like you              1h

[COMMENT ROW]
  [avatar+💬badge]  Priya commented on your post
  ┌────────────────────────────────────────┐
  │ "Anyone heading to Mysore this..."    │
  └────────────────────────────────────────┘
                                       45m
```

### Yesterday section

```
YESTERDAY
──────────────────────────────────────────────

[MEETUP ROW]
  [avatar+🗓badge]  Karan joined your meetup
                   "Patna gang chai at..."
                   Now 4/10 members     22h
```

---

## 15. Data Requirements

Most new elements need data that the notifications API may or may not already return. Here's what's needed:

| New element | Required field | Notes |
|---|---|---|
| Post snippet | `notif.refPost?.title` or `notif.refPost?.details` | The notification already has some ref data — needs to include post title |
| Hometown tag on actor | `notif.actor?.hometown` | Need actor's hometown in the notification object |
| Meetup notification | `notif.refMeetup?.title`, `notif.refMeetup?.location`, `notif.refMeetup?.memberCount` | New notification type |
| Connection accepted | New backend event | Needs backend support if not already emitted |
| Actor bio snippet | `notif.actor?.bio` | Already in user profile, needs to be included in notification actor |
| Grouped notifications | Client-side only | No backend changes required |
| Per-filter counts | Can be derived client-side from the full `fetchNotifications()` result | Load all, count per type, show in chips |

---

## 16. What Is NOT Changing

- The `fetchNotifications`, `markAllNotificationsAsRead`, `respondToConnectionRequest` API calls — all unchanged
- The `useFocusEffect` refetch pattern — unchanged
- The filter architecture (client-side filtering from a full notification fetch) — unchanged
- The notification data model core fields (`_id`, `type`, `actor`, `message`, `isRead`, `createdAt`, `actionable`) — unchanged
- The ScreenShell + stickyHeaderIndices pattern — unchanged
- The snackbar for error/success feedback — unchanged
