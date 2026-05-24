# Bandhuu — Product Requirements Document

> **"Your city. Your people. Your bond."**

| Field | Details |
|---|---|
| Product Name | **Bandhuu** |
| Platform | Mobile (iOS & Android) + Web |
| Target Audience | Students, Young Professionals, Relocators (India) |

---

## Table of Contents

1. [What Is Bandhuu?](#1-what-is-bandhuu)
2. [The Name](#2-the-name)
3. [The Problem](#3-the-problem)
4. [Vision & Goals](#4-vision--goals)
5. [Who Uses Bandhuu](#5-who-uses-bandhuu)
6. [Core Value Proposition](#6-core-value-proposition)
7. [Key Use Cases](#7-key-use-cases)
8. [Navigation & App Structure](#8-navigation--app-structure)
9. [Every Screen — Feature Breakdown](#9-every-screen--feature-breakdown)
10. [Safety & Trust](#10-safety--trust)
11. [Design System & Visual Identity](#11-design-system--visual-identity)

---

## 1. What Is Bandhuu?

**Bandhuu** is a community-based mobile platform that helps people connect with others from the same hometown who are now living in a different city.

The emotional premise is simple: when you move to a big city, there is comfort in finding someone who grew up in the same small town as you. You share the same festivals, the same dialect, the same food memories, the same route home during holidays. Bandhuu makes those connections **intentional and discoverable**.

The platform lets users:
- Discover people from their hometown currently in the same city
- Connect and chat privately (end-to-end encrypted)
- Find flatmates or roommates from their hometown
- Coordinate holiday travel with fellow travelers
- Organize and join local in-person meetups
- Form trip groups for weekend getaways
- Build hometown-based communities *(planned)*

Bandhuu is **not** a generic social network, not LinkedIn, not a dating app. It is a **tight-knit, community-first platform for diaspora communities within Indian cities.**

**Taglines:**
- *Discover People From Your City, Anywhere*
- *Your city. Your people. Your bond.*
- *Finding a familiar face in a foreign crowd.*

---

## 2. The Name

**Bandhuu** (बन्धु) is a Sanskrit and Hindi word meaning "bond," "kin," or "companion." It captures exactly what the app does — it creates bonds between people who share a common origin.

An earlier product alias was **CityYaari** (City + Yaari, "Yaari" meaning friendship). The canonical name is **Bandhuu**.

Why the name works:
- Culturally resonant across India (Sanskrit/Hindi root)
- Evokes warmth, kinship, community — not professional networking
- Short, memorable, distinctly Indian

---

## 3. The Problem

Every year, millions of Indians move to new cities for college, jobs, coaching (UPSC, CAT, JEE), and internships. This creates real emotional and logistical challenges.

| Pain Point | Reality |
|---|---|
| **Social loneliness** | New arrivals feel disconnected. No familiar faces, no support network. |
| **Flatmate discovery** | Finding a trustworthy flatmate — ideally from the same hometown — is very hard. NoBroker and OLX have no hometown filters. |
| **Uncoordinated holiday travel** | During Diwali, Holi, Eid, Christmas — thousands of people travel the same routes with no way to find co-travelers. |
| **No organized hometown community** | No place to organize meetups, form groups, or stay connected as a hometown diaspora. |
| **Fragmented workarounds** | WhatsApp groups, Facebook groups, LinkedIn searches — informal, unstructured, unsafe. |

**The gap:** No existing platform is built specifically to connect people from the same hometown who now live in the same new city. This is what Bandhuu solves.

---

## 4. Vision & Goals

### Vision
To become the **largest platform in India connecting hometown communities across cities** — the go-to destination for anyone moving to a new city who wants to find their people.

### Goals
1. Enable hometown-based social discovery in any city across India
2. Reduce the emotional and logistical friction of relocating
3. Build trust through verified profiles and encrypted messaging
4. Create an engaged, active community through meetups, posts, and group activities
5. Build a sustainable business through premium features and monetization

---

## 5. Who Uses Bandhuu

### Persona A — The Student (Rahul)
- **Age:** 18–24
- **Situation:** Just moved to a new city for college or coaching
- **Needs:** Roommate from hometown, social connections, travel group for holidays
- **Frustration:** Feels alone; doesn't know anyone; WhatsApp groups are chaotic
- **Example:** *Rahul from Lucknow, studying at Christ University, Bangalore*

### Persona B — The Young Professional (Priya)
- **Age:** 22–30
- **Situation:** Joined a company in a metro city; relocated alone
- **Needs:** Flatmate, social network, weekend travel group, community events
- **Frustration:** Isolated in a big city; colleagues are not from hometown
- **Example:** *Priya from Kanpur, working at Infosys, Pune*

### Secondary Users
- **Mid-career relocators** who want to quickly rebuild a social circle
- **Freelancers / remote workers** who move cities frequently
- **Community organizers** who want to run meetups for their hometown diaspora

### User Profile Fields

**At signup:** Full name, username, email, password, occupation type (Student / Working Professional), gender, security question & answer.

**After signup (required to unlock social features):** Hometown (country/state/city), current location (country/state/city), organization or college name, bio.

**Optional:** Profile photo, job/course designation.

> A **Profile Completion Gate** blocks users from sending connection requests, creating posts, or creating meetups until all required profile fields are filled. A prompt guides them to complete their profile.

---

## 6. Core Value Proposition

Bandhuu helps users instantly find people from their hometown in their current city — a shared identity that creates instant trust, familiarity, and community.

| From Hometown | Current City | What Bandhuu Shows |
|---|---|---|
| Lucknow | Bangalore | People from Lucknow currently in Bangalore |
| Kanpur | Delhi | People from Kanpur currently in Delhi |
| Patna | Mumbai | People from Patna currently in Mumbai |
| Bhopal | Hyderabad | People from Bhopal currently in Hyderabad |

---

## 7. Key Use Cases

### Use Case 1 — Connect With Hometown People *(Core Loop)*
1. User sets hometown (Lucknow) and current city (Bangalore)
2. They browse posts and meetups from people in their city
3. They search for people from Lucknow currently in Bangalore
4. They view a profile and send a connection request
5. On acceptance, private encrypted chat is unlocked

### Use Case 2 — Find a Flatmate
- User creates a "Flatmate / Housing" post: city, area, budget, preference for someone from the same hometown
- Other users browse and filter these listings
- Interested people connect and chat

### Use Case 3 — Travel Together During Holidays
- Before Diwali/Christmas, user posts a "Travelmate" post
- Route: Bangalore → Lucknow, Date: 20 Dec, Train: Karnataka Express
- Others from the same route find the post, connect, and travel together

### Use Case 4 — Organize a Meetup
- User creates "Lucknow people in Bangalore — Dinner Meetup"
- Sets venue, date, time, max 12 participants
- Others RSVP; a dedicated group chat is auto-created for all participants
- Meetup appears on everyone's Home feed

### Use Case 5 — Form a Weekend Trip Group
- User creates "Weekend Trip to Coorg | From Bangalore | 6 people | ₹3,000/head"
- Others from the same hometown discover and join

### Use Case 6 — Join a Community *(Planned)*
- User joins "Lucknow People in Bangalore" community
- Posts within the community, sees members, participates in discussions

---

## 8. Navigation & App Structure

### Before Login
```
Welcome Screen → Onboarding → Sign In / Sign Up
```

### After Login — Bottom Tab Bar
```
[🏠 Home]  [💬 Messages]  [＋ Create]  [🔍 Search]  [👤 Account]
```

Hidden screens (not in tab bar, accessed from within the app):
- Notifications (from bell icon in header)
- User Profile (from tapping any user)
- Activity Detail (from Account tab activity items)

### Tab Bar Design
- Custom notched tab bar to accommodate the center **Create FAB** (floating action button)
- Active tab: terracotta accent color
- Center FAB: raised circular button for creating posts or meetups
- Unread badge on Messages tab icon

---

## 9. Every Screen — Feature Breakdown

---

### Welcome Screen

The first screen. Establishes brand identity and leads to onboarding.

**Contains:**
- App illustration (hero visual showing community/connection)
- App name "Bandhuu" in the serif brand font
- Tagline: *"Discover People From Your City, Anywhere"*
- Single "Get Started" button → goes to Onboarding

**Feel:** Warm, welcoming, culturally resonant. Like opening a letter from home.

---

### Onboarding Screen

Introduces the app concept before asking users to register.

**Contains:**
- 3–4 illustrated slide carousel:
  1. *"Find your people"* — hometown community discovery
  2. *"Stay connected"* — encrypted private messaging
  3. *"Meet in real life"* — meetups and trips
  4. *"Belong somewhere"* — community and shared identity
- Pagination dots at the bottom
- "Skip" button (top-right)
- "Next" / "Get Started" button

---

### Sign In / Sign Up Screen

Unified auth entry. A background illustration with two buttons: **"Sign In"** and **"Create Account"**. Tapping either opens a bottom sheet with the form.

**Sign Up form fields:**
Full Name → Username → Email → Password → Occupation Type → Gender → Security Question + Answer

**Sign In form fields:**
Email or Username + Password + "Forgot Password?" link

**Forgot Password — 3 steps:**
1. Enter email → app shows your security question
2. Answer the question → get a reset token (valid 10 mins)
3. Enter new password → done

---

### Home Tab — Posts & Meetups

The central hub. Two side-by-side content worlds — **Posts** and **Meetups** — switchable by tapping or swiping.

#### Sticky Header (always visible while scrolling)

- **Greeting line:** *"Good morning, [Name]"* in the serif font — personal and warm
- **Tab switcher:** "Posts" | "Meetups" — active tab in terracotta with a thick underline accent that animates with the swipe
- **Search bar:** Full-width, white surface, soft shadow, terracotta border on focus, clear (×) button when typing
- **Filter button:** Opens a filter sheet; fills terracotta when any filter is active

---

#### Posts Tab

**Upcoming Meetups Carousel** (shown above the feed when upcoming meetups exist):
- Label: *"Happening Soon"* + "View all →" link
- Horizontal scroll, up to 3 upcoming meetup cards
- Each card: cover image, date, time, meetup title, hometown tag (*"For Patna folks"*), spots remaining, and an action button (**RSVP** / **JOINED ✓** / **YOURS**)

**Post Feed** — *"Your Feed"*

**Each post card:**

*Author row:*
- Profile photo (circular) — tapping opens their profile
- Full name + relative timestamp (*"5m ago"*, *"3h ago"*)
- **Connect button** (right side) — 4 states:
  - *Add* (not connected)
  - *Pending ✓* (request sent)
  - *Connected* (tapping removes connection)
  - *Disabled* (own post)
  - Triggers profile completion gate if profile is incomplete

*Post body:*
- **Category pill**: GENERAL / FLATMATE · HOUSING / TRAVELMATE / TRIP / HANGOUTS / HELP · QUESTIONS (each category has a dedicated color)
- **Post title** in the serif font — the visual headline
- **Post details** — body text, truncated at 4 lines with *"Read more"* / *"Show less"*
- **Optional image** — 16:9 ratio

*Action bar:*
- **Like** (count, toggled) — optimistic UI
- **Dislike** (count, mutually exclusive with Like) — optimistic UI
- **Comment** (count) — opens Comments bottom sheet
- **Bookmark** (far right) — saves/unsaves the post — optimistic UI

**Comments bottom sheet:**
- Shows all comments and replies (threaded)
- Add comment or reply from a text input at the bottom
- Like/dislike individual comments
- Edit and delete own comments

**Filter bottom sheet:**

| Filter | Options |
|---|---|
| Hometown | Text input |
| Current City | Text input |
| Gender | Male / Female / Other chips |
| Sort By | Newest / Oldest / Most Liked / Most Disliked |
| Category | All categories as chips |
| Has Image | Toggle |
| Date Range | Date range picker |

Reset All + Apply Filters.

---

#### Meetups Tab

**Sticky sub-controls:**
- Search bar: searches meetup titles in real time
- Status pills: **Upcoming** / **Completed** / **All** (one active at a time)
- Date filter: calendar picker; selected date shown as a dismissible chip

**Each meetup card:**

*Image area:*
- Full-width cover photo
- Date badge (top-left): *"MON, 2 JUN"*
- Spots badge (bottom-right): *"4 left"* or *"FULL"*

*Content area:*
- Time: *"6:30 PM"*
- Hometown tag (*"For Lucknow folks"*) if targeted
- Meetup **title** in serif font
- **Details** with Read more / Show less
- **Venue + address** (location pin icon)
- **Footer:** Member count *"4/10"* + action button:
  - **RSVP NOW** — joins meetup + navigates to group chat in Messages
  - **JOINED ✓** — tapping leaves the meetup
  - **FULL** — disabled
  - **YOUR MEETUP** — informational

---

### Messages Tab

All private 1:1 chats and meetup group chats.

#### Top Toggle
Two pills: **💬 Yaaris** (1:1 chats) and **👥 Meetups** (group chats)

#### Conversation List

**Yaari (1:1) rows:**
- Circular avatar with online indicator (green dot)
- Name — **bold + terracotta** if there are unread messages
- Message preview — medium weight if unread
- Timestamp — terracotta if unread
- Terracotta unread badge
- Hometown → City tag: *"Lucknow → Bangalore"*
- Terracotta 3px left edge on rows with unread messages

**Meetup group rows:**
- Meetup image (circular) or gradient avatar with first letter
- Meetup name + last message preview
- Member count pill: *"6 members"*
- Unread badge

**Empty states:**
- Yaaris: 💬 + *"No messages yet"* + *"Connect with someone to start chatting"*
- Meetups: 👥 + *"No meetup groups"* + *"Join a meetup from the Home tab"*

**Compose button** (top-right): opens a sheet with the list of connections to start a new chat.

#### Chat View

**Header:**
- Back arrow + circular avatar with online status ring (terracotta ring = online)
- Name (serif) + status: *"Online"* (green) / *"typing..."* (terracotta) / *"last seen..."* (muted)
- Menu (⋮): clear chat, delete conversation, block user

**Chat background:**
- Warm cream background
- Subtle *"bandhuu"* watermark — brand signature element

**Date separators** between days:
```
──────── Today ────────
──────── Yesterday ────────
──────── Mon, 2 Jun ────────
```

**Message bubbles:**
- *My messages:* warm terracotta tint background, subtle terracotta border, tail bottom-right
- *Their messages:* white background, warm border, tail bottom-left
- Read receipt: double green check (read) / single muted check (sent)

**Message features:**
- Text messages
- Image messages
- **One-time view images** — viewed once, then locked forever; screenshot detection alerts
- Reply-to messages (shows quoted snippet)
- **Emoji reactions** on long-press (floating row above the tapped message)
- Typing indicator (animated dots)
- Message search within a conversation

**Composer bar:**
```
┌──────────────────────────────────────────────┐
│ [📎]  [   Type a message...              ] [→] │
└──────────────────────────────────────────────┘
```
- Attach button (images from gallery)
- Multiline input (grows up to 5 lines)
- Terracotta send button; disabled = muted
- Composer smoothly rises when the keyboard appears (including emoji keyboard)

**Encryption notice:** *"Messages are end-to-end encrypted"* shown when a chat is empty (lock icon + 11px muted text).

**Group chat extra:**
- At the top of a group chat: overlapping member avatar row → *"[A][B][C] +4 more · Chat with your meetup circle"*
- System messages (joined/left): amber-tinted centered pill

---

### Post / Create Tab (Center FAB)

Mode switcher at the top:
- **Post** mode
- **Meetup** mode

#### Create Post
| Field | Notes |
|---|---|
| Category | General / Flatmate & Housing / Travelmate / Trip / Hangouts / Help & Questions |
| Title | Short headline |
| Details | Full description |
| Image | Optional, from gallery or camera |

#### Create Meetup
| Field | Notes |
|---|---|
| Title | Meetup name |
| Details | Description |
| Max Members | Capacity limit |
| Target Hometown | Which hometown community this is for |
| City | Where it's held |
| Venue | Specific venue name |
| Date | Calendar picker |
| Time | Time picker |
| Image | Optional cover photo |

Profile completion gate blocks creation if profile is incomplete.

---

### Search Tab

Search for people using filters.

**Search bar** — real-time search by name or username.

**Filters:**
- Hometown City (text)
- Current City (text)
- Gender (Male / Female / Other chips)
- Occupation (Student / Working Professional chips)

**Results:** User cards with avatar, name, hometown → city tag, and a connect button.

**States:**
- Skeleton loaders while fetching
- Empty state: illustrated empty state + suggestion text
- Error state with retry

---

### Account Tab

Profile management, activity overview, and settings.

**Profile header:**
- Large circular profile photo (tappable to update)
- Full name (serif), username
- **Profile completion ring** — animated circular progress indicator showing % complete
- Hometown → Current City tag
- Bio + organization name

**Edit profile:**
- Update profile photo
- Edit all profile fields (name, username, hometown, current city, organization, bio)
- Country → State → City cascading pickers

**Activity summary cards** (tappable → drill-down screens):
- My Posts (count)
- Connections (count)
- Saved Posts (count)
- My Meetups (count)

**Settings:**
- Change Password
- Delete Account (15-day recovery window before permanent deletion)
- Logout

---

### Notifications Screen

Accessed from the bell icon in the header. Shows all activity notifications.

**Filter pills:** All / Requests / Likes / Comments / Meetups

**Notification types:**

| Type | Description | Action |
|---|---|---|
| Connection request | Someone sent a request | **Accept** / **Decline** inline |
| Connection accepted | Your request was accepted | Tap → their profile |
| Post liked | Someone liked your post | Tap → the post |
| Post commented | Someone commented | Tap → the post |
| Comment liked | Someone liked your comment | Tap → the post |
| Comment replied | Someone replied | Tap → the post |
| Meetup joined | Someone joined your meetup | Tap → meetup |

**Mark all read** button — clears the unread bell badge.

---

### User Profile Screen

**Contains:**
- Large circular profile photo
- Full name (serif), username
- Hometown → current city tag
- Organization / college
- Bio
- **Connection button** — 4 states: Connect / Request Sent / Connected / Own Profile
- **Message button** (if connected) → opens 1:1 chat
- User's posts list

**Three-dot menu (⋮):**
- Report User
- Block User

---

### Activity Detail Screen

Drill-down from Account tab activity cards.

**Modes:**
- **My Posts** — list with edit and delete on own posts
- **Connections** — list with remove connection option
- **Saved Posts** — list of bookmarked posts
- **My Meetups** — list of created and joined meetups

---

## 10. Safety & Trust

| Feature | Status | What It Does |
|---|---|---|
| End-to-end encryption | Live | All messages encrypted; server never sees plaintext |
| Block user | Live | Immediately removes user from all feeds, search, and messaging |
| Report user | Live | Sends report to admin for review |
| Profile completion gate | Live | Prevents social actions until profile is complete |
| Screen capture detection | Live | Alerts when someone screenshots a one-time view image |
| Soft account deletion | Live | 15-day recovery window before permanent deletion |
| Phone OTP verification | Planned | Reduces fake accounts; required at signup in v2 |
| Document verification | Planned | Student ID / company ID → verified badge on profile |
| Connection rate limit | Planned | Max 20 connection requests per day (anti-spam) |
| Admin moderation panel | Planned | Review reports, verify documents, ban users, remove content |
| No minors policy | Planned | 18+ confirmation at signup |

---

## 11. Design System & Visual Identity

### The Feeling

Bandhuu's visual identity is built around one truth: **finding a familiar face in a foreign crowd.**

The design should feel like a **community publication** — warm, editorial, crafted by people with taste. Not a SaaS dashboard. Not a generic startup app. Think of a local newspaper or community zine that lands on your doorstep — it has a voice, it respects the reader, it values content over chrome.

**Design Principles:**
1. **Community warmth over corporate polish** — A community noticeboard, not an enterprise app
2. **Cultural resonance** — Colors, fonts, and language should feel authentically Indian
3. **Information density with grace** — Cards carry many fields; handle them gracefully
4. **Clear action states** — Every button has 3–4 visual states; make them instantly readable
5. **The hometown tag is a signature element** — Surface it prominently whenever content is tied to a hometown
6. **Airy, spacious, minimal** — No crowded screens, no heavy gradients, no too many colors

---

### Color Palette

The entire app uses a **warm terracotta-earth palette**. No cold blues. No pure white.

#### Primary — Deep Terracotta (Main Brand Color)

The color of a fired clay pot, a marigold garland, a Diwali diya flame. Deliberately Indian.

| Name | Hex | Used For |
|---|---|---|
| Primary | `#E8580D` | Buttons, active states, key highlights |
| Primary Dark | `#C84B0C` / `#B8430A` | Deep terracotta, tab active, pressed states |
| Primary Light | `#FF8A50` | Hover / lighter variant |
| Primary Ghost | `#FFF0E8` | Tinted backgrounds, ghost buttons |

#### Background & Surfaces

| Name | Hex | Used For |
|---|---|---|
| Background | `#FFFAF5` | App background — warm off-white, aged paper feeling |
| Surface | `#FFFFFF` | Cards, modals, sheets |
| Input Bg | `#F5F0EB` | Input fields, inactive containers, filter areas |

#### Text

| Name | Hex | Used For |
|---|---|---|
| Text Primary | `#2D1A0E` | Main text — warm near-black (not pure #000) |
| Text Secondary | `#6B5E52` | Metadata, descriptions, secondary info |
| Text Muted | `#8B7D72` | Timestamps, placeholders, counts |

#### Borders

| Name | Hex | Used For |
|---|---|---|
| Border | `#E8DDD0` | Card borders, dividers, input outlines |

#### Semantic

| Name | Hex | Used For |
|---|---|---|
| Green (Success) | `#1A6B4A` | Connected state, RSVP joined, online indicator — *monsoon green* |
| Amber | `#D4A017` | System messages, announcements |
| Error | `#DC2626` | Errors, destructive actions |

#### Post Category Color System

Each post category has its own color used only as the pill accent:

| Category | Color | Hex |
|---|---|---|
| General | Warm amber | `#D4A017` |
| Flatmate / Housing | Slate blue | `#5B7FA6` |
| Travelmate | Teal | `#2A9D8F` |
| Trip | Teal variant | `#2A9D8F` |
| Hangouts | Soft coral / rose | `#E07B7B` |
| Help / Questions | Muted violet | `#7C6FA8` |

---

### Typography

The most important design decision: **mixing a serif and a sans-serif**. This is what gives Bandhuu its editorial identity — it makes the app feel like a crafted publication, not a generic template.

#### Display / Title Font — Humanist Serif

Used exclusively for post titles, meetup titles, screen headings, and the greeting line.

Recommended (in order): **Fraunces** → **DM Serif Display** → **Playfair Display** → **Georgia** (currently in use)

#### UI Font — Clean Sans-Serif

Used for all other text: buttons, metadata, labels, inputs, body text, timestamps.

Recommended: **Inter** (or system default — SF Pro on iOS, Roboto on Android)

#### Type Scale

| Element | Family | Size | Weight |
|---|---|---|---|
| Post / Meetup title | Serif | 18–20px | Bold |
| Screen title / greeting | Serif | 20–22px | Regular / Bold |
| User full name | Sans | 15–16px | SemiBold |
| Body / description text | Sans | 14px | Regular |
| Secondary / metadata | Sans | 12–13px | Regular |
| Category chips / labels | Sans | 10–11px | Medium, ALL-CAPS |
| Timestamp | Sans | 10–11px | Regular |
| Button text | Sans | 14px | SemiBold, UPPERCASE |

**Why the serif matters:** Without it, everything is the same weight and size — no hierarchy. With the serif title, the eye goes to the title first, then the author, then the body. The type does the work automatically.

---

### Spacing

4px grid system:

| Token | Value |
|---|---|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |

Layout specifics:
- 20px horizontal page margin
- 16px card internal padding
- 10px gap between cards
- 24px section header top spacing

---

### Card Design

Cards are the primary UI unit (posts, meetups, users, conversations).

- **Border radius:** 12–16px — friendly, not excessively bubbly
- **Shadow:** Very soft; 2px vertical, 8px blur, 8% warm-black opacity
- **Border:** 1px `#E8DDD0` warm grey
- **Background:** `#FFFFFF` on `#FFFAF5` — subtle distinction
- No heavy border + shadow combo (creates visual noise)

---

### Icons

**Current:** MaterialIcons + MaterialCommunityIcons  
**Recommended direction:** Transition to **Lucide Icons** for cleaner, minimal aesthetic

Icon principles:
- Thin outline style (not filled)
- Consistent stroke weight: 1.5–2px
- 20–24px for action icons; 16–18px for inline metadata

---

### Animations

| Element | Behavior |
|---|---|
| Screen transitions | Smooth horizontal slide |
| Posts ↔ Meetups tab switch | Animated offset + accent underline slides |
| Skeleton loaders | Shimmer left-to-right |
| Keyboard (composer) | Composer rises smoothly with keyboard, including emoji keyboard height |
| Like / bookmark toggles | Quick scale pulse |
| Bottom sheets | Slide up from bottom |

**Principles:**
- Animations feel native and intentional — not performative
- No long decorative animations
- All animations are interruptible

---

### Bottom Tab Bar

- Custom notched shape for the center FAB
- Warm `#d6d0c8` background
- Active icon: terracotta `#e8380d`
- Inactive icon: muted warm grey
- Center FAB: raised circle, terracotta, `+` icon
- Unread badge: red pill on Messages tab

---

### Overall UI Feel Summary

| Property | Value |
|---|---|
| Overall style | Editorial community publication |
| Background | Warm off-white `#FFFAF5` — aged paper |
| Primary accent | Deep terracotta `#C84B0C` / `#E8580D` |
| Success accent | Monsoon green `#1A6B4A` |
| Font pairing | Humanist serif (titles) + Inter (UI text) |
| UI pattern | Card-based, generous whitespace |
| Icons | Minimal outline |
| Animations | Smooth, subtle, natural |
| Tone | Warm, personal, community-first. Not corporate. |

---

*Bandhuu PRD — Product & Design — For internal use only*  
*Last updated: May 2026*
