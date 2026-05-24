# Bandhuu — Account Tab Redesign Proposal

---

## Current Screen: What Exists and What's Wrong

The AccountTab currently has everything right logically — avatar, stats, profile info, edit flow, activity navigation — but the visual architecture and UX pattern are both wrong:

1. **Blue (#004ac6) everywhere** — avatar ring, icon backgrounds, edit button, toggle active states, bottom sheet handle, picker highlights. Completely inconsistent with the warm terracotta system used on every other redesigned screen.

2. **Collapsible section cards** — Personal Information, Location Details, and Security are all collapsed-by-default boxes with expand/collapse toggles. This is a dated pattern. Tapping "Personal Information" reveals a list of read-only info rows (Name, Email, Gender, Occupation, Bio). Why show read-only fields in a collapsible list? The user comes here to edit, not to read their own name. The entire collapsed section idea adds friction without benefit.

3. **One massive edit sheet** — All profile fields (name, email, bio, gender, occupation type, organization, role, hometown country/state/city, current country/state/city) are in one bottom sheet. That's 12–15 fields scrolling in a single modal. This is cognitively exhausting.

4. **Activity stats are buried** — Connections, Posts, and Saved Posts are navigation rows inside a "My Activity" section card, styled identically to every other section. The count numbers are there but feel like an afterthought.

5. **Security section is meaningless UI** — Shows "Security Question: Not configured" and "Security Answer: Not configured" as collapsed read-only rows. This takes up space and adds no value since there's no way to configure these from this screen.

6. **Profile completeness is invisible** — The only indication that the profile is incomplete is the "Complete Profile" button in the hero card top row, which shows only when `isProfileComplete` is false. No visual indicator of what's missing or how close you are. No progress signal.

7. **Hero card is cluttered** — A surfaceAlt gray banner at the top of the hero card contains the "Member" badge and the edit button side-by-side. Below that: avatar + name block horizontally with a gold underline. Below that: two chips for occupation and location. This is four distinct visual zones inside one card.

8. **No navigation pattern** — The screen is a flat vertical scroll of cards. Modern settings screens use a list-of-tappable-rows navigation pattern (iOS Settings, Instagram, Twitter/X) because it's faster to navigate and scales to more settings without feeling congested.

---

## The Design Direction

The redesigned Account screen works like **a personal dashboard plus a settings navigator**. It has two clear purposes:
1. Show you who you are on Bandhuu (your identity, stats, completeness)
2. Navigate cleanly to settings and profile editing (separate targeted sheets)

The design borrows the navigation pattern of modern settings screens — tappable rows with chevrons — instead of collapsible content sections. It fully adopts the warm terracotta system.

---

## Section 1 — Profile Header

**Remove**: The hero card box entirely. No card border, no surfaceAlt gray banner, no gold accent line, no chips.

**New header zone** — an integrated, borderless section on the warm page background:

**Left side**: Large circular avatar (88px) with a **terracotta ring** (same 2.5px as the UserProfileScreen). Camera button overlay at bottom-right (terracotta background, white camera icon). Tapping anywhere on the avatar triggers the photo picker.

**Right side of avatar**: The name + identity column
- Name in serif, 22px bold
- @username in 12px muted sans
- The **hometown journey tag** (`● Patna → Bengaluru`) — same terracotta dot + hometown (bold terra) → current city (muted) pattern used on UserProfileScreen and notification cards
- Occupation chip: small pill `🎓 B.Tech CS at IIIT Nagpur` in pale blue (the About section chip from UserProfileScreen)

**Bio** (if set): A line of italic 14px text directly below, spanning full width.

**Edit Profile button**: A terracotta outlined pill button (`Edit Profile →`) placed below the bio. Full width. When profile is incomplete: solid terracotta fill, text `Complete Profile`. This is the primary CTA.

**Visual treatment**: The header zone has `paddingHorizontal: 20`, `paddingTop: 20`, `paddingBottom: 24`, background same as the page (`#F5F0EB`), with a hairline border at the bottom separating it from the content below.

---

## Section 2 — Activity Stats

**Three-column stat bar**, identical to the UserProfileScreen stats bar:

```
     12          47           8
Connections    Posts       Saved
```

Each column is tappable — tapping navigates to `ActivityDetail` with the relevant type. Large 26px bold numbers. 10px all-caps muted labels. Thin vertical hairline dividers between columns.

Background: `C.surface` white. Bottom border separates it from the next section. No card border on all sides.

This is the most important change to the stats: previously they were buried in a "My Activity" section card styled identically to everything else. Now they're the first thing you see after the header — prominent, live, tappable.

---

## Section 3 — Profile Completeness Card (conditional)

Only shown when `isProfileComplete` is false.

A warm terracotta-tinted card (`#FDF0EA` background, `#C84B0C + "30"` opacity border). Inside:

**Left half**: 
- A circular progress ring showing completion percentage (e.g. "60%") in terracotta
- Small "Profile completeness" label below in 10px muted

**Right half**:
- A heading: "Your profile is **X%** complete"
- A list of missing fields as small bullet items: "Missing: Hometown, Bio, Organization"
- A terracotta filled button: "Finish your profile →"

**Why this matters**: The app gates connection requests behind profile completeness (`isProfileCompleteForConnections`). Users need to understand what's blocking them and how to fix it. This card makes that explicit.

When profile IS complete: show a small **"Profile complete ✓"** green banner in place of the card. Auto-dismissible after 3 seconds or with a tap. Then disappears permanently from the view.

**Progress calculation**: count of filled fields out of total required fields: fullName, email, gender, bio, organization, studyOrPost, hometownCity, hometownCountry, city, country = 10 fields. Show percentage.

---

## Section 4 — My Profile (navigation list)

A white surface card with three navigation rows. Each row taps to open a specific bottom sheet. No collapsible behavior.

**Section label**: "MY PROFILE" in the standard 10px all-caps muted label with letterSpacing 1.5 (same as HomeTab section headers). No card header — just the label above the card.

**Row 1 — Personal Info**
- Left: colored icon badge (blue tint, `person-outline` icon)
- Middle: "Personal Info" label (bold 14px) + preview value below (12px muted): *Anjali · anjali@email.com*
- Right: chevron →
- Opens: **Personal Info sheet** (name, email, bio, gender)

**Row 2 — Work & Education**
- Left: icon badge (catTravel tint, `school` or `work-outline` icon based on occupation type)
- Middle: "Work & Education" label + preview: *Student at IIIT Nagpur*
- Right: chevron →
- Opens: **Work sheet** (occupation type toggle, organization, role/course)

**Row 3 — Location**
- Left: icon badge (catHangouts tint/warm, `location-on` icon)
- Middle: "Location" label + preview: *Basti → Jaipur*
- Right: chevron →
- Opens: **Location sheet** (hometown country/state/city + current country/state/city)

Each row has a hairline border between it and the next (not after the last). The whole card has subtle shadow (`C.ink` at 0.05 opacity, 8px radius).

---

## Section 5 — App & Support (navigation list)

A second navigation list card. Section label: "APP & SUPPORT"

**Row 1 — Notifications** *(future feature slot)*
- Bell icon, "Notifications" label + "Manage your alerts" sub-label
- Chevron → (navigates to a future notifications settings screen or shows snackbar "Coming soon")

**Row 2 — Help & Support**
- Help icon, "Help & Support" + "Get in touch with us"
- Chevron → (could open a link or email)

**Row 3 — About Bandhuu**
- Info icon, "About" + "Version 1.0.0"
- Chevron → (shows a modal or navigates to about screen)

**Row 4 — Privacy Policy**
- Security icon, "Privacy Policy"
- Chevron →

---

## Section 6 — Account (sign out + delete)

A third card. Section label: "ACCOUNT". This card is visually distinct — it carries heavier actions.

**Row 1 — Sign Out**
- Icon: `logout`
- Color: standard ink/muted (not danger red — sign out is not dangerous)
- Sub-label: "You can always sign back in"
- Tapping shows a confirmation alert

**Row 2 — Delete Account**
- Icon: `delete-forever`
- Label color: coral red
- Icon background: pale coral
- Sub-label: "Permanently remove your account"
- Tapping opens the delete confirmation sheet (unchanged from current)

Visual separation: sign out and delete account have a hairline divider between them. The delete row's entire background shifts to a very subtle coral tint — not red, just a whisper of warning color.

---

## Section 7 — App Footer

A small centered row at the very bottom:

```
Bandhuu · v1.0.0   ·   Privacy   ·   Terms
```

11px muted text, centered. No visual decoration.

---

## Edit Sheets — Split by Topic

The single massive edit sheet is replaced with **three smaller targeted sheets**, each opened by tapping the corresponding row in the My Profile section.

### Sheet 1 — Personal Info

Fields: Full Name, Email Address, Bio (textarea), Gender (toggle chips: Male / Female / Other)

Character count on Bio. Simple, clean. Save button at bottom: full-width terracotta pill "Save Changes".

### Sheet 2 — Work & Education

Fields: Occupation Type (Student / Professional toggle), Organization / Company name, Course / Role

The occupation type toggle drives the labels: if Student → "School / College" + "Course / Studying For". If Professional → "Company / Organization" + "Post / Role Name".

### Sheet 3 — Location

This is the most complex sheet — 6 cascading dropdown selects (3 for hometown, 3 for current location). The existing country/state/city picker logic is preserved exactly.

The sheet splits into two visual sections with a hairline divider and a centered label:
```
────────  Hometown  ────────
Country / State / City dropdowns

────────  Currently In  ────────
Country / State / City dropdowns
```

Each Select field uses the same design as the detail cards in PostTab — icon prefix + text value + chevron-down.

---

## Profile Completeness — Logic

```js
const REQUIRED_FIELDS = [
  'fullName', 'email', 'gender', 'bio',
  'organization', 'studyOrPost',
  'hometownCountry', 'hometownCity',
  'country', 'city',
];

const completedCount = REQUIRED_FIELDS.filter(k => !!user[k]?.trim()).length;
const completionPct  = Math.round((completedCount / REQUIRED_FIELDS.length) * 100);
const missingFields  = REQUIRED_FIELDS.filter(k => !user[k]?.trim());
```

The missing fields are displayed with human-readable labels (not raw field keys).

---

## New Color System

Fully aligned with the terracotta system:

| Element | Old | New |
|---|---|---|
| Avatar ring | Blue (`#004ac6`) | Terracotta (`#C84B0C`) |
| Edit button | Blue fill | Terracotta fill / outlined |
| Toggle active | Blue | Terracotta |
| Icon backgrounds | Blue pale (`#eef2ff`) | Per-section accent (same as About card) |
| Activity count | Generic | Terracotta for active states |
| Sheet handle | Blue pale | Warm border color |
| Save button | Blue | Terracotta |
| Delete button | Coral (kept) | Coral (unchanged) |
| Section labels | Gold + border badges | 10px all-caps muted (no badges) |

---

## Screen Layout Summary

```
[Profile Header]
  [Avatar]   Name (serif)
             @username
             ● Hometown → Current city
             🎓 Role at Organization
  Bio text here...
  [Edit Profile / Complete Profile button]

[Stats bar]
  12 Connections | 47 Posts | 8 Saved

[Profile completeness card — conditional]
  60% ring | Missing: Hometown, Bio
  [Finish your profile →]

MY PROFILE
┌─────────────────────────────────────┐
│ 👤  Personal Info          Anjali → │
│─────────────────────────────────────│
│ 🎓  Work & Education  IIIT Nagpur → │
│─────────────────────────────────────│
│ 📍  Location           Basti → Jpr →│
└─────────────────────────────────────┘

APP & SUPPORT
┌─────────────────────────────────────┐
│ 🔔  Notifications              →    │
│ ❓  Help & Support              →    │
│ ℹ️  About · v1.0.0              →    │
│ 🔒  Privacy Policy             →    │
└─────────────────────────────────────┘

ACCOUNT
┌─────────────────────────────────────┐
│    Sign Out                   →     │
│─────────────────────────────────────│
│    Delete Account             →     │  ← coral tinted
└─────────────────────────────────────┘

        Bandhuu · v1.0.0 · Terms
```

---

## What Is Not Changing

- All business logic: `updateProfile`, `updateProfileImage`, `deleteAccount`, `logout` — unchanged
- Country/state/city cascading picker logic — unchanged
- `getMyActivitySummary` API call — unchanged
- Navigation to `ActivityDetail` with type params — unchanged
- Delete account confirmation + password entry — unchanged
- `useFocusEffect` data refresh — unchanged
- `ImagePicker` logic for avatar — unchanged
- The `Sheet`, `Field`, `SelectField`, `Picker` sub-components — kept but with updated colors
