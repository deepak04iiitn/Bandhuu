# Bandhuu — Messages Tab Redesign Proposal

---

## What Currently Exists and What's Wrong

### Color System
The entire MessagesTab uses the old color palette:
- `accentBlue: "#004ac6"` — chat bubble border, read receipts, avatar fallback, links, online indicators, reaction pills, search highlights, attachment button, scroll-down FAB, typing indicator, group sender names, sheet row arrows, one-time view UI
- `accent: "#e8380d"` — send button, unread badge, FAB button, confirm modals

Both are completely inconsistent with the warm terracotta system (`#C84B0C`) established across HomeTab, PostTab, NotificationsTab, and AccountTab.

### Keyboard Behavior (Critical Bug)
The current `KeyboardAvoidingView` with `behavior="padding"` (iOS) / `behavior="height"` (Android) has a fundamental limitation: it only responds to keyboard show/hide events, not to **keyboard frame changes**. When the user:
1. Taps on the text input → keyboard appears → composer rises ✓
2. Switches to the **emoji section** in the keyboard → keyboard gets taller → composer does NOT rise ✗
3. Switches back from emoji to regular keyboard → composer position doesn't always restore correctly ✗
4. On Android especially, the height-based KAV causes layout jumps instead of smooth animations

The fix requires tracking `keyboardWillChangeFrame` (iOS) and `keyboardDidChangeFrame` (both platforms) events and using an `Animated.Value` to smoothly offset the composer for any keyboard height change.

### Conversation List
1. The "Yaaris / Meetups" toggle uses old dark-ink fill for active state — should use terracotta
2. The conversation rows have no visual warmth — white background, generic avatar fallback in blue
3. Empty state uses a blue circle icon — should use the emoji + serif headline pattern from other screens
4. The search box uses old styling
5. The FAB button is orange-red (accent) — inconsistent

### Chat View
1. My-side bubbles use `tagBlue (#eef2ff)` background — should use a warmer tint
2. Read receipts use blue check — should use terracotta or green
3. Reply preview bar uses blue accent indicator and blue text
4. In-bubble reply preview uses blue
5. Scroll-to-bottom FAB is blue — should be terracotta
6. Chat header background is `paperDark (#ede9e2)` — fine but could be surface white
7. Group sender names are blue — should be terracotta

---

## The Keyboard Fix — Technical Design

This is the most important functional change. Here's the correct implementation:

### Replace `KeyboardAvoidingView` with manual keyboard tracking

```javascript
// In the chat view component:
const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
const keyboardHeightRef = useRef(0);

useEffect(() => {
  const onShow = (e) => {
    const height = e.endCoordinates.height;
    keyboardHeightRef.current = height;
    Animated.timing(keyboardHeightAnim, {
      toValue: height,
      duration: Platform.OS === 'ios' ? (e.duration || 250) : 50,
      useNativeDriver: false,
    }).start();
  };

  const onHide = (e) => {
    keyboardHeightRef.current = 0;
    Animated.timing(keyboardHeightAnim, {
      toValue: 0,
      duration: Platform.OS === 'ios' ? (e.duration || 250) : 50,
      useNativeDriver: false,
    }).start();
  };

  const onChange = (e) => {
    // Fires when keyboard changes HEIGHT (e.g., switching to emoji section)
    const height = e.endCoordinates.height;
    if (Math.abs(height - keyboardHeightRef.current) > 10) {
      keyboardHeightRef.current = height;
      Animated.timing(keyboardHeightAnim, {
        toValue: height,
        duration: Platform.OS === 'ios' ? (e.duration || 200) : 50,
        useNativeDriver: false,
      }).start();
    }
  };

  const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
  const changeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidChangeFrame';

  const subs = [
    Keyboard.addListener(showEvent,  onShow),
    Keyboard.addListener(hideEvent,  onHide),
    Keyboard.addListener(changeEvent, onChange),
  ];
  return () => subs.forEach(s => s.remove());
}, [keyboardHeightAnim]);
```

### Replace the outer `KeyboardAvoidingView` wrapper

Instead of:
```jsx
<KeyboardAvoidingView style={st.root} behavior={...}>
```

Use a plain `View`:
```jsx
<View style={st.root}>
  {/* header */}
  {/* chat body (flex: 1) */}
  <Animated.View style={{ paddingBottom: keyboardHeightAnim }}>
    {/* reply preview */}
    {/* composer */}
  </Animated.View>
</View>
```

The `Animated.View` wrapping the reply-preview + composer animates its `paddingBottom` based on the tracked keyboard height. This handles:
- Initial keyboard show (text keyboard)
- Emoji section expansion (keyboard grows taller)
- Return to regular keyboard (keyboard shrinks)
- Keyboard hide (returns to 0)
- All with smooth animation that matches the keyboard animation timing

