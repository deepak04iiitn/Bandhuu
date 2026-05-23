# Bandhuu — Post & Meetup Creation Tab Redesign Proposal

---

## What This Screen Currently Is (Problems to Solve)

The current PostTab has the right structure — mode switcher at the top, form below — but several fundamental issues that this redesign addresses:

1. **Wrong brand identity**: The entire screen uses blue (#004ac6) as the primary color. Submit buttons, active chips, picker accents — all blue. This is completely inconsistent with the warm terracotta identity established on the HomeTab redesign.
2. **Generic hero image**: A hardcoded Google URL pointing to a random crowd photograph. Not owned, not branded, not contextual.
3. **Form feels like a form**: Every field is a labeled input in a vertical stack. There's nothing that makes this feel like *creating* something — it feels like *filling out* something.
4. **Meetup fields are unordered**: 7 fields in a flat list with no logical grouping. Hometown, venue, location, max members — all treated equally with no sense of what matters most.
5. **No auto-fill from profile**: The user's hometown and current city are already known from their profile. Asking them to type it again for every meetup is friction that should not exist.
6. **Character counts missing**: No indication of how long a title or description should be.
7. **Success modals feel generic**: The same popup animation for success regardless of whether a post or meetup was created. No personality.
8. **Category chips are hidden in a horizontal scroll**: Users discover them by scrolling. For the most important creative choice (what kind of post is this?), discovery should be immediate.

---

## The Central Idea

Creating a post or meetup should feel like **composing something, not filling out a government form.** The screen should feel like opening a blank page in a beautiful notebook — there is intention, space, and warmth. The tool should get out of the way of the thought.

The two modes — Post and Meetup — are meaningfully different things and should feel meaningfully different. A post is quick, conversational, personal. A meetup is an event with logistics, something you plan. The UI should reflect that difference.

---

## 1. Overall Screen Architecture

### What changes at the top level

**Remove the generic hero image.** Replace it with a purposeful, branded header zone that is part of the screen identity — not decoration.

**The new header zone** is a warm gradient surface (using the page background color `#F5F0EB` as base, deepening slightly toward the top, no hard edges). It contains:
- The user's own profile photo (38px circle) on the left
- Next to it: their full name in medium-weight sans, with "— your city" in muted text below
- On the right: nothing (negative space, intentional)

Below that, the mode switcher (described in section 2).

The header zone is NOT scrollable — it is a fixed identity anchor. The rest (the form) scrolls beneath it, with the header staying visible as context: "I, Anuj from Bangalore, am creating something."

### Form card

The form is no longer a card that "floats" over a hero image with a 40px border radius. That float effect looked clever but the arbitrary margin-top hack and the generic hero made it feel unearned.

Instead: the form is a plain white surface (`#FEFCFA`) that begins directly below the header zone, with gentle top padding and no border radius tricks. The transition from header to form is a clean horizontal hairline. Scroll begins here.

---

## 2. Mode Switcher — Post vs Meetup

### Current: A segmented control (two small pills in a row)
### New: Two large, clearly distinct mode cards

The mode switcher is a 2-column row of cards:

**Left card — "Share a Post"**
- Icon: `article` or `edit` (large, 26px)
- Label: "Share a Post" in medium-weight sans
- Sub-label: "Quick thought, question, find a flatmate" in muted tiny text

**Right card — "Plan a Meetup"**
- Icon: `event` (large, 26px)
- Label: "Plan a Meetup" in medium-weight sans
- Sub-label: "Organize an in-person gathering" in muted tiny text

**Active state**: The selected card has a solid terracotta background with white text and icon. The inactive card is pale warm background with muted grey text.

**Size**: Each card is 48px tall, 50% width minus 8px gap.

**Why this works**: At a glance you see two distinct categories before you tap anything. No ambiguity. The sub-label immediately tells you what each mode is for without requiring memory.

**Transition between modes**: When switching modes, the form content cross-fades (opacity 1→0→1 over 200ms). The mode cards animate the active background sliding from one to the other with a quick spring. Not a wipe — just a clean fade + active state swap.

---

## 3. Post Mode — Form Design

### 3.1 Category Selection (Redesigned)

**Current**: A horizontal scrolling chip list. Users who don't scroll right miss categories.

**New**: A 2×3 grid of category blocks, fully visible without scrolling. Each block is approximately 45% width (two columns, 8px gap).

Each category block:
- Background: the category's own light background color (from the category color system)
- Icon: 22px, category accent color
- Label: category name in 12px bold sans, category accent color
- Height: 56px
- Border radius: 12px
- Active state: the background becomes the category's full accent color, icon and text turn white

Categories and their grid positions (left-to-right, top-to-bottom):
| Position | Category | Icon |
|---|---|---|
| 1 | General | article |
| 2 | Flatmate / Housing | home |
| 3 | Travelmate | explore |
| 4 | Trip | map |
| 5 | Hangouts | people |
| 6 | Help / Questions | help |

The selected category's color also tints the submit button at the bottom — a subtle visual echo that ties the category to the action. (If "Hangouts" (coral) is selected, the submit button picks up the coral tone instead of always being terracotta.)

### 3.2 Title Input

**Label**: Small all-caps label above: "WHAT'S IT ABOUT?"

**Input field**: Larger than current. Full width, generous internal padding (20px). Background is the warm `#F5F0EB` (same as page background). No border in the resting state — the background itself provides the containment. On focus: a single 1.5px terracotta bottom border appears (not an outline, just a bottom underline). This is the "writing on paper" feeling — you don't see the box until you're writing in it.

**Placeholder**: *"Looking for a travel partner to Jaipur..."* — italic, muted, written in first-person to model the tone

**Character count**: Bottom-right of the field, in muted tiny text: `0 / 80`. Updates live as user types. Turns amber at 70 characters, red at 80 (hard limit).

**Font**: The typed text itself is in the serif font. When you're writing your post title, it should feel like writing a headline — not typing into a generic box.

### 3.3 Details Textarea

**Label**: "SHARE THE DETAILS"

**Textarea**: Expanded version of the title field. Min-height 110px, grows with content. Same no-border-until-focused behavior. Background: slightly warmer than page background.

**Character count**: `0 / 500`. In the bottom-right corner of the text area zone.

**Placeholder**: *"Share more context — what you're looking for, what makes this interesting..."* — encouraging, friendly.

**Typography**: Body text font (regular weight sans), comfortable line-height.

### 3.4 Image Upload Zone

**Label**: "ADD AN IMAGE" + "(Optional)" in muted text on the same line.

**Empty state**: A large dashed zone (dashes in the border color `#E8E0D8`, not blue). Height: 120px. Center: a camera icon (terracotta, 26px) with "Tap to add a photo" below it in small muted text. Beneath that: "JPG or PNG · Max 2 MB" in tiny grey text.

The dashed border and terracotta camera icon are the only visual indicators — no blue circle, no generic upload arrow.

**Filled state**: The selected image fills the zone fully in a 4:3 aspect ratio. Rounded corners (12px). A small × button in the top-right corner (semi-transparent dark circle with white ×) removes it. The image selection should feel like placing a photo on a desk — not uploading a file.

### 3.5 Profile Incomplete Inline Warning

**Current**: A modal popup with a yellow icon that interrupts the flow.

**New**: An inline banner that appears just above the submit button (only if profile is incomplete). It is:
- A warm amber-tinted strip (`#FEF3C7` background, `#92400E` text)
- Left: a small warning icon (14px)
- Text: "Your profile is incomplete. Complete it to post." 
- Right: a small text link "Finish profile →" in amber
- Height: 40px, full width, 10px border radius

It appears with a gentle slide-down animation when the user taps submit while incomplete. The submit button does NOT disappear — it stays there. Tapping "Finish profile" navigates to Account. This keeps the user in flow.

### 3.6 Submit Button

**Label**: "Share Post"
**Style**: Full-width, 52px tall, 26px border radius (pill). Background: terracotta `#C84B0C`. Text: white, 14px, bold, uppercase, letter-spacing 0.8.
**Pressed state**: Brief scale punch (0.97) + slight darken.
**Loading state**: Replace text with a small spinner (white, 18px). Button stays the same width/height — no layout shift.

---

## 4. Meetup Mode — Form Design

The meetup form is fundamentally different from the post form — it has more fields and requires more deliberate thought. The redesign **groups fields into logical sections** so the user has a mental model of what they're filling in, not just "a long form."

### Section grouping

Three titled sections, each with a small all-caps label:

```
COVER IMAGE
  [Image upload zone — wide]

THE GATHERING
  Meetup title
  Description

WHEN & WHO
  Date (left)    Time (right)
  Max members
  Hometown (pre-filled)

WHERE
  Venue name
  City / Location
```

Sections are visually separated by 28px of vertical space. The section label ("THE GATHERING", "WHEN & WHO", "WHERE") is 10px, all-caps, letterSpacing: 1.5, muted warm grey — the same treatment as section headers in the feed. A subtle hairline above each section label (except the first) acts as a visual divider.

### 4.1 Cover Image (Top of Meetup Form)

Unlike the post image which is optional and near the bottom, the meetup cover image is at the **very top of the meetup form** and is sized like an event poster.

**Empty state**: Full-width, 160px tall. Dashed border (terracotta, subtle). Center: large camera icon (32px, terracotta) with "Add a cover photo" text. Sub-text: "A good cover photo makes people want to join."

**Filled state**: The selected image fills the zone in a wide 16:9 frame. Rounded corners. The × button to remove it is styled identically to the post image × button.

Why it's first: For meetups, the cover image is what people see in the carousel and full list. It's not decoration — it's the first impression. Starting the form with it signals its importance.

### 4.2 THE GATHERING section

**Meetup Title input**: Same serif-typed, no-border-until-focused design as post title. Character count: `0 / 80`.

**Description textarea**: Min 90px. Character count: `0 / 400`. Placeholder: *"What's this meetup about? Who should come? What will you do?"*

### 4.3 WHEN & WHO section

**Date and Time — side by side row**

Two equal-width selector buttons in a horizontal row (48% each, 8px gap).

**Date button**:
- Background: warm surface
- Left side: A small "calendar tile" visual — the selected day number large and bold in terracotta, the month in tiny caps below it (like the tear-off calendar design from the meetup card)
- Right side: The full date string ("Mon, 2 Jun")
- Border: 1.5px warm border in resting state, terracotta border on focused/active

**Time button**:
- Similar layout, left side shows a large clock emoji or bold time in terracotta, right side shows "6:30 PM"
- Tapping opens the native time picker

Both buttons have a small chevron-down indicator at far right signaling they're tappable.

**Max Members**:
A custom stepper — not a plain text input. A row with a − button (outlined circle), the current number in large bold serif center, and a + button (filled terracotta circle). Default: 10. Range: 2–50.

Why a stepper: The text input approach ("type a number") is clunky for this use case. You're picking a size — 5, 8, 10, 20. Stepping with + / − is natural for that mental model. It also prevents invalid inputs (letters, negative numbers) without any validation error UX.

**Hometown field** (Pre-filled):

This field shows `user.hometown` as the default value when the user opens the meetup form. A small "pre-filled from your profile" note in muted text below the field.

The field is still editable — some users want to create meetups for a different hometown than their own (organizers, etc.). But the default removes the most common friction.

Style: same as other text inputs, with a small home icon as a left prefix inside the field.

### 4.4 WHERE section

**Venue name**: Standard text input. Placeholder: *"Chai Bar, Central Park, Friend's place..."* — specific, helpful examples.

**Location / City**: Standard text input. Pre-filled with `user.location` (their current city). A small location pin icon as left prefix. Same "pre-filled from your profile" note.

### 4.5 Submit Button

**Label**: "Create Meetup"
**Style**: Same as post submit — full-width, 52px tall, pill, terracotta. The only difference from the post submit button is the label.
**Pressed and loading states**: identical to post submit.

---

## 5. Feedback States (Success, Error, Profile Guard)

### 5.1 Success State — Redesigned

**Current**: A modal popup (floating card) that scales in from 0.8 with a spring animation.

**New**: An **in-screen success state** that replaces the form content rather than covering it with a modal. When the post or meetup is created:

1. The submit button briefly shows a spinner (300ms)
2. The entire form fades out (opacity 0, 200ms)
3. The success content fades in where the form was:

**Post success content:**
- A large terracotta checkmark circle (80px diameter, `#C84B0C` background, white check icon)
- Headline in serif: "Post shared." — short, confident
- Sub-text: "Your post is now live in the feed."
- Two buttons side by side:
  - "View feed" — outlined, terracotta border, terracotta text (navigates to Home)
  - "Post again" — filled, terracotta (resets the form and returns to it)

**Meetup success content:**
- Same circle but with a 🎉 emoji or celebration icon
- Headline: "Meetup created."
- Sub-text: "Others can now discover and join it. You've been added to the group chat."
- Two buttons:
  - "See Meetups" — outlined
  - "Create another" — filled

The in-screen approach is better than a modal because: it doesn't require dismissal, it doesn't feel like an interruption, and it uses the full screen real estate to celebrate the action.

### 5.2 Error State — Inline

**Current**: A modal popup identical in structure to the success modal but in red.

**New**: No modal. Errors are communicated via the system-wide snackbar (already in use elsewhere). For field-level validation errors (empty required field), the relevant field gets a gentle terracotta-red bottom border with a small error message below it.

The snackbar is already the established pattern — lean into it rather than duplicating with a modal.

### 5.3 Profile Guard — Inline Banner

Already described in Section 3.5 above. No modal — just an inline amber strip above the submit button.

---

## 6. Typography and Color Usage

This screen uses the **exact same design token set** as HomeTab:

| Token | Value | Where used |
|---|---|---|
| Terracotta `#C84B0C` | Primary action | Submit buttons, active category, focused borders, cover image camera icon |
| Warm off-white `#F5F0EB` | Page background | Screen background, input field backgrounds |
| `#FEFCFA` | Surface | Form card, input focused background |
| `#1C1410` | Ink | Input typed text, headings |
| `#5C4F47` | Ink mid | Labels, secondary text |
| `#9C8D84` | Ink muted | Placeholders, char counts, sub-labels |
| `#E8E0D8` | Border | Input borders, section dividers |
| Georgia / serif | Title font | Typed post/meetup title text |
| System sans | Body font | All labels, placeholders, button text |

**No blue in this screen.** No `#004ac6`. No `#2b66cd`. Blue is entirely removed from the creation flow, making the app feel consistent from feed → create → back to feed.

---

## 7. Auto-Fill Behaviors

| Field | Auto-fill source | Still editable? |
|---|---|---|
| Hometown (meetup) | `user.hometown` | Yes |
| Location / City (meetup) | `user.location` (current city) | Yes |
| Author photo (header) | `user.profileImageUri` | N/A — display only |

The auto-fill is silent — the field simply arrives pre-populated. A small "from your profile" note in muted text below the field explains where it came from. No toast, no banner.

---

## 8. Interaction Details

### Input focus behavior
- Resting state: no visible border on inputs (only background color differentiates them from the page)
- Focused state: a 1.5px terracotta bottom line appears, background shifts to pure white — the "writing on paper" metaphor
- Filled (unfocused): background returns to warm paper color, no border, but the typed text remains visible

### Keyboard avoidance
The entire form is wrapped in a `KeyboardAvoidingView`. When the keyboard appears, the active input scrolls into view above it. The submit button never disappears behind the keyboard.

### Character counter animation
The character counter is normally muted grey. As the count approaches the limit:
- 70%+ of limit: transitions to amber
- 90%+ of limit: transitions to terracotta red with a gentle pulse animation

### Form dirty state
If the user has typed anything in the form and taps the mode switcher (Post → Meetup or vice versa), a brief confirmation is shown: a bottom sheet with "Switch to Meetup? Your post draft will be cleared." — with "Cancel" and "Switch" buttons. This prevents accidental content loss.

### Max members stepper
The − button is visually disabled (opacity 0.4) when count is at minimum (2). The + button is disabled at maximum (50). The number in the center does a brief scale animation (1.0 → 1.15 → 1.0) when incremented or decremented — feedback that the value changed.

---

## 9. Screen Layout Summary (Visual Wireframe in Text)

### Post Mode
```
┌─────────────────────────────────────────┐
│ [Avatar] Anuj · Bangalore               │  ← warm gradient header
│                                         │
│  [Share a Post ▓▓▓] [Plan a Meetup   ]  │  ← mode switcher (active = filled)
├─────────────────────────────────────────┤
│  CHOOSE A CATEGORY                      │
│  [Housing][General]                     │  ← 2×3 grid, each colored
│  [Travel ][Trip   ]                     │
│  [Hangout][Help   ]                     │
│                                         │
│  WHAT'S IT ABOUT?                       │
│  ┌──────────────────────────────── 0/80┐│
│  │ Looking for a travel partner...     ││  ← serif text input
│  └────────────────────────────────────┘│
│                                         │
│  SHARE THE DETAILS                      │
│  ┌─────────────────────────────── 0/500┐│
│  │ Share more context...               ││  ← textarea
│  │                                     ││
│  └────────────────────────────────────┘│
│                                         │
│  ADD AN IMAGE (Optional)                │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│       📷  Tap to add a photo            │  ← dashed zone
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                         │
│  [         Share Post         ]         │  ← terracotta pill button
└─────────────────────────────────────────┘
```

### Meetup Mode
```
┌─────────────────────────────────────────┐
│ [Avatar] Anuj · Bangalore               │  ← same header
│                                         │
│  [Share a Post   ] [Plan a Meetup ▓▓▓]  │  ← mode switcher
├─────────────────────────────────────────┤
│                                         │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│      📷  Add a cover photo              │  ← meetup cover zone (top, wide)
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                         │
│  ─────────────────────────────────────  │
│  THE GATHERING                          │  ← section label
│  ┌─────────────────────────────────┐   │
│  │ Weekend chai and catch-up...    │   │  ← title (serif typed text)
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ What's this meetup about?...    │   │  ← description
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│  WHEN & WHO                             │
│  [  2  ]  [  6:30 PM  ]                 │  ← date tile | time tile (row)
│  [JUN  ]  [           ]                 │
│                                         │
│  Max members:   [−]  10  [+]            │  ← stepper
│                                         │
│  🏠 Patna  (from your profile)          │  ← hometown pre-filled
│                                         │
│  ─────────────────────────────────────  │
│  WHERE                                  │
│  📍 Chai Bar Koramangala                │  ← venue
│  📍 Bengaluru (from your profile)       │  ← location pre-filled
│                                         │
│  [        Create Meetup         ]       │  ← terracotta pill button
└─────────────────────────────────────────┘
```

---

## 10. What Is Not Changing

- The underlying API calls and form submission logic stay exactly the same
- `handleShareYaari`, `handleCreateMeetup`, `pickImage`, `pickMeetupImage` — all logic unchanged
- The `ProfileCompletionGateModal` logic (checking `user.hometownCountry && user.country && user.organization && user.bio`) stays the same — only the UI presentation changes
- `DateTimePicker` from `@react-native-community/datetimepicker` is still used for the native pickers
- `expo-image-picker` usage unchanged
- Image size validation (2MB limit) unchanged
- FormData submission logic unchanged
