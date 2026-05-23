import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  Dimensions, LayoutAnimation, Platform, UIManager,
  ActivityIndicator, TextInput, Modal, PanResponder, Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenShell } from "./TabShared";
import { fetchPosts, toggleLike, toggleDislike, toggleSave } from "../../services/posts/postService";
import {
  getMyConnections, removeConnection, sendConnectionRequest, searchUsers,
} from "../../services/users/userService";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import CommentsSheet from "./CommentsSheet";
import FilterModal from "./FilterModal";
import ProfileCompletionGateModal, { isProfileCompleteForConnections } from "../common/ProfileCompletionGateModal";
import { fetchMeetups, rsvpMeetup, leaveMeetup } from "../../services/meetups/meetupService";
import { getServerBaseUrl } from "../../services/chat/chatService";

const { width, height: SCREEN_H } = Dimensions.get("window");
const MEETUP_CTA_KEY = "bandhuu_hide_meetup_cta";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#F5F0EB",
  surface:     "#FEFCFA",
  terra:       "#C84B0C",
  terraLight:  "#FDF0EA",
  green:       "#1A6B4A",
  greenLight:  "#E8F5EE",
  ink:         "#1C1410",
  inkMid:      "#5C4F47",
  inkMuted:    "#9C8D84",
  border:      "#E8E0D8",
  divider:     "#F0EAE3",
  white:       "#FFFFFF",
  catGeneral:  "#D4820A", catGeneralBg:  "#FEF7E8",
  catHousing:  "#3B6CA8", catHousingBg:  "#EEF3FC",
  catTravel:   "#1A7A5E", catTravelBg:   "#E8F5F1",
  catHangouts: "#B83055", catHangoutsBg: "#FDEEF3",
  catHelp:     "#7040B8", catHelpBg:     "#F3EEFE",
};

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const DEFAULT_MEETUP_IMG = { uri: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" };

const CAT_MAP = {
  "general":   { color: C.catGeneral,  bg: C.catGeneralBg  },
  "flatmate":  { color: C.catHousing,  bg: C.catHousingBg  },
  "housing":   { color: C.catHousing,  bg: C.catHousingBg  },
  "travelmate":{ color: C.catTravel,   bg: C.catTravelBg   },
  "trip":      { color: C.catTravel,   bg: C.catTravelBg   },
  "hangouts":  { color: C.catHangouts, bg: C.catHangoutsBg },
  "help":      { color: C.catHelp,     bg: C.catHelpBg     },
  "questions": { color: C.catHelp,     bg: C.catHelpBg     },
};
const getCat = (cat) => {
  if (!cat) return { color: C.catGeneral, bg: C.catGeneralBg };
  const key = Object.keys(CAT_MAP).find(k => cat.toLowerCase().includes(k));
  return key ? CAT_MAP[key] : { color: C.catGeneral, bg: C.catGeneralBg };
};

const CAT_CHIPS = [
  { label: "Housing",  icon: "home",         value: "Flatmate / Housing", color: C.catHousing,  bg: C.catHousingBg  },
  { label: "Travel",   icon: "explore",      value: "Travelmate",         color: C.catTravel,   bg: C.catTravelBg   },
  { label: "Trips",    icon: "map",          value: "Trip",               color: C.catTravel,   bg: C.catTravelBg   },
  { label: "Hangouts", icon: "people",       value: "Hangouts",           color: C.catHangouts, bg: C.catHangoutsBg },
  { label: "Help",     icon: "help",         value: "Help / Questions",   color: C.catHelp,     bg: C.catHelpBg     },
  { label: "General",  icon: "article",      value: "General",            color: C.catGeneral,  bg: C.catGeneralBg  },
];

const fmtRelTime = (d) => {
  if (!d) return "just now";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  const h = Math.floor(m / 60); const day = Math.floor(h / 24);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${day}d ago`;
};
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental)
  UIManager.setLayoutAnimationEnabledExperimental(true);

// ─── QUICK COMPOSE BAR ─────────────────────────────────────────────────────────
function QuickComposeBar({ user, onPress }) {
  const city = user?.location?.split(",")[0]?.trim() || "your city";
  return (
    <Pressable style={s.composeBar} onPress={onPress}>
      <Image
        source={{ uri: user?.profileImageUri || "https://via.placeholder.com/150" }}
        style={s.composeAvatar}
      />
      <Text style={s.composePlaceholder} numberOfLines={1}>
        What's happening in {city}?
      </Text>
      <View style={s.composeBtn}>
        <Text style={s.composeBtnText}>Post</Text>
      </View>
    </Pressable>
  );
}

// ─── CATEGORY CHIPS ────────────────────────────────────────────────────────────
function CategoryChips({ activeCategory, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 2 }}
      style={{ marginBottom: 4 }}
      nestedScrollEnabled
    >
      {CAT_CHIPS.map((chip) => {
        const active = activeCategory === chip.value;
        return (
          <Pressable
            key={chip.value}
            style={[s.catChip, active && { backgroundColor: chip.color, borderColor: chip.color }]}
            onPress={() => onSelect(active ? null : chip.value)}
          >
            <MaterialIcons name={chip.icon} size={13} color={active ? C.white : chip.color} />
            <Text style={[s.catChipText, { color: active ? C.white : chip.color }]}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── PEOPLE STRIP ──────────────────────────────────────────────────────────────
function PeopleStrip({ people, connectedUsers, requestedUsers, requestingUsers, onConnect, onSeeAll }) {
  if (!people || people.length === 0) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>FROM YOUR HOMETOWN</Text>
        <Pressable onPress={onSeeAll} hitSlop={10}>
          <Text style={s.viewAll}>See all</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}
      >
        {people.map((person) => {
          const isConn  = connectedUsers[person._id];
          const isReqd  = requestedUsers[person._id];
          const isReqng = requestingUsers[person._id];
          const first   = (person.fullName || "").split(" ")[0] || "User";
          return (
            <View key={person._id} style={s.personCard}>
              <Image
                source={{ uri: person.profileImageUri || "https://via.placeholder.com/150" }}
                style={s.personAvatar}
              />
              <Text style={s.personName} numberOfLines={1}>{first}</Text>
              {person.hometown ? (
                <View style={s.personHometownRow}>
                  <View style={s.hometownDot} />
                  <Text style={s.personHometownText} numberOfLines={1}>{person.hometown}</Text>
                </View>
              ) : null}
              <Pressable
                style={[
                  s.personConnectBtn,
                  isConn && s.personConnectBtnDone,
                  isReqd && s.personConnectBtnSent,
                ]}
                onPress={() => onConnect(person)}
                disabled={!!isReqng || isConn}
              >
                <Text style={[
                  s.personConnectText,
                  isConn  && s.personConnectTextDone,
                  isReqd  && s.personConnectTextSent,
                ]}>
                  {isReqng ? "···" : isConn ? "✓ Added" : isReqd ? "Sent" : "+ Connect"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── MEETUP CTA CARD ───────────────────────────────────────────────────────────
function MeetupCtaCard({ userCity, onPress, onDismiss }) {
  return (
    <View style={s.meetupCta}>
      <Pressable style={s.meetupCtaClose} onPress={onDismiss} hitSlop={14}>
        <MaterialIcons name="close" size={15} color={C.inkMuted} />
      </Pressable>
      <Text style={s.meetupCtaEmoji}>🤝</Text>
      <Text style={s.meetupCtaHeading}>Gather your people</Text>
      <Text style={s.meetupCtaSub}>
        Create a meetup for folks from your hometown{userCity ? ` in ${userCity}` : ""}. It only takes a minute.
      </Text>
      <Pressable style={s.meetupCtaBtn} onPress={onPress}>
        <Text style={s.meetupCtaBtnText}>Create a Meetup</Text>
      </Pressable>
    </View>
  );
}

// ─── CAROUSEL CARD ─────────────────────────────────────────────────────────────
function CarouselCard({ meetup, userId, onRsvp, serverBase }) {
  const imgSrc = meetup.imageUri
    ? { uri: meetup.imageUri.startsWith("http") ? meetup.imageUri : `${serverBase}${meetup.imageUri}` }
    : DEFAULT_MEETUP_IMG;
  const isMember  = meetup.members?.some((m) => (m._id || m) === userId);
  const isCreator = (meetup.user?._id || meetup.user) === userId;
  const spotsLeft = meetup.maxMembers - (meetup.members?.length || 0);
  const day = new Date(meetup.date).getDate();
  const mon = new Date(meetup.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return (
    <View style={s.carCard}>
      <View style={s.carImgWrap}>
        <Image source={imgSrc} style={s.carImg} />
        <View style={s.carDateOverlay}>
          <Text style={s.carDateDay}>{day}</Text>
          <Text style={s.carDateMon}>{mon}</Text>
        </View>
      </View>
      <View style={s.carBody}>
        <Text style={s.carTime}>{fmtTime(meetup.time)}</Text>
        {meetup.hometown ? (
          <View style={s.hometownTag}>
            <View style={s.hometownDot} />
            <Text style={s.hometownText}>For {meetup.hometown}</Text>
          </View>
        ) : null}
        <Text style={s.carTitle} numberOfLines={2}>{meetup.title}</Text>
        <View style={s.carFooter}>
          <View style={s.carSpots}>
            <MaterialIcons name="people" size={11} color={C.inkMuted} />
            <Text style={s.carSpotsText}>{spotsLeft > 0 ? `${spotsLeft} left` : "Full"}</Text>
          </View>
          {isCreator ? (
            <View style={[s.carRsvpPill, s.carRsvpYours]}><Text style={s.carRsvpYoursText}>YOURS</Text></View>
          ) : isMember ? (
            <View style={[s.carRsvpPill, s.carRsvpJoined]}><Text style={s.carRsvpJoinedText}>JOINED</Text></View>
          ) : (
            <Pressable style={[s.carRsvpPill, s.carRsvpJoin]} onPress={() => onRsvp(meetup._id)}>
              <Text style={s.carRsvpJoinText}>RSVP</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────────────────────
function PostCard({
  post, userId, connectedUsers, requestingUsers, requestedUsers,
  onConnect, onLike, onDislike, onBookmark, onComment,
  expanded, onToggleExpand,
  entranceAnim, index, totalPosts,
  likeAnim, dislikeAnim, bookmarkAnim,
}) {
  const cat       = getCat(post.category);
  const isLiked   = post.likes?.includes(userId);
  const isDis     = post.dislikes?.includes(userId);
  const isSaved   = post.savedBy?.includes(userId);
  const isOwn     = post.user?._id === userId;
  const isConn    = connectedUsers[post.user?._id];
  const isReqd    = requestedUsers[post.user?._id];
  const isReqng   = requestingUsers[post.user?._id];
  const longBody  = post.details && post.details.length > 100;

  const staggerStart = Math.min((index / Math.max(totalPosts, 1)) * 0.55, 0.75);
  const staggerEnd   = Math.min(staggerStart + 0.35, 1);
  const opacity    = entranceAnim.interpolate({ inputRange: [staggerStart, staggerEnd], outputRange: [0, 1], extrapolate: "clamp" });
  const translateY = entranceAnim.interpolate({ inputRange: [staggerStart, staggerEnd], outputRange: [22, 0], extrapolate: "clamp" });

  let connectLabel    = "+ Connect";
  let connectBtnStyle = s.connectDefault;
  let connectTxtStyle = s.connectTxtDefault;
  if (isReqng)     { connectLabel = "···";       connectBtnStyle = s.connectLoading; connectTxtStyle = s.connectTxtLoading; }
  else if (isConn) { connectLabel = "Connected"; connectBtnStyle = s.connectDone;    connectTxtStyle = s.connectTxtDone;    }
  else if (isReqd) { connectLabel = "Requested"; connectBtnStyle = s.connectSent;    connectTxtStyle = s.connectTxtSent;    }

  return (
    <Animated.View style={[s.postCard, { opacity, transform: [{ translateY }] }]}>
      <View style={s.authorRow}>
        <Image source={{ uri: post.user?.profileImageUri || "https://via.placeholder.com/150" }} style={s.avatar} />
        <View style={s.authorMeta}>
          <Text style={s.authorName} numberOfLines={1}>{post.user?.fullName || "Unknown"}</Text>
          <Text style={s.authorTime}>{fmtRelTime(post.createdAt)}</Text>
        </View>
        {!isOwn && (
          <Pressable onPress={() => onConnect(post.user)} disabled={!!isReqng} style={[s.connectPill, connectBtnStyle]}>
            <Text style={[s.connectPillText, connectTxtStyle]}>{connectLabel}</Text>
          </Pressable>
        )}
      </View>

      <Text style={[s.catLabel, { color: cat.color }]}>{(post.category || "GENERAL").toUpperCase()}</Text>
      <Text style={s.postTitle}>{post.title}</Text>

      {post.details ? (
        <>
          <Text style={s.postBody} numberOfLines={expanded ? undefined : 3}>{post.details}</Text>
          {longBody && (
            <Pressable onPress={() => onToggleExpand(post._id)} hitSlop={10}>
              <Text style={s.readMore}>{expanded ? "Show less" : "Read more"}</Text>
            </Pressable>
          )}
        </>
      ) : null}

      {post.imageUri ? (
        <View style={s.postImgWrap}><Image source={{ uri: post.imageUri }} style={s.postImg} /></View>
      ) : null}

      <View style={s.actionBar}>
        <Pressable style={s.actionItem} onPress={() => onLike(post._id)}>
          <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
            <MaterialIcons name={isLiked ? "thumb-up" : "thumb-up-off-alt"} size={20} color={isLiked ? C.terra : C.inkMuted} />
          </Animated.View>
          <Text style={[s.actionCount, isLiked && { color: C.terra }]}>{post.likes?.length || 0}</Text>
        </Pressable>
        <Pressable style={s.actionItem} onPress={() => onDislike(post._id)}>
          <Animated.View style={{ transform: [{ scale: dislikeAnim }] }}>
            <MaterialIcons name={isDis ? "thumb-down" : "thumb-down-off-alt"} size={20} color={isDis ? C.inkMid : C.inkMuted} />
          </Animated.View>
          <Text style={[s.actionCount, isDis && { color: C.inkMid }]}>{post.dislikes?.length || 0}</Text>
        </Pressable>
        <Pressable style={s.actionItem} onPress={() => onComment(post._id)}>
          <MaterialIcons name="chat-bubble-outline" size={20} color={C.inkMuted} />
          <Text style={s.actionCount}>{post.comments || 0}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => onBookmark(post._id)} hitSlop={10}>
          <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
            <MaterialIcons name={isSaved ? "bookmark" : "bookmark-border"} size={22} color={isSaved ? C.catHousing : C.inkMuted} />
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── MEETUP CARD ───────────────────────────────────────────────────────────────
function MeetupCard({ meetup, userId, onRsvp, onLeave, expanded, onToggleExpand, serverBase }) {
  const imgSrc    = meetup.imageUri
    ? { uri: meetup.imageUri.startsWith("http") ? meetup.imageUri : `${serverBase}${meetup.imageUri}` }
    : DEFAULT_MEETUP_IMG;
  const isMember  = meetup.members?.some((m) => (m._id || m) === userId);
  const isCreator = (meetup.user?._id || meetup.user) === userId;
  const isFull    = (meetup.members?.length || 0) >= meetup.maxMembers;
  const spotsLeft = meetup.maxMembers - (meetup.members?.length || 0);
  const spotsUrgent = spotsLeft > 0 && spotsLeft <= 3;
  const members   = meetup.members || [];
  const faceSlots = Math.min(members.length, 3);
  const extra     = members.length - faceSlots;
  const day = new Date(meetup.date).getDate();
  const mon = new Date(meetup.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase();

  return (
    <View style={s.meetCard}>
      <View style={s.meetImgWrap}>
        <Image source={imgSrc} style={s.meetImg} />
        <View style={s.dateTile}>
          <Text style={s.dateTileDay}>{day}</Text>
          <Text style={s.dateTileMon}>{mon}</Text>
        </View>
        <View style={[s.spotsBadge, spotsUrgent && s.spotsBadgeUrgent]}>
          <Text style={[s.spotsText, spotsUrgent && s.spotsTextUrgent]}>
            {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
          </Text>
        </View>
      </View>
      <View style={s.meetBody}>
        <View style={s.meetTopRow}>
          <Text style={s.meetTime}>{fmtTime(meetup.time)}</Text>
          {meetup.hometown ? (
            <View style={s.hometownTagLg}>
              <View style={s.hometownDot} />
              <Text style={s.hometownTextLg}>For {meetup.hometown} folks</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.meetTitle} numberOfLines={2}>{meetup.title}</Text>
        {meetup.details ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={s.meetDesc} numberOfLines={expanded ? undefined : 2}>{meetup.details}</Text>
            {meetup.details.length > 80 && (
              <Pressable onPress={onToggleExpand} hitSlop={8}>
                <Text style={s.meetReadMore}>{expanded ? "Show less" : "Read more"}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {(meetup.venue || meetup.meetupLocation || meetup.location) ? (
          <View style={s.locPill}>
            <MaterialIcons name="location-on" size={12} color={C.catHousing} />
            <Text style={s.locText} numberOfLines={1}>
              {[meetup.venue, meetup.meetupLocation || meetup.location].filter(Boolean).join(", ")}
            </Text>
          </View>
        ) : null}
        <View style={s.meetFooter}>
          <View style={s.facepile}>
            {members.slice(0, faceSlots).map((mb, i) => (
              <View key={mb._id || i} style={[s.faceWrap, { marginLeft: i === 0 ? 0 : -7, zIndex: faceSlots - i }]}>
                {mb.profileImageUri
                  ? <Image source={{ uri: mb.profileImageUri }} style={s.faceImg} />
                  : <View style={[s.faceImg, s.facePlaceholder]}><Text style={s.facePlaceholderText}>{(mb.fullName || "?")[0]}</Text></View>
                }
              </View>
            ))}
            {extra > 0 && (
              <View style={[s.faceWrap, { marginLeft: -7 }]}>
                <View style={[s.faceImg, s.faceExtra]}><Text style={s.faceExtraText}>+{extra}</Text></View>
              </View>
            )}
            <Text style={s.memberCount}>{members.length}/{meetup.maxMembers}</Text>
          </View>
          {isCreator ? (
            <View style={[s.rsvpBtn, s.rsvpYours]}><Text style={s.rsvpYoursText}>Your Meetup</Text></View>
          ) : isMember ? (
            <Pressable style={[s.rsvpBtn, s.rsvpJoined]} onPress={() => onLeave(meetup._id)}>
              <Text style={s.rsvpJoinedText}>Joined ✓</Text>
            </Pressable>
          ) : isFull ? (
            <View style={[s.rsvpBtn, s.rsvpFull]}><Text style={s.rsvpFullText}>Full</Text></View>
          ) : (
            <Pressable style={[s.rsvpBtn, s.rsvpJoin]} onPress={() => onRsvp(meetup._id)}>
              <Text style={s.rsvpJoinText}>Join Meetup</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function HomeTab({ navigation }) {
  const { user }        = useAuth();
  const { showSnackbar } = useSnackbar();

  // pager
  const [mode, setMode]   = useState("Posts");
  const modeRef           = useRef("Posts");
  const translateX        = useRef(new Animated.Value(0)).current;

  // posts
  const [posts, setPosts]                   = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [error, setError]                   = useState(null);
  const [expandedPosts, setExpandedPosts]   = useState({});

  // connections
  const [connectedUsers, setConnectedUsers]   = useState({});
  const [requestingUsers, setRequestingUsers] = useState({});
  const [requestedUsers, setRequestedUsers]   = useState({});
  const [showProfileGate, setShowProfileGate] = useState(false);

  // meetups
  const [meetups, setMeetups]                         = useState([]);
  const [carouselMeetups, setCarouselMeetups]         = useState([]);
  const [meetupsLoading, setMeetupsLoading]           = useState(false);
  const [meetupSubTab, setMeetupSubTab]               = useState("upcoming");
  const [expandedMeetupDescs, setExpandedMeetupDescs] = useState({});

  // search / filter — posts
  const [searchText, setSearchText]       = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [hasImageFilter, setHasImageFilter] = useState(null);
  const [sortBy, setSortBy]               = useState("newest");
  const [activeGender, setActiveGender]   = useState(null);
  const [activeHometown, setActiveHometown] = useState("");
  const [activeLocation, setActiveLocation] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // search / filter — meetups
  const [meetupSearch, setMeetupSearch]               = useState("");
  const [meetupSearchFocused, setMeetupSearchFocused] = useState(false);
  const [meetupDateFilter, setMeetupDateFilter]       = useState(null);
  const [showMeetupDatePicker, setShowMeetupDatePicker] = useState(false);

  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  // ── new elements state ──────────────────────────────────────────────────
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [showMeetupCta, setShowMeetupCta]     = useState(false);

  // refs
  const debounceTimer   = useRef(null);
  const meetupDebounce  = useRef(null);
  const searchInputRef  = useRef(null);
  const meetupSearchRef = useRef(null);
  const activeFilters   = useRef({});

  // per-post animation maps
  const likeAnims    = useRef({});
  const dislikeAnims = useRef({});
  const bookmarkAnims = useRef({});
  const getAnim = (map, id) => { if (!map[id]) map[id] = new Animated.Value(1); return map[id]; };

  // list entrance (stagger)
  const listEntranceAnim = useRef(new Animated.Value(0)).current;

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => { loadPosts({}); }, []);
  useEffect(() => { loadConnections(); }, [user?._id]);

  useEffect(() => {
    fetchMeetups({ status: "upcoming" }).then((r) => {
      if (r.success) setCarouselMeetups(r.meetups.slice(0, 3));
    });
  }, []);

  useEffect(() => {
    setMeetupsLoading(true);
    fetchMeetups(buildMeetupParams()).then((r) => {
      if (r.success) setMeetups(r.meetups);
      setMeetupsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetupSubTab, meetupDateFilter]);

  useEffect(() => {
    if (meetupDebounce.current) clearTimeout(meetupDebounce.current);
    meetupDebounce.current = setTimeout(() => {
      setMeetupsLoading(true);
      fetchMeetups(buildMeetupParams()).then((r) => {
        if (r.success) setMeetups(r.meetups);
        setMeetupsLoading(false);
      });
    }, 400);
    return () => clearTimeout(meetupDebounce.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetupSearch]);

  useEffect(() => {
    activeFilters.current = {
      ...(searchText.trim()       ? { q: searchText.trim() }             : {}),
      ...(activeCategory          ? { category: activeCategory }         : {}),
      ...(hasImageFilter !== null ? { hasImage: String(hasImageFilter) } : {}),
      ...(sortBy !== "newest"     ? { sortBy }                           : {}),
      ...(activeGender            ? { gender: activeGender }             : {}),
      ...(activeHometown.trim()   ? { hometown: activeHometown.trim() }  : {}),
      ...(activeLocation.trim()   ? { location: activeLocation.trim() } : {}),
    };
  }, [searchText, activeCategory, hasImageFilter, sortBy, activeGender, activeHometown, activeLocation]);

  // Load suggested people from same hometown
  useEffect(() => {
    if (!user?.hometown) return;
    searchUsers(user.hometown, 1, 8).then((result) => {
      if (result?.users) {
        const filtered = result.users.filter((u) => u._id !== user._id).slice(0, 6);
        setSuggestedPeople(filtered);
      }
    });
  }, [user?._id, user?.hometown]);

  // Check meetup CTA dismissal
  useEffect(() => {
    AsyncStorage.getItem(MEETUP_CTA_KEY).then((val) => {
      if (val !== "true") setShowMeetupCta(true);
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  const buildMeetupParams = () => {
    const p = {};
    if (meetupSubTab !== "all") p.status = meetupSubTab;
    if (meetupSearch.trim()) p.q = meetupSearch.trim();
    if (meetupDateFilter) p.date = meetupDateFilter.toISOString().split("T")[0];
    return p;
  };

  const refreshCarousel = () =>
    fetchMeetups({ status: "upcoming" }).then((r) => {
      if (r.success) setCarouselMeetups(r.meetups.slice(0, 3));
    });

  const loadConnections = async () => {
    const r = await getMyConnections();
    if (!r.success) return;
    const map = {};
    (r.connections || []).forEach((u) => { if (u?._id) map[u._id] = true; });
    setConnectedUsers(map);
  };

  const triggerEntrance = () => {
    listEntranceAnim.setValue(0);
    Animated.timing(listEntranceAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const loadPosts = async (filters, silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    const r = await fetchPosts(filters ?? activeFilters.current);
    if (r.success) { setPosts(r.posts); triggerEntrance(); }
    else setError(r.message);
    if (!silent) setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadPosts(activeFilters.current, true),
      fetchMeetups({ status: "upcoming" }).then((r) => {
        if (r.success) setCarouselMeetups(r.meetups.slice(0, 3));
      }),
    ]);
    setIsRefreshing(false);
  };

  const dismissMeetupCta = () => {
    setShowMeetupCta(false);
    AsyncStorage.setItem(MEETUP_CTA_KEY, "true");
  };

  const onSearchChange = (text) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadPosts({
        ...(text.trim()           ? { q: text.trim() }                   : {}),
        ...(activeCategory        ? { category: activeCategory }         : {}),
        ...(hasImageFilter !== null ? { hasImage: String(hasImageFilter) } : {}),
        ...(sortBy !== "newest"   ? { sortBy }                           : {}),
        ...(activeGender          ? { gender: activeGender }             : {}),
        ...(activeHometown.trim() ? { hometown: activeHometown.trim() }  : {}),
        ...(activeLocation.trim() ? { location: activeLocation.trim() } : {}),
      });
    }, 500);
  };

  const applyFilters = (updated) => {
    if (updated) {
      setSortBy(updated.sortBy);
      setActiveCategory(updated.category);
      setHasImageFilter(updated.hasImage);
      setActiveGender(updated.gender);
      setActiveHometown(updated.hometown);
      setActiveLocation(updated.location);
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setTimeout(() => loadPosts(), 0);
  };

  const onCategoryChipSelect = (cat) => {
    setActiveCategory(cat);
    loadPosts({
      ...(searchText.trim()       ? { q: searchText.trim() }             : {}),
      ...(cat                     ? { category: cat }                    : {}),
      ...(hasImageFilter !== null ? { hasImage: String(hasImageFilter) } : {}),
      ...(sortBy !== "newest"     ? { sortBy }                           : {}),
      ...(activeGender            ? { gender: activeGender }             : {}),
      ...(activeHometown.trim()   ? { hometown: activeHometown.trim() }  : {}),
      ...(activeLocation.trim()   ? { location: activeLocation.trim() } : {}),
    });
  };

  const punch = (anim) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.72, duration: 75, useNativeDriver: true }),
      Animated.spring(anim,  { toValue: 1, tension: 280, friction: 7, useNativeDriver: true }),
    ]).start();
  };

  const handleToggleLike = async (postId) => {
    const uid = user?._id; if (!uid) return;
    punch(getAnim(likeAnims.current, postId));
    setPosts((prev) => prev.map((p) => {
      if (p._id !== postId) return p;
      const liked = p.likes?.includes(uid);
      return { ...p, likes: liked ? p.likes.filter(id => id !== uid) : [...(p.likes || []), uid], dislikes: p.dislikes?.filter(id => id !== uid) || [] };
    }));
    await toggleLike(postId);
  };

  const handleToggleDislike = async (postId) => {
    const uid = user?._id; if (!uid) return;
    punch(getAnim(dislikeAnims.current, postId));
    setPosts((prev) => prev.map((p) => {
      if (p._id !== postId) return p;
      const disliked = p.dislikes?.includes(uid);
      return { ...p, dislikes: disliked ? p.dislikes.filter(id => id !== uid) : [...(p.dislikes || []), uid], likes: p.likes?.filter(id => id !== uid) || [] };
    }));
    await toggleDislike(postId);
  };

  const handleToggleBookmark = async (postId) => {
    const uid = user?._id; if (!uid) return;
    punch(getAnim(bookmarkAnims.current, postId));
    const prev = posts;
    setPosts((ps) => ps.map((p) => {
      if (p._id !== postId) return p;
      const saved = p.savedBy?.includes(uid);
      return { ...p, savedBy: saved ? p.savedBy.filter(id => id !== uid) : [...(p.savedBy || []), uid] };
    }));
    const r = await toggleSave(postId);
    if (!r.success) { setPosts(prev); showSnackbar(r.message || "Unable to update saved post", "error"); }
  };

  const handleConnect = async (targetUser) => {
    const uid = user?._id; const tid = targetUser?._id;
    if (!tid) return;
    if (tid === uid) { showSnackbar("This is your own post.", "info"); return; }
    if (!isProfileCompleteForConnections(user)) { setShowProfileGate(true); return; }
    if (requestedUsers[tid]) { showSnackbar("Connection request already sent.", "info"); return; }
    setRequestingUsers((prev) => ({ ...prev, [tid]: true }));
    const r = connectedUsers[tid] ? await removeConnection(tid) : await sendConnectionRequest(tid);
    setRequestingUsers((prev) => ({ ...prev, [tid]: false }));
    if (!r.success) { showSnackbar(r.message || "Unable to send request", "error"); return; }
    if (connectedUsers[tid]) {
      setConnectedUsers((prev) => ({ ...prev, [tid]: false }));
      setRequestedUsers((prev) => ({ ...prev, [tid]: false }));
      showSnackbar("Connection removed.", "success");
    } else {
      setRequestedUsers((prev) => ({ ...prev, [tid]: true }));
      showSnackbar("Connection request sent.", "success");
    }
  };

  const handleRsvp = async (meetupId) => {
    const r = await rsvpMeetup(meetupId);
    if (r.success) {
      showSnackbar("You've joined the meetup!", "success");
      refreshCarousel();
      fetchMeetups(buildMeetupParams()).then((res) => { if (res.success) setMeetups(res.meetups); });
      navigation.navigate("Messages", { openGroupMeetup: r.data?.meetup });
    } else { showSnackbar(r.message || "Could not join meetup", "error"); }
  };

  const handleLeaveMeetup = async (meetupId) => {
    const r = await leaveMeetup(meetupId);
    if (r.success) {
      showSnackbar("Left meetup", "success");
      refreshCarousel();
      fetchMeetups(buildMeetupParams()).then((res) => { if (res.success) setMeetups(res.meetups); });
    } else { showSnackbar(r.message || "Could not leave meetup", "error"); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Pager
  // ─────────────────────────────────────────────────────────────────────────

  const snapTo = (toValue) => {
    Animated.spring(translateX, { toValue, useNativeDriver: true, tension: 80, friction: 12, overshootClamping: true }).start();
  };

  const switchToMode = (newMode) => {
    if (modeRef.current === newMode) return;
    modeRef.current = newMode; setMode(newMode);
    snapTo(newMode === "Meetups" ? -width : 0);
  };

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        const base = modeRef.current === "Posts" ? 0 : -width;
        const next = base + dx;
        let clamped;
        if (next > 0) clamped = next * 0.15;
        else if (next < -width) clamped = -width + (next + width) * 0.15;
        else clamped = next;
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const cur = modeRef.current; let newMode = cur;
        if (cur === "Posts"   && (dx < -(width * 0.25) || vx < -0.4)) newMode = "Meetups";
        if (cur === "Meetups" && (dx > width * 0.25   || vx > 0.4))  newMode = "Posts";
        if (newMode !== cur) { modeRef.current = newMode; setMode(newMode); }
        snapTo(newMode === "Meetups" ? -width : 0);
      },
      onPanResponderTerminate: () => snapTo(modeRef.current === "Posts" ? 0 : -width),
    })
  ).current;

  const hasActiveFilter = activeCategory || hasImageFilter !== null || activeGender || activeHometown || activeLocation || sortBy !== "newest";
  const connectionCount = Object.values(connectedUsers).filter(Boolean).length;
  const showPeopleStrip = suggestedPeople.length > 0 && connectionCount < 20;
  const serverBase      = getServerBaseUrl();
  const firstName       = user?.fullName?.split(" ")[0] || "there";
  const userCity        = user?.location?.split(",")[0]?.trim();

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ScreenShell
      navigation={navigation}
      routeName="Home"
      title={null}
      noPadding
      background={C.bg}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingBottom: 120 }}
      stickyHeaderIndices={[0]}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
    >
      {/* ══ CHILD 0: Sticky header ══ */}
      <View style={s.stickyBar}>
        <Text style={s.greeting}>Good {getTimeOfDay()}, {firstName}</Text>
        <View style={s.tabRow}>
          {["Posts", "Meetups"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => switchToMode(tab)}
              style={({ pressed }) => [s.tabBtn, pressed && { opacity: 0.6 }]}
              hitSlop={8}
            >
              <Text style={[s.tabLabel, mode === tab && s.tabLabelActive]}>{tab}</Text>
              {mode === tab && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {mode === "Posts" ? (
          <View style={s.searchRow}>
            <Pressable
              style={[s.searchBox, searchFocused && s.searchBoxFocused]}
              onPress={() => searchInputRef.current?.focus()}
            >
              <MaterialIcons name="search" size={16} color={searchFocused ? C.terra : C.inkMuted} />
              <TextInput
                ref={searchInputRef}
                style={s.searchInput}
                placeholder="Search posts…"
                placeholderTextColor={C.inkMuted}
                value={searchText}
                onChangeText={onSearchChange}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
                onSubmitEditing={() => applyFilters()}
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => { setSearchText(""); onSearchChange(""); }} hitSlop={8}>
                  <MaterialIcons name="close" size={14} color={C.inkMuted} />
                </Pressable>
              )}
            </Pressable>
            <Pressable
              style={[s.iconBtn, hasActiveFilter && s.iconBtnActive]}
              onPress={() => setIsFilterVisible(true)}
            >
              <MaterialIcons name="tune" size={18} color={hasActiveFilter ? C.white : C.inkMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={s.searchRow}>
              <Pressable
                style={[s.searchBox, meetupSearchFocused && s.searchBoxFocused]}
                onPress={() => meetupSearchRef.current?.focus()}
              >
                <MaterialIcons name="search" size={16} color={meetupSearchFocused ? C.terra : C.inkMuted} />
                <TextInput
                  ref={meetupSearchRef}
                  style={s.searchInput}
                  placeholder="Search meetups…"
                  placeholderTextColor={C.inkMuted}
                  value={meetupSearch}
                  onChangeText={setMeetupSearch}
                  onFocus={() => setMeetupSearchFocused(true)}
                  onBlur={() => setMeetupSearchFocused(false)}
                  returnKeyType="search"
                />
                {meetupSearch.length > 0 && (
                  <Pressable onPress={() => setMeetupSearch("")} hitSlop={8}>
                    <MaterialIcons name="close" size={14} color={C.inkMuted} />
                  </Pressable>
                )}
              </Pressable>
            </View>
            <View style={s.subTabRow}>
              {["upcoming", "completed", "all"].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setMeetupSubTab(tab)}
                  style={[s.subTabPill, meetupSubTab === tab && s.subTabPillActive]}
                >
                  <Text style={[s.subTabText, meetupSubTab === tab && s.subTabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
              <View style={{ flex: 1 }} />
              <Pressable
                style={[s.iconBtn, meetupDateFilter && s.iconBtnActive]}
                onPress={() => setShowMeetupDatePicker(true)}
              >
                <MaterialIcons name="calendar-month" size={18} color={meetupDateFilter ? C.white : C.inkMuted} />
              </Pressable>
            </View>
            {meetupDateFilter && (
              <View style={s.chipRow}>
                <View style={s.dateChip}>
                  <MaterialIcons name="calendar-today" size={11} color={C.catHousing} />
                  <Text style={s.dateChipText}>
                    {meetupDateFilter.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                  <Pressable onPress={() => setMeetupDateFilter(null)} hitSlop={8}>
                    <MaterialIcons name="close" size={13} color={C.inkMuted} />
                  </Pressable>
                </View>
              </View>
            )}
            {showMeetupDatePicker && (
              Platform.OS === "ios" ? (
                <Modal transparent animationType="fade" visible>
                  <Pressable style={s.dateOverlay} onPress={() => setShowMeetupDatePicker(false)}>
                    <Pressable style={s.dateSheet}>
                      <View style={s.dateSheetHeader}>
                        <Text style={s.dateSheetTitle}>Pick a date</Text>
                        <Pressable onPress={() => setShowMeetupDatePicker(false)}>
                          <Text style={s.dateSheetDone}>Done</Text>
                        </Pressable>
                      </View>
                      <DateTimePicker
                        value={meetupDateFilter || new Date()}
                        mode="date" display="inline"
                        onChange={(_, d) => { if (d) setMeetupDateFilter(d); }}
                        themeVariant="light"
                      />
                    </Pressable>
                  </Pressable>
                </Modal>
              ) : (
                <DateTimePicker
                  value={meetupDateFilter || new Date()}
                  mode="date" display="default"
                  onChange={(e, d) => { setShowMeetupDatePicker(false); if (e.type === "set" && d) setMeetupDateFilter(d); }}
                />
              )
            )}
          </>
        )}
      </View>

      {/* ══ CHILD 1: Swipeable pager ══ */}
      <View style={{ overflow: "hidden" }} {...swipePan.panHandlers}>
        <Animated.View style={{ flexDirection: "row", width: width * 2, transform: [{ translateX }] }}>

          {/* ── POSTS PAGE ── */}
          <View style={{ width, minHeight: SCREEN_H }}>

            {/* 1. Quick Compose Bar */}
            <View style={s.composePad}>
              <QuickComposeBar user={user} onPress={() => navigation.navigate("Post")} />
            </View>

            {/* 2. People from Your Hometown */}
            {showPeopleStrip && (
              <PeopleStrip
                people={suggestedPeople}
                connectedUsers={connectedUsers}
                requestedUsers={requestedUsers}
                requestingUsers={requestingUsers}
                onConnect={handleConnect}
                onSeeAll={() => navigation.navigate("Search")}
              />
            )}

            {/* 3. Happening Soon carousel */}
            {carouselMeetups.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>HAPPENING SOON</Text>
                  <Pressable onPress={() => switchToMode("Meetups")} hitSlop={12}>
                    <Text style={s.viewAll}>View all</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}
                >
                  {carouselMeetups.map((m) => (
                    <CarouselCard key={m._id} meetup={m} userId={user?._id} onRsvp={handleRsvp} serverBase={serverBase} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 4. Category filter chips */}
            <View style={s.chipsSection}>
              <CategoryChips activeCategory={activeCategory} onSelect={onCategoryChipSelect} />
            </View>

            {/* 5. Posts feed */}
            <View style={s.feedPadding}>
              {isLoading ? (
                <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.terra} />
              ) : error ? (
                <Text style={s.errorText}>{error}</Text>
              ) : posts.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>🏘</Text>
                  <Text style={s.emptyTitle}>Your people are here.</Text>
                  <Text style={s.emptySub}>Posts from your city will appear here.</Text>
                </View>
              ) : (
                posts.map((post, idx) => (
                  <PostCard
                    key={post._id || idx}
                    post={post}
                    userId={user?._id}
                    connectedUsers={connectedUsers}
                    requestingUsers={requestingUsers}
                    requestedUsers={requestedUsers}
                    onConnect={handleConnect}
                    onLike={handleToggleLike}
                    onDislike={handleToggleDislike}
                    onBookmark={handleToggleBookmark}
                    onComment={(id) => setActiveCommentPostId(id)}
                    expanded={!!expandedPosts[post._id]}
                    onToggleExpand={(id) => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
                    }}
                    entranceAnim={listEntranceAnim}
                    index={idx}
                    totalPosts={posts.length}
                    likeAnim={getAnim(likeAnims.current, post._id)}
                    dislikeAnim={getAnim(dislikeAnims.current, post._id)}
                    bookmarkAnim={getAnim(bookmarkAnims.current, post._id)}
                  />
                ))
              )}
            </View>
          </View>

          {/* ── MEETUPS PAGE ── */}
          <View style={{ width, minHeight: SCREEN_H, paddingBottom: 120 }}>
            {/* Create Meetup CTA */}
            {showMeetupCta && (
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
                <MeetupCtaCard
                  userCity={userCity}
                  onPress={() => navigation.navigate("Post")}
                  onDismiss={dismissMeetupCta}
                />
              </View>
            )}

            {meetupsLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={C.terra} size="large" />
            ) : meetups.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyEmoji}>{meetupSearch || meetupDateFilter ? "🔍" : "🗓"}</Text>
                <Text style={s.emptyTitle}>
                  {meetupSearch || meetupDateFilter ? "Nothing matches." : "No meetups yet."}
                </Text>
                <Text style={s.emptySub}>
                  {meetupSearch || meetupDateFilter
                    ? "Try a different search or clear the date filter."
                    : "Be the first to gather your people."}
                </Text>
                {(meetupSearch || meetupDateFilter) && (
                  <Pressable style={s.clearBtn} onPress={() => { setMeetupSearch(""); setMeetupDateFilter(null); }}>
                    <Text style={s.clearBtnText}>Clear filters</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={s.feedPadding}>
                {meetups.map((m) => (
                  <MeetupCard
                    key={m._id}
                    meetup={m}
                    userId={user?._id}
                    onRsvp={handleRsvp}
                    onLeave={handleLeaveMeetup}
                    expanded={!!expandedMeetupDescs[m._id]}
                    onToggleExpand={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedMeetupDescs((prev) => ({ ...prev, [m._id]: !prev[m._id] }));
                    }}
                    serverBase={serverBase}
                  />
                ))}
              </View>
            )}
          </View>

        </Animated.View>
      </View>

      <CommentsSheet visible={!!activeCommentPostId} postId={activeCommentPostId} onClose={() => setActiveCommentPostId(null)} />
      <FilterModal
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        onApply={applyFilters}
        initialFilters={{ sortBy, category: activeCategory, hasImage: hasImageFilter, gender: activeGender, hometown: activeHometown, location: activeLocation }}
      />
      <ProfileCompletionGateModal
        visible={showProfileGate}
        onClose={() => setShowProfileGate(false)}
        onCompleteProfile={() => { setShowProfileGate(false); navigation.navigate("Account"); }}
      />
    </ScreenShell>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Sticky bar ──
  stickyBar: {
    backgroundColor: C.bg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  greeting: {
    fontFamily: SERIF,
    fontSize: 13,
    color: C.inkMuted,
    fontWeight: "400",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    letterSpacing: 0.1,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    gap: 20,
    alignItems: "flex-start",
  },
  tabBtn: { alignItems: "flex-start" },
  tabLabel: { fontSize: 22, fontWeight: "700", color: C.inkMuted, letterSpacing: -0.5 },
  tabLabelActive: { color: C.terra, fontWeight: "800" },
  tabUnderline: { height: 3, width: 28, backgroundColor: C.terra, borderRadius: 2, marginTop: 5 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginBottom: 2 },
  searchBox: {
    flex: 1, height: 42, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchBoxFocused: { borderColor: C.terra, backgroundColor: C.white },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, padding: 0, fontWeight: "500" },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  iconBtnActive: { backgroundColor: C.terra, borderColor: C.terra },
  subTabRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginTop: 10, gap: 8 },
  subTabPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  subTabPillActive: { backgroundColor: C.ink, borderColor: C.ink },
  subTabText: { fontSize: 12, fontWeight: "700", color: C.inkMuted, letterSpacing: 0.2 },
  subTabTextActive: { color: C.white },
  chipRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, marginTop: 8, gap: 6 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.catHousingBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dateChipText: { fontSize: 12, fontWeight: "700", color: C.catHousing },
  dateOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  dateSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 },
  dateSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  dateSheetTitle: { fontSize: 16, fontWeight: "800", color: C.ink },
  dateSheetDone: { fontSize: 15, fontWeight: "700", color: C.terra },

  // ── Section layout ──
  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: C.inkMuted, letterSpacing: 1.5 },
  viewAll: { fontSize: 13, fontWeight: "700", color: C.terra },
  chipsSection: { paddingTop: 16, paddingBottom: 4 },
  feedPadding: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },
  emptyState: { alignItems: "center", paddingTop: 56, paddingHorizontal: 40, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontFamily: SERIF, fontSize: 18, fontWeight: "700", color: C.inkMid, textAlign: "center", marginTop: 4 },
  emptySub: { fontSize: 13, color: C.inkMuted, textAlign: "center", lineHeight: 20 },
  clearBtn: { marginTop: 8, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: C.terra },
  clearBtnText: { fontSize: 13, fontWeight: "700", color: C.terra },
  errorText: { textAlign: "center", marginTop: 24, color: C.inkMuted, paddingHorizontal: 20 },

  // ── Quick Compose Bar ──
  composePad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  composeBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  composeAvatar: { width: 36, height: 36, borderRadius: 18, flexShrink: 0, backgroundColor: C.border },
  composePlaceholder: { flex: 1, fontSize: 13, color: C.inkMuted, fontStyle: "italic" },
  composeBtn: { backgroundColor: C.terra, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, flexShrink: 0 },
  composeBtnText: { fontSize: 12, fontWeight: "800", color: C.white, letterSpacing: 0.3 },

  // ── Category chips ──
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
  },
  catChipText: { fontSize: 12, fontWeight: "700" },

  // ── People strip ──
  personCard: {
    width: 84, backgroundColor: C.surface, borderRadius: 14, padding: 10,
    alignItems: "center", gap: 5,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  personAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.border },
  personName: { fontSize: 12, fontWeight: "700", color: C.ink, textAlign: "center" },
  personHometownRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  personHometownText: { fontSize: 9, fontWeight: "600", color: C.inkMuted, maxWidth: 64 },
  personConnectBtn: {
    width: "100%", paddingVertical: 5, borderRadius: 10, alignItems: "center",
    backgroundColor: C.terraLight, borderWidth: 1.5, borderColor: C.terra, marginTop: 2,
  },
  personConnectBtnDone: { backgroundColor: C.greenLight, borderColor: C.green },
  personConnectBtnSent: { backgroundColor: C.greenLight, borderColor: C.green },
  personConnectText: { fontSize: 10, fontWeight: "800", color: C.terra },
  personConnectTextDone: { color: C.green },
  personConnectTextSent: { color: C.green },

  // ── Meetup CTA ──
  meetupCta: {
    backgroundColor: C.terraLight, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.terra + "30",
    alignItems: "center", gap: 6, position: "relative",
  },
  meetupCtaClose: { position: "absolute", top: 12, right: 12 },
  meetupCtaEmoji: { fontSize: 34 },
  meetupCtaHeading: { fontFamily: SERIF, fontSize: 18, fontWeight: "700", color: C.ink, textAlign: "center" },
  meetupCtaSub: { fontSize: 13, color: C.inkMid, textAlign: "center", lineHeight: 19, paddingHorizontal: 8 },
  meetupCtaBtn: { marginTop: 6, backgroundColor: C.terra, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 20 },
  meetupCtaBtnText: { fontSize: 13, fontWeight: "800", color: C.white, letterSpacing: 0.3 },

  // ── Carousel card ──
  carCard: {
    width: 152, backgroundColor: C.surface, borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  carImgWrap: { height: 110, position: "relative" },
  carImg: { width: "100%", height: "100%" },
  carDateOverlay: {
    position: "absolute", bottom: 8, left: 10,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignItems: "center",
  },
  carDateDay: { fontSize: 13, fontWeight: "900", color: C.white, lineHeight: 16 },
  carDateMon: { fontSize: 8, fontWeight: "700", color: "rgba(255,255,255,0.85)", letterSpacing: 1 },
  carBody: { padding: 10 },
  carTime: { fontSize: 9, fontWeight: "800", color: C.inkMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  carTitle: { fontFamily: SERIF, fontSize: 13, fontWeight: "700", color: C.ink, lineHeight: 18, marginBottom: 8, marginTop: 2 },
  carFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  carSpots: { flexDirection: "row", alignItems: "center", gap: 3 },
  carSpotsText: { fontSize: 10, fontWeight: "600", color: C.inkMuted },
  carRsvpPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  carRsvpJoin:       { backgroundColor: C.terra },
  carRsvpJoined:     { borderWidth: 1.5, borderColor: C.green },
  carRsvpYours:      { backgroundColor: "transparent" },
  carRsvpJoinText:   { fontSize: 9, fontWeight: "900", color: C.white, letterSpacing: 0.5 },
  carRsvpJoinedText: { fontSize: 9, fontWeight: "900", color: C.green, letterSpacing: 0.5 },
  carRsvpYoursText:  { fontSize: 9, fontWeight: "700", color: C.inkMuted },

  // ── Hometown tags ──
  hometownTag: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  hometownDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.terra },
  hometownText: { fontSize: 9, fontWeight: "800", color: C.terra },
  hometownTagLg: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.terraLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  hometownTextLg: { fontSize: 10, fontWeight: "700", color: C.terra },

  // ── Post card ──
  postCard: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 12, padding: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, flexShrink: 0, backgroundColor: C.border },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  authorTime: { fontSize: 11, color: C.inkMuted, fontWeight: "400", marginTop: 2 },
  connectPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, flexShrink: 0 },
  connectPillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.1 },
  connectDefault:    { borderColor: C.terra,  backgroundColor: C.terraLight },
  connectTxtDefault: { color: C.terra },
  connectLoading:    { borderColor: C.border, backgroundColor: "transparent" },
  connectTxtLoading: { color: C.inkMuted },
  connectSent:       { borderColor: C.green,  backgroundColor: C.greenLight },
  connectTxtSent:    { color: C.green },
  connectDone:       { borderColor: C.border, backgroundColor: "transparent" },
  connectTxtDone:    { color: C.inkMuted },
  catLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2, marginBottom: 6 },
  postTitle: { fontFamily: SERIF, fontSize: 20, fontWeight: "700", color: C.ink, lineHeight: 27, letterSpacing: -0.4, marginBottom: 8 },
  postBody: { fontSize: 14, lineHeight: 22, color: C.inkMid, fontWeight: "400", marginBottom: 6 },
  readMore: { fontSize: 12, fontWeight: "700", color: C.terra, marginBottom: 10, letterSpacing: 0.1 },
  postImgWrap: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, overflow: "hidden", marginTop: 10 },
  postImg: { width: "100%", height: "100%" },
  actionBar: { flexDirection: "row", alignItems: "center", gap: 20, paddingTop: 12, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionCount: { fontSize: 13, fontWeight: "600", color: C.inkMuted },

  // ── Meetup card ──
  meetCard: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, overflow: "hidden",
  },
  meetImgWrap: { height: 180, position: "relative" },
  meetImg: { width: "100%", height: "100%" },
  dateTile: {
    position: "absolute", top: 12, left: 12,
    backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", minWidth: 44,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  dateTileDay: { fontSize: 20, fontWeight: "900", color: C.terra, lineHeight: 22 },
  dateTileMon: { fontSize: 9, fontWeight: "800", color: C.inkMid, letterSpacing: 1, textTransform: "uppercase" },
  spotsBadge: { position: "absolute", bottom: 12, right: 12, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  spotsBadgeUrgent: { backgroundColor: C.terraLight },
  spotsText: { fontSize: 11, fontWeight: "800", color: C.ink },
  spotsTextUrgent: { color: C.terra },
  meetBody: { padding: 14 },
  meetTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  meetTime: { fontSize: 10, fontWeight: "800", color: C.inkMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  meetTitle: { fontFamily: SERIF, fontSize: 17, fontWeight: "700", color: C.ink, lineHeight: 23, marginBottom: 6, letterSpacing: -0.3 },
  meetDesc: { fontSize: 13, color: C.inkMuted, lineHeight: 19 },
  meetReadMore: { fontSize: 11, fontWeight: "700", color: C.terra, marginTop: 4 },
  locPill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: C.catHousingBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginBottom: 12, marginTop: 4 },
  locText: { fontSize: 12, fontWeight: "600", color: C.catHousing },
  meetFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  facepile: { flexDirection: "row", alignItems: "center" },
  faceWrap: {},
  faceImg: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: C.surface, backgroundColor: C.border },
  facePlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: C.catGeneralBg },
  facePlaceholderText: { fontSize: 10, fontWeight: "800", color: C.catGeneral },
  faceExtra: { alignItems: "center", justifyContent: "center", backgroundColor: C.border },
  faceExtraText: { fontSize: 8, fontWeight: "800", color: C.inkMid },
  memberCount: { fontSize: 12, fontWeight: "700", color: C.inkMuted, marginLeft: 8 },
  rsvpBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, alignItems: "center" },
  rsvpJoin:       { backgroundColor: C.terra },
  rsvpJoinText:   { fontSize: 12, fontWeight: "800", color: C.white, letterSpacing: 0.3 },
  rsvpJoined:     { backgroundColor: C.green },
  rsvpJoinedText: { fontSize: 12, fontWeight: "800", color: C.white, letterSpacing: 0.3 },
  rsvpFull:       { backgroundColor: C.border },
  rsvpFullText:   { fontSize: 12, fontWeight: "700", color: C.inkMuted },
  rsvpYours:      { borderWidth: 1.5, borderColor: C.terra },
  rsvpYoursText:  { fontSize: 12, fontWeight: "700", color: C.terra },
});