### Additional scroll behavior
On keyboard show and keyboard frame change, trigger `scrollToBottom(true)` so the most recent messages remain visible:
```javascript
const onShow = (e) => {
  // ... animate keyboardHeightAnim
  setTimeout(() => scrollToBottom(true), 100);
};
const onChange = (e) => {
  // ... animate keyboardHeightAnim
  setTimeout(() => scrollToBottom(true), 50);
};
```

---

## Part 1 — Conversation List Redesign

### 1.1 Header
Replace `AppTopHeader` (which shows the back button + logo + notification bell) with a custom header that matches the screen's purpose.

The Messages screen is a main tab — there's no need for a back button here. The header should show:
- Left: **"Messages"** in serif, 22px, like other screen titles
- Right: **compose button** (pencil/chat icon) that opens the "New Message" sheet

This is cleaner than having the logo + back button from AppTopHeader.

Wait — actually the MessagesTab uses AppTopHeader which handles the notification bell too. Keep AppTopHeader since it provides the notification count. But position it correctly.

### 1.2 Yaaris / Meetups toggle

**Current**: Two equal buttons in a dark-grey segmented control, active = dark ink fill.

**New**: Same segmented control pattern as PostTab's mode switcher — two pills in a warm `C.inputBg` container:
- Active: terracotta fill, white text, terracotta shadow
- Inactive: transparent, muted text
- Icons: `chat-bubble-outline` for Yaaris, `people` for Meetups (group icon)

```
┌──────────────────────────────────────────────┐
│ [💬 Yaaris ▓▓▓]  [👥 Meetups              ] │
└──────────────────────────────────────────────┘
```

### 1.3 Search bar
Use the same search bar design as HomeTab:
- `C.surface` white background
- 1px `C.border` border
- Terracotta icon on focus
- Soft shadow
- Height 42px, borderRadius 12

### 1.4 Conversation rows (Yaaris)

**Current**: Avatar + name + preview + time + unread badge. Clean but uses blue for unread count and time.

**New improvements:**
- Avatar: circular (same as everywhere), warm palette fallback initials (terracotta/housing palette, not blue)
- Online indicator: `C.green` (#1A6B4A) dot — warm monsoon green instead of `accentMint`
- Name: 14px bold, `C.ink`. **Unread name**: 15px, heavier weight + terracotta color to signal unread
- Preview text: 13px `C.inkMuted`. **Unread preview**: `C.inkMid` with terracotta-tinted font weight
- Time: 10px muted. **Unread time**: terracotta
- Unread badge: terracotta fill (not orange-red accent)
- Pressed state: `C.inputBg` warm tint (not `paperDark`)
- Row divider: only the left side (aligned after avatar, like iOS Messages) — `marginLeft: 78`

### 1.5 Meetup group rows

**Current**: Group avatar is a plain circle with a `groups` icon in blue or the meetup image. Preview shows venue or last message.

**New**: 
- If meetup has an image: use it as the avatar (circular, 50px) with a small `groups` badge overlay (terracotta tint, bottom-right, like a type badge)
- If no image: a warm gradient avatar with the first letter of the meetup title
- Member count shown as a small pill: `3 members` in muted text below the preview
- Unread badge: same terracotta treatment

### 1.6 Section labels
Replace `RECENT CHATS` / `MEETUP GROUPS` all-caps labels with the standard section label treatment from HomeTab/AccountTab: 10px, `letterSpacing: 1.5`, `C.inkMuted`.

### 1.7 Empty states
Replace the blue-circle icon + text with the emoji + serif headline pattern:
- Yaaris empty: `💬` + "No messages yet." + sub-text + optional "Find people" link
- Meetups empty: `👥` + "No meetup groups." + "Join a meetup from the Home tab."

### 1.8 FAB (compose button)
Change from orange-red (`accent`) to terracotta (`C.terra`). Change icon from `chat` to `edit` or `create` to better signal "compose new message." Position: `bottom: insets.bottom + BAR_HEIGHT + 12`.

### 1.9 New message sheet
- Sheet handle: `C.border` warm
- Close button: `C.inputBg` background  
- Search bar: same treatment as list search
- Connection rows: circular avatars, journey tag, terracotta chat icon on right

---

## Part 2 — Chat View Redesign (DM + Group)

### 2.1 Chat header

**Current**: `paperDark` background, avatar + name + status + menu icon.

**New**: White surface background (`C.surface`), cleaner layout:
- Back arrow: `C.ink`, round hit area
- Avatar: circular 44px, **with online status ring** — a thin terracotta ring when online, `C.border` ring when offline (replaces the small dot indicator)
- Name: 15px bold serif (matches UserProfileScreen treatment)
- Status text: online = `C.green` "Online", typing = `C.terra` "typing...", offline = `C.inkMuted` "last seen..."
- Menu `⋮`: `C.inkMuted`
- Bottom border: 1px `C.border`

For **group chat header**:
- No avatar (it's a group) — or show a small meetup image if available (36px circle)
- Title: meetup name, 15px bold serif
- Sub-text: "N members" or "[name] is typing..."

### 2.2 Chat background
Keep the `bandhuu` watermark — it's a nice branding element. But change its color to match the warm bg:
- `wmCity`: `C.ink` at 6% opacity
- `wmYaari`: `C.terra` at 8% opacity (was blue at 8%)
- Background: `C.bg` (`#F5F0EB`) instead of `COLORS.paper` — consistent with rest of app

### 2.3 Message bubbles

**Mine (sent)**:
- Background: `C.terraLight` (`#FDF0EA`) — a very light warm terracotta tint instead of `tagBlue`
- Border: `C.terra + "25"` (very subtle terracotta border)
- Bottom-right radius: 4 (tail)
- Text: `C.ink`
- Read receipt: double-check in `C.green` when read, single `C.inkMuted` when sent
- Pending: clock icon in `C.inkMuted`

**Theirs (received)**:
- Background: `C.white` with 1px `C.border` — unchanged, clean
- Bottom-left radius: 4 (tail)

**Why terracotta for mine**: The app's primary action color is terracotta. Your own messages carrying that color is a natural extension of the identity — "these are MY words in MY color." It's warm and personal, not corporate blue.

**Bubble max-width**: `min(SCREEN_WIDTH * 0.75, 280)` — consistent across all devices. On tablets, bubbles shouldn't stretch too wide.

### 2.4 Reply preview (in bubble)
- `replyInBubblePeer`: background `C.inputBg`, border `C.border` — warm, not blue
- `replyUser`: `C.terra` text (was accentBlue)
- `replyIndicator`: `C.terra` (was accentBlue)

### 2.5 Reply preview bar (above composer)
- Background: `C.surface`
- Left indicator: `C.terra` (was accentBlue)
- Container: `C.terraLight` tint (was tagBlue)
- "Replying to" text: `C.terra` (was accentBlue)

### 2.6 Composer bar — the key design change

**Current**: A rounded pill container with attach icon + text input + send button, sitting on `COLORS.paper` background.

**New design**:

```
┌─────────────────────────────────────────────────────┐
│ [📎] [                    Type a message...      ] [→]│
│  img   ← text input (multiline, grows) →    send btn  │
└─────────────────────────────────────────────────────┘
```

- Container background: `C.surface` white
- Composer pill: white background, `C.border` border, `borderRadius: 24`
- Attach button: `C.inkMuted` icon (not blue) — neutral attachment
- Text input: `C.ink`, 15px, `fontWeight: "500"`, max 5 lines before scrolling
- Send button: terracotta fill, white arrow icon — **disabled state**: `C.border` background, `C.inkMuted` icon (not just opacity reduction)
- `paddingBottom` is driven by the `keyboardHeightAnim` Animated.Value (the keyboard fix)

### 2.7 Scroll-to-bottom FAB
- Color: `C.terra` fill, white arrow — consistent with other FABs in the app
- Size: 40x40, borderRadius 20

### 2.8 System messages (group chat)
- Background: `C.amberLight` or `C.terraLight` pill — warm golden tint instead of `tagGold`
- Text: `C.amber` (warm amber for system announcements)
- Icon: `celebration` in `C.amber`

### 2.9 Group sender name
- Color: `C.terra` (was `accentBlue`) — makes group chats feel on-brand
- Above peer bubbles only

### 2.10 Typing indicator
- Three dots: `C.inkMuted` at 0.3–1.0 opacity animation — unchanged, but the bubble itself gets the peer bubble styling (white + `C.border`)

### 2.11 Reaction pills on bubbles
- Mine: `C.terraLight` background, `C.terra` border, `C.terra` count text
- Peer: white background, `C.border` border, `C.inkMuted` count text
- `+` button to open full picker: `C.terra` background

### 2.12 One-time view UI
- Icon circle: `C.terraLight` instead of `tagBlue`
- "Tap to view" text: `C.terra`
- One-time toggle checkbox: terracotta when active

---

## Part 3 — New Elements

### 3.1 Unread conversation accent
When a conversation has unread messages, show a **thin terracotta left edge** on the row (3px, like HomeTab's post cards once had) to immediately signal unread. Combined with:
- Terracotta time
- Heavier preview text
- Terracotta unread badge

### 3.2 Conversation timestamp grouping
In the chat view, date separator pills between messages: `"Today"`, `"Yesterday"`, `"Mon, 2 Jun"` — centered pill with muted text and hairline lines on both sides. Currently there are NO date separators at all. This is standard in every messaging app.

```
────────────── Today ──────────────
```

Style: 9px all-caps `C.inkMuted` text, `C.border` hairlines, `C.bg` background pill. Appears between message groups when the date changes.

### 3.3 Encrypted message indicator
A subtle encryption notice in the empty chat state: a small lock icon + "Messages are end-to-end encrypted" in 11px muted text. Appears only when a chat is first opened (no messages). Consistent with the app's security branding.

### 3.4 Long-press action menu improvement
Current: the long-press opens a `Modal` with emoji reaction picker. 

New: the reaction picker appears as a **floating tooltip above the tapped message** (absolutely positioned, not a full-screen modal). This is the WhatsApp/Telegram/Signal pattern — it feels more contextual and less disruptive.

Implementation: use the tapped message's position in the FlatList to position the reaction row above or below it using `measure()`. Falls back to centered modal if positioning fails.

### 3.5 Meetup group — member avatars row
At the top of a group chat (shown once, fades away as you scroll), show a horizontal row of the group member avatars (up to 5, overlapping):
```
[A][B][C]+4 more  ·  Chat with your Patna circle 
```
This is a "who's here" moment that reinforces the community feeling of meetup chats.

---

## Part 4 — Responsive Design

### 4.1 Bubble max-width
Use `Math.min(SCREEN_WIDTH * 0.72, 320)` for bubble max-width — works well on both 375px (iPhone SE) and 428px (iPhone 14 Pro Max) and Android phones.

### 4.2 Composer input max-height
Cap the multiline input at 5 lines: `maxHeight: Math.min(5 * 22, 110)`. On smaller screens this is approximately 4 lines, on larger screens 5 lines — still gives the FlatList plenty of room.

### 4.3 Safe area handling
All fixed elements (composer, header) use `insets.top` / `insets.bottom` consistently. The keyboard offset animation accounts for `insets.bottom` properly:
```javascript
const composerOffset = Animated.add(keyboardHeightAnim, new Animated.Value(insets.bottom));
```
Wait — actually when the keyboard is up, `insets.bottom` is NOT subtracted. The keyboard height from `e.endCoordinates.height` already includes the home indicator area on modern iPhones. So when keyboard is hidden, `paddingBottom = insets.bottom`. When keyboard is shown, `paddingBottom = keyboardHeight` (which is always larger than `insets.bottom`).

Correct implementation:
```javascript
const composerPaddingBottom = keyboardHeightAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [Math.max(insets.bottom, 8), 1],
  extrapolate: 'identity',
});
// Actually simpler:
// paddingBottom = Math.max(keyboardHeight, insets.bottom)
// Since keyboardHeight is 0 when hidden and > insets.bottom when shown,
// we can just use: paddingBottom = keyboardHeightAnim + insets.bottom
// but clamp it... simplest: use keyboardHeightAnim directly
// and always have paddingTop: 6, paddingBottom: when-keyboard-up use keyboard height, when-down use insets.bottom
```

Simplest correct approach:
```jsx
<Animated.View style={[st.composerWrap, { paddingBottom: keyboardHeightAnim }]}>
```
With a minimum in the style: `paddingBottom` starts at `Math.max(insets.bottom, 8)` via the initial `keyboardHeightAnim` value or a separate base padding.

---

## Part 5 — What Is Not Changing

All business logic is preserved exactly:
- Socket connection and message handling
- End-to-end encryption (encrypt/decrypt)  
- Message delivery and read receipts
- Typing indicators
- Group chat join/leave/room management
- Image sending + one-time view + screen capture prevention
- Reply functionality and swipe gestures
- Message search within chat
- Long-press reactions
- Full emoji picker (EmojiPicker from rn-emoji-keyboard)
- Conversation list with unread counts
- New message sheet with connection filtering
- Delete conversation / clear chat
- Group leave confirmation
- FAB visibility logic

---

## Summary Visual: Before / After

### Conversation List
```
BEFORE:
[Blue avatar fallback]  Name              time (blue if unread)
                        Preview text      [● blue badge]

AFTER:
[Warm palette avatar]   Name              time (terra if unread)
                        Preview text      [● terra badge]
                        ● Hometown → City  (journey tag, new)
```

### Chat Bubble (mine)
```
BEFORE: [#eef2ff pale blue bubble | blue border]
AFTER:  [#FDF0EA warm terra tint  | subtle terra border]
```

### Composer (with keyboard)
```
BEFORE: Composer stays in place when emoji section opens ✗
AFTER:  Composer animates up smoothly to any keyboard height ✓
        Emoji keyboard expansion → composer rises further ✓
        Emoji keyboard collapse → composer lowers ✓
        Keyboard hide → composer returns to bottom ✓
```
