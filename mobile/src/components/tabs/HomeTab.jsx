import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  TextInput,
  Modal,
  PanResponder,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScreenShell } from "./TabShared";
import { fetchPosts, toggleLike, toggleDislike, toggleSave } from "../../services/posts/postService";
import {
  getMyConnections,
  removeConnection,
  sendConnectionRequest,
} from "../../services/users/userService";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import CommentsSheet from "./CommentsSheet";
import FilterModal from "./FilterModal";
import ProfileCompletionGateModal, {
  isProfileCompleteForConnections,
} from "../common/ProfileCompletionGateModal";
import { fetchMeetups, rsvpMeetup, leaveMeetup } from "../../services/meetups/meetupService";
import { getServerBaseUrl } from "../../services/chat/chatService";

const { width, height: screenHeight } = Dimensions.get("window");

const DEFAULT_MEETUP_IMG = {
  uri: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
};

const COLORS = {
  ink: "#0a0a0a",
  inkLight: "#3d3d3d",
  inkMuted: "#888888",
  paper: "#f5f2ed",
  paperDark: "#ede9e2",
  accent: "#e8380d",
  accentBlue: "#004ac6",
  accentGold: "#c9890a",
  accentMint: "#007a5e",
  white: "#ffffff",
  cardBg: "#ffffff",
  tagRed: "#fff0ed",
  tagBlue: "#eef2ff",
  tagGold: "#fff8e6",
  border: "#e0dbd4",
  surface: "#fafaf8",
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeTab({ navigation }) {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [mode, setMode] = useState("Posts");
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [requestingUsers, setRequestingUsers] = useState({});
  const [requestedUsers, setRequestedUsers] = useState({});
  const [showProfileGateModal, setShowProfileGateModal] = useState(false);

  const [meetups, setMeetups] = useState([]);
  const [carouselMeetups, setCarouselMeetups] = useState([]);
  const [meetupsLoading, setMeetupsLoading] = useState(false);
  const [meetupSubTab, setMeetupSubTab] = useState("upcoming");

  const [meetupSearch, setMeetupSearch] = useState("");
  const [meetupSearchFocused, setMeetupSearchFocused] = useState(false);
  const [meetupDateFilter, setMeetupDateFilter] = useState(null);
  const [showMeetupDatePicker, setShowMeetupDatePicker] = useState(false);
  const meetupSearchRef = useRef(null);
  const meetupDebounceRef = useRef(null);

  const [expandedPosts, setExpandedPosts] = useState({});
  const [expandedMeetupDescs, setExpandedMeetupDescs] = useState({});
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [hasImageFilter, setHasImageFilter] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [activeGender, setActiveGender] = useState(null);
  const [activeHometown, setActiveHometown] = useState("");
  const [activeLocation, setActiveLocation] = useState("");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const debounceTimer = useRef(null);
  const searchInputRef = useRef(null);
  const activeFilters = useRef({});

  useEffect(() => {
    activeFilters.current = {
      ...(searchText.trim() ? { q: searchText.trim() } : {}),
      ...(activeCategory ? { category: activeCategory } : {}),
      ...(hasImageFilter !== null ? { hasImage: String(hasImageFilter) } : {}),
      ...(sortBy !== "newest" ? { sortBy } : {}),
      ...(activeGender ? { gender: activeGender } : {}),
      ...(activeHometown.trim() ? { hometown: activeHometown.trim() } : {}),
      ...(activeLocation.trim() ? { location: activeLocation.trim() } : {}),
    };
  }, [searchText, activeCategory, hasImageFilter, sortBy, activeGender, activeHometown, activeLocation]);

  useEffect(() => { loadPosts({}); }, []);
  useEffect(() => { loadConnections(); }, [user?._id]);

  useEffect(() => {
    fetchMeetups({ status: "upcoming" }).then((result) => {
      if (result.success) setCarouselMeetups(result.meetups.slice(0, 3));
    });
  }, []);

  useEffect(() => {
    const params = buildMeetupParams();
    setMeetupsLoading(true);
    fetchMeetups(params).then((result) => {
      if (result.success) setMeetups(result.meetups);
      setMeetupsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetupSubTab, meetupDateFilter]);

  useEffect(() => {
    if (meetupDebounceRef.current) clearTimeout(meetupDebounceRef.current);
    meetupDebounceRef.current = setTimeout(() => {
      const params = buildMeetupParams();
      setMeetupsLoading(true);
      fetchMeetups(params).then((result) => {
        if (result.success) setMeetups(result.meetups);
        setMeetupsLoading(false);
      });
    }, 400);
    return () => clearTimeout(meetupDebounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetupSearch]);

  const buildMeetupParams = () => {
    const params = {};
    if (meetupSubTab !== "all") params.status = meetupSubTab;
    if (meetupSearch.trim()) params.q = meetupSearch.trim();
    if (meetupDateFilter) params.date = meetupDateFilter.toISOString().split("T")[0];
    return params;
  };

  const refreshCarousel = () => {
    fetchMeetups({ status: "upcoming" }).then((result) => {
      if (result.success) setCarouselMeetups(result.meetups.slice(0, 3));
    });
  };

  const handleRsvp = async (meetupId) => {
    const res = await rsvpMeetup(meetupId);
    if (res.success) {
      showSnackbar("Joined meetup!", "success");
      refreshCarousel();
      fetchMeetups(buildMeetupParams()).then((r) => { if (r.success) setMeetups(r.meetups); });
      navigation.navigate("Messages", { openGroupMeetup: res.data?.meetup });
    } else {
      showSnackbar(res.message || "Could not join meetup", "error");
    }
  };

  const handleLeaveMeetup = async (meetupId) => {
    const res = await leaveMeetup(meetupId);
    if (res.success) {
      showSnackbar("Left meetup", "success");
      refreshCarousel();
      fetchMeetups(buildMeetupParams()).then((r) => { if (r.success) setMeetups(r.meetups); });
    } else {
      showSnackbar(res.message || "Could not leave meetup", "error");
    }
  };

  const formatMeetupDate = (d) =>
    new Date(d)
      .toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase();

  const formatMeetupTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const loadConnections = async () => {
    const result = await getMyConnections();
    if (!result.success) return;
    const map = {};
    (result.connections || []).forEach((u) => { if (u?._id) map[u._id] = true; });
    setConnectedUsers(map);
  };

  const loadPosts = async (filters) => {
    setIsLoading(true);
    setError(null);
    const result = await fetchPosts(filters ?? activeFilters.current);
    if (result.success) setPosts(result.posts);
    else setError(result.message);
    setIsLoading(false);
  };

  const onSearchChange = (text) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadPosts({
        ...(text.trim() ? { q: text.trim() } : {}),
        ...(activeCategory ? { category: activeCategory } : {}),
        ...(hasImageFilter !== null ? { hasImage: String(hasImageFilter) } : {}),
        ...(sortBy !== "newest" ? { sortBy } : {}),
        ...(activeGender ? { gender: activeGender } : {}),
        ...(activeHometown.trim() ? { hometown: activeHometown.trim() } : {}),
        ...(activeLocation.trim() ? { location: activeLocation.trim() } : {}),
      });
    }, 500);
  };

  const applyFilters = (updatedFilters) => {
    if (updatedFilters) {
      setSortBy(updatedFilters.sortBy);
      setActiveCategory(updatedFilters.category);
      setHasImageFilter(updatedFilters.hasImage);
      setActiveGender(updatedFilters.gender);
      setActiveHometown(updatedFilters.hometown);
      setActiveLocation(updatedFilters.location);
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setTimeout(() => loadPosts(), 0);
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Just now";
    const diffMs = new Date() - new Date(dateString);
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (m < 60) return `${Math.max(1, m)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  };

  const getCategoryTheme = (category) => {
    const def = { color: COLORS.accent, bg: COLORS.tagRed };
    if (!category) return def;
    const l = category.toLowerCase();
    if (l.includes("housing") || l.includes("flatmate")) return { color: COLORS.accentBlue, bg: COLORS.tagBlue };
    if (l.includes("travel") || l.includes("trip")) return { color: "#10b981", bg: "#ecfdf5" };
    if (l.includes("hangouts") || l.includes("events")) return { color: COLORS.accentGold, bg: COLORS.tagGold };
    if (l.includes("help") || l.includes("questions")) return { color: "#ef4444", bg: "#fef2f2" };
    return def;
  };

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleLike = async (postId) => {
    const uid = user?._id;
    if (!uid) return;
    setPosts((prev) => prev.map((p) => {
      if (p._id !== postId) return p;
      const liked = p.likes?.includes(uid);
      return {
        ...p,
        likes: liked ? p.likes.filter((id) => id !== uid) : [...(p.likes || []), uid],
        dislikes: p.dislikes?.filter((id) => id !== uid) || [],
      };
    }));
    await toggleLike(postId);
  };

  const handleToggleDislike = async (postId) => {
    const uid = user?._id;
    if (!uid) return;
    setPosts((prev) => prev.map((p) => {
      if (p._id !== postId) return p;
      const disliked = p.dislikes?.includes(uid);
      return {
        ...p,
        dislikes: disliked ? p.dislikes.filter((id) => id !== uid) : [...(p.dislikes || []), uid],
        likes: p.likes?.filter((id) => id !== uid) || [],
      };
    }));
    await toggleDislike(postId);
  };

  const handleToggleBookmark = async (postId) => {
    const uid = user?._id;
    if (!uid) return;
    const prev = posts;
    setPosts((ps) => ps.map((p) => {
      if (p._id !== postId) return p;
      const saved = p.savedBy?.includes(uid);
      return { ...p, savedBy: saved ? p.savedBy.filter((id) => id !== uid) : [...(p.savedBy || []), uid] };
    }));
    const result = await toggleSave(postId);
    if (!result.success) {
      setPosts(prev);
      showSnackbar(result.message || "Unable to update saved post", "error");
    }
  };

  const handleSendConnectionRequest = async (targetUser) => {
    const uid = user?._id;
    const tid = targetUser?._id;
    if (!tid) return;
    if (tid === uid) { showSnackbar("This is your own post.", "info"); return; }
    if (!isProfileCompleteForConnections(user)) { setShowProfileGateModal(true); return; }
    if (requestedUsers[tid]) { showSnackbar("Connection request already sent.", "info"); return; }
    setRequestingUsers((prev) => ({ ...prev, [tid]: true }));
    const result = connectedUsers[tid] ? await removeConnection(tid) : await sendConnectionRequest(tid);
    setRequestingUsers((prev) => ({ ...prev, [tid]: false }));
    if (!result.success) { showSnackbar(result.message || "Unable to send request", "error"); return; }
    if (connectedUsers[tid]) {
      setConnectedUsers((prev) => ({ ...prev, [tid]: false }));
      setRequestedUsers((prev) => ({ ...prev, [tid]: false }));
      showSnackbar("Connection removed.", "success");
    } else {
      setRequestedUsers((prev) => ({ ...prev, [tid]: true }));
      showSnackbar("Connection request sent.", "success");
    }
  };

  const hasActiveFilter =
    activeCategory || hasImageFilter !== null || activeGender || activeHometown || activeLocation || sortBy !== "newest";

  // ── Swipe navigation ──────────────────────────────────────────────────────
  // Both pages always rendered side-by-side; translateX drives which is visible.
  // No state update during the animation = zero flicker.
  const modeRef = useRef("Posts");
  const translateX = useRef(new Animated.Value(0)).current;

  const snapTo = (toValue) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
      overshootClamping: true,
    }).start();
  };

  const switchToMode = (newMode) => {
    if (modeRef.current === newMode) return;
    modeRef.current = newMode;
    setMode(newMode);
    snapTo(newMode === "Meetups" ? -width : 0);
  };

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        const base = modeRef.current === "Posts" ? 0 : -width;
        const next = base + dx;
        if (next > 0) translateX.setValue(next * 0.15);
        else if (next < -width) translateX.setValue(-width + (next + width) * 0.15);
        else translateX.setValue(next);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const cur = modeRef.current;
        if (cur === "Posts" && (dx < -(width * 0.3) || vx < -0.5)) {
          modeRef.current = "Meetups";
          setMode("Meetups");
          snapTo(-width);
        } else if (cur === "Meetups" && (dx > width * 0.3 || vx > 0.5)) {
          modeRef.current = "Posts";
          setMode("Posts");
          snapTo(0);
        } else {
          snapTo(cur === "Posts" ? 0 : -width);
        }
      },
      onPanResponderTerminate: () => snapTo(modeRef.current === "Posts" ? 0 : -width),
    })
  ).current;

  return (
    <ScreenShell
      navigation={navigation}
      routeName="Home"
      title={null}
      noPadding
      background={COLORS.paper}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.screenContent}
      stickyHeaderIndices={[0]}
    >
      {/* ── CHILD 0: Sticky header ── */}
      <View style={styles.stickyBar}>
        {/* Tab row */}
        <View style={styles.tabRow}>
          {["Posts", "Meetups"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => switchToMode(tab)}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.tabLabel, mode === tab && styles.tabLabelActive]}>{tab}</Text>
              {mode === tab && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {/* Search + filter — mode-aware */}
        {mode === "Posts" ? (
          <View style={styles.searchRow}>
            <Pressable
              style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}
              onPress={() => searchInputRef.current?.focus()}
            >
              <MaterialIcons name="search" size={17} color={searchFocused ? COLORS.accentBlue : COLORS.inkMuted} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search posts..."
                placeholderTextColor={COLORS.inkMuted}
                value={searchText}
                onChangeText={onSearchChange}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                returnKeyType="search"
                onSubmitEditing={() => applyFilters()}
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => { setSearchText(""); onSearchChange(""); }} hitSlop={8}>
                  <MaterialIcons name="close" size={15} color={COLORS.inkMuted} />
                </Pressable>
              )}
            </Pressable>
            <Pressable
              style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
              onPress={() => setIsFilterModalVisible(true)}
            >
              <MaterialIcons name="tune" size={17} color={hasActiveFilter ? COLORS.white : COLORS.inkMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.searchRow}>
              <Pressable
                style={[styles.searchBox, meetupSearchFocused && styles.searchBoxFocused]}
                onPress={() => meetupSearchRef.current?.focus()}
              >
                <MaterialIcons name="search" size={17} color={meetupSearchFocused ? COLORS.accentBlue : COLORS.inkMuted} />
                <TextInput
                  ref={meetupSearchRef}
                  style={styles.searchInput}
                  placeholder="Search meetups..."
                  placeholderTextColor={COLORS.inkMuted}
                  value={meetupSearch}
                  onChangeText={setMeetupSearch}
                  onFocus={() => setMeetupSearchFocused(true)}
                  onBlur={() => setMeetupSearchFocused(false)}
                  returnKeyType="search"
                />
                {meetupSearch.length > 0 && (
                  <Pressable onPress={() => setMeetupSearch("")} hitSlop={8}>
                    <MaterialIcons name="close" size={15} color={COLORS.inkMuted} />
                  </Pressable>
                )}
              </Pressable>
            </View>

            <View style={styles.meetupFilterRow}>
              {["upcoming", "completed", "all"].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setMeetupSubTab(tab)}
                  style={[styles.meetupTabPill, meetupSubTab === tab && styles.meetupTabPillActive]}
                >
                  <Text style={[styles.meetupTabPillText, meetupSubTab === tab && styles.meetupTabPillTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
              <View style={{ flex: 1 }} />
              <Pressable
                style={[styles.filterBtn, meetupDateFilter && styles.filterBtnActive]}
                onPress={() => setShowMeetupDatePicker(true)}
              >
                <MaterialIcons name="calendar-month" size={17} color={meetupDateFilter ? COLORS.white : COLORS.inkMuted} />
              </Pressable>
            </View>

            {meetupDateFilter && (
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <MaterialIcons name="calendar-today" size={11} color={COLORS.accentBlue} />
                  <Text style={styles.chipText}>
                    {meetupDateFilter.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </Text>
                  <Pressable onPress={() => setMeetupDateFilter(null)} hitSlop={8}>
                    <MaterialIcons name="close" size={13} color={COLORS.inkMuted} />
                  </Pressable>
                </View>
              </View>
            )}

            {showMeetupDatePicker && (
              Platform.OS === "ios" ? (
                <Modal transparent animationType="fade" visible>
                  <Pressable style={styles.datePickerOverlay} onPress={() => setShowMeetupDatePicker(false)}>
                    <Pressable style={styles.datePickerSheet}>
                      <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>Pick a date</Text>
                        <Pressable onPress={() => setShowMeetupDatePicker(false)}>
                          <Text style={styles.datePickerDone}>Done</Text>
                        </Pressable>
                      </View>
                      <DateTimePicker
                        value={meetupDateFilter || new Date()}
                        mode="date"
                        display="inline"
                        onChange={(_, d) => { if (d) setMeetupDateFilter(d); }}
                        themeVariant="light"
                      />
                    </Pressable>
                  </Pressable>
                </Modal>
              ) : (
                <DateTimePicker
                  value={meetupDateFilter || new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, d) => {
                    setShowMeetupDatePicker(false);
                    if (e.type === "set" && d) setMeetupDateFilter(d);
                  }}
                />
              )
            )}
          </>
        )}
      </View>

      {/* ── CHILD 1: Swipeable pager — both pages always rendered ── */}
      <View style={{ overflow: "hidden" }} {...swipePan.panHandlers}>
        <Animated.View style={{ flexDirection: "row", width: width * 2, transform: [{ translateX }] }}>

          {/* ══ PAGE 0: POSTS ══ */}
          <View style={{ width, minHeight: screenHeight }}>
            {/* Meetups carousel */}
            {carouselMeetups.length > 0 && (
              <View style={styles.carouselSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Meetups</Text>
                  <Pressable onPress={() => switchToMode("Meetups")} hitSlop={12}>
                    <Text style={styles.seeAll}>See all →</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled
                  contentContainerStyle={styles.carouselScroll}
                >
                  {carouselMeetups.map((m) => {
                    const serverBase = getServerBaseUrl();
                    const imgSrc = m.imageUri
                      ? { uri: m.imageUri.startsWith("http") ? m.imageUri : `${serverBase}${m.imageUri}` }
                      : DEFAULT_MEETUP_IMG;
                    const isMember = m.members?.some((mb) => (mb._id || mb) === user?._id);
                    const isCreator = (m.user?._id || m.user) === user?._id;
                    const spotsLeft = m.maxMembers - (m.members?.length || 0);
                    return (
                      <View key={m._id} style={styles.carouselCard}>
                        <Image source={imgSrc} style={styles.carouselImg} />
                        <View style={styles.carouselBody}>
                          <Text style={styles.carouselDate}>
                            {formatMeetupDate(m.date)} · {formatMeetupTime(m.time)}
                          </Text>
                          <Text style={styles.carouselTitle} numberOfLines={2}>{m.title}</Text>
                          {m.hometown ? (
                            <View style={styles.carouselHometown}>
                              <MaterialIcons name="home" size={9} color={COLORS.accent} />
                              <Text style={styles.carouselHometownText}>For {m.hometown}</Text>
                            </View>
                          ) : null}
                          <View style={styles.carouselFooter}>
                            <View style={styles.carouselSpots}>
                              <MaterialIcons name="people" size={10} color={COLORS.inkMuted} />
                              <Text style={styles.carouselSpotsText}>
                                {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
                              </Text>
                            </View>
                            {isCreator ? (
                              <View style={[styles.carouselRsvp, { backgroundColor: COLORS.paperDark }]}>
                                <Text style={[styles.carouselRsvpText, { color: COLORS.ink }]}>YOURS</Text>
                              </View>
                            ) : isMember ? (
                              <View style={[styles.carouselRsvp, { backgroundColor: COLORS.accentMint }]}>
                                <Text style={styles.carouselRsvpText}>JOINED</Text>
                              </View>
                            ) : (
                              <Pressable
                                style={[styles.carouselRsvp, { backgroundColor: COLORS.accent }]}
                                onPress={() => handleRsvp(m._id)}
                              >
                                <Text style={styles.carouselRsvpText}>RSVP</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Posts feed */}
            <View style={styles.feedSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Feed</Text>
              </View>
              {isLoading ? (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" color={COLORS.accent} />
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : posts.length === 0 ? (
                <View style={styles.emptyFeed}>
                  <MaterialIcons name="dynamic-feed" size={36} color={COLORS.border} />
                  <Text style={styles.emptyFeedTitle}>Nothing here yet</Text>
                  <Text style={styles.emptyFeedSub}>Posts from your city will show up here.</Text>
                </View>
              ) : (
                posts.map((post, idx) => {
                  const theme = getCategoryTheme(post.category);
                  return (
                    <View key={post._id || idx} style={styles.postCard}>
                      <View style={styles.postHeader}>
                        <Image
                          source={{ uri: post.user?.profileImageUri || "https://via.placeholder.com/150" }}
                          style={styles.postAvatar}
                        />
                        <View style={styles.postAuthorCol}>
                          <Text style={styles.postAuthorName} numberOfLines={1}>
                            {post.user?.fullName || "Unknown User"}
                          </Text>
                          <Text style={styles.postTime}>{getRelativeTime(post.createdAt)}</Text>
                        </View>
                        <Pressable
                          onPress={() => handleSendConnectionRequest(post.user)}
                          disabled={post.user?._id === user?._id || !!requestingUsers[post.user?._id]}
                          style={[
                            styles.connectBtn,
                            connectedUsers[post.user?._id] && styles.connectBtnConnected,
                            requestedUsers[post.user?._id] && styles.connectBtnSent,
                            post.user?._id === user?._id && styles.connectBtnDisabled,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              requestingUsers[post.user?._id] ? "hourglass-top"
                              : connectedUsers[post.user?._id] ? "person-remove-alt-1"
                              : requestedUsers[post.user?._id] ? "check"
                              : "person-add-alt-1"
                            }
                            size={16}
                            color={
                              connectedUsers[post.user?._id] ? COLORS.accent
                              : requestedUsers[post.user?._id] ? COLORS.accentMint
                              : COLORS.accentBlue
                            }
                          />
                        </Pressable>
                      </View>

                      <View style={[styles.categoryPill, { backgroundColor: theme.bg }]}>
                        <Text style={[styles.categoryPillText, { color: theme.color }]}>
                          {(post.category || "General").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <Text style={styles.postBody} numberOfLines={expandedPosts[post._id] ? undefined : 4}>
                        {post.details}
                      </Text>
                      {post.details && post.details.length > 120 && (
                        <Pressable onPress={() => toggleExpand(post._id)} hitSlop={10}>
                          <Text style={styles.readMoreText}>
                            {expandedPosts[post._id] ? "Show less" : "Read more"}
                          </Text>
                        </Pressable>
                      )}
                      {post.imageUri && (
                        <View style={styles.postImgWrap}>
                          <Image source={{ uri: post.imageUri }} style={styles.postImg} />
                        </View>
                      )}
                      <View style={styles.postActions}>
                        <Pressable style={styles.actionBtn} onPress={() => handleToggleLike(post._id)}>
                          <MaterialIcons
                            name={post.likes?.includes(user?._id) ? "thumb-up" : "thumb-up-off-alt"}
                            size={19}
                            color={post.likes?.includes(user?._id) ? COLORS.accent : COLORS.inkMuted}
                          />
                          <Text style={[styles.actionCount, post.likes?.includes(user?._id) && { color: COLORS.accent }]}>
                            {post.likes?.length || 0}
                          </Text>
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => handleToggleDislike(post._id)}>
                          <MaterialIcons
                            name={post.dislikes?.includes(user?._id) ? "thumb-down" : "thumb-down-off-alt"}
                            size={19}
                            color={post.dislikes?.includes(user?._id) ? COLORS.accentBlue : COLORS.inkMuted}
                          />
                          <Text style={[styles.actionCount, post.dislikes?.includes(user?._id) && { color: COLORS.accentBlue }]}>
                            {post.dislikes?.length || 0}
                          </Text>
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => setActiveCommentPostId(post._id)}>
                          <MaterialIcons name="chat-bubble-outline" size={19} color={COLORS.inkMuted} />
                          <Text style={styles.actionCount}>{post.comments || 0}</Text>
                        </Pressable>
                        <View style={{ flex: 1 }} />
                        <Pressable onPress={() => handleToggleBookmark(post._id)} hitSlop={8}>
                          <MaterialIcons
                            name={post.savedBy?.includes(user?._id) ? "bookmark" : "bookmark-border"}
                            size={21}
                            color={post.savedBy?.includes(user?._id) ? COLORS.accentBlue : COLORS.inkMuted}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
          {/* ══ end posts page ══ */}

          {/* ══ PAGE 1: MEETUPS ══ */}
          <View style={{ width, minHeight: screenHeight, paddingBottom: 120 }}>
            {meetupsLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accentBlue} size="large" />
            ) : meetups.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons
                    name={meetupSearch || meetupDateFilter ? "search-off" : "event-busy"}
                    size={30}
                    color={COLORS.accentBlue}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {meetupSearch || meetupDateFilter ? "No matches" : "No meetups yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {meetupSearch || meetupDateFilter
                    ? "Try a different search or clear the date filter."
                    : "Be the first to create one — go to the Post tab."}
                </Text>
                {(meetupSearch || meetupDateFilter) && (
                  <Pressable
                    style={styles.clearBtn}
                    onPress={() => { setMeetupSearch(""); setMeetupDateFilter(null); }}
                  >
                    <Text style={styles.clearBtnText}>Clear filters</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              meetups.map((m) => {
                const isMember = m.members?.some((mb) => (mb._id || mb) === user?._id);
                const isCreator = (m.user?._id || m.user) === user?._id;
                const isFull = m.members?.length >= m.maxMembers;
                const spotsLeft = m.maxMembers - (m.members?.length || 0);
                const serverBase = getServerBaseUrl();
                const imgSrc = m.imageUri
                  ? { uri: m.imageUri.startsWith("http") ? m.imageUri : `${serverBase}${m.imageUri}` }
                  : DEFAULT_MEETUP_IMG;
                return (
                  <View key={m._id} style={styles.meetCard}>
                    <View style={styles.meetImgWrap}>
                      <Image source={imgSrc} style={styles.meetImg} />
                      <View style={styles.datePill}>
                        <Text style={styles.datePillText}>{formatMeetupDate(m.date)}</Text>
                      </View>
                      <View style={styles.spotsBadge}>
                        <MaterialIcons name="people" size={10} color={COLORS.ink} />
                        <Text style={styles.spotsText}>{spotsLeft > 0 ? `${spotsLeft} left` : "Full"}</Text>
                      </View>
                    </View>
                    <View style={styles.meetBody}>
                      <View style={styles.meetTimeRow}>
                        <Text style={styles.meetTime}>{formatMeetupTime(m.time)}</Text>
                        {m.hometown ? (
                          <View style={styles.hometownChip}>
                            <MaterialIcons name="home" size={10} color={COLORS.accent} />
                            <Text style={styles.hometownChipText}>For {m.hometown} folks</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.meetTitle} numberOfLines={2}>{m.title}</Text>
                      {m.details ? (
                        <View>
                          <Text
                            style={styles.meetDesc}
                            numberOfLines={expandedMeetupDescs[m._id] ? undefined : 2}
                          >
                            {m.details}
                          </Text>
                          {m.details.length > 80 && (
                            <Pressable
                              onPress={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setExpandedMeetupDescs((prev) => ({ ...prev, [m._id]: !prev[m._id] }));
                              }}
                              hitSlop={8}
                            >
                              <Text style={styles.meetReadMore}>
                                {expandedMeetupDescs[m._id] ? "Show less" : "Read more"}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      ) : null}
                      {(m.venue || m.meetupLocation || m.location) ? (
                        <View style={styles.meetLocRow}>
                          <MaterialIcons name="location-on" size={12} color={COLORS.accentBlue} />
                          <Text style={styles.meetLocText} numberOfLines={1}>
                            {[m.venue, m.meetupLocation || m.location].filter(Boolean).join(", ")}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.meetFooter}>
                        <View style={styles.meetMembersRow}>
                          <MaterialIcons name="group" size={13} color={COLORS.inkMuted} />
                          <Text style={styles.meetMembersText}>{m.members?.length || 0}/{m.maxMembers}</Text>
                        </View>
                        {isCreator ? (
                          <View style={[styles.rsvpBtn, { backgroundColor: COLORS.paperDark }]}>
                            <Text style={[styles.rsvpBtnText, { color: COLORS.ink }]}>YOUR MEETUP</Text>
                          </View>
                        ) : isMember ? (
                          <Pressable
                            style={[styles.rsvpBtn, { backgroundColor: COLORS.accentMint }]}
                            onPress={() => handleLeaveMeetup(m._id)}
                          >
                            <Text style={styles.rsvpBtnText}>JOINED ✓</Text>
                          </Pressable>
                        ) : isFull ? (
                          <View style={[styles.rsvpBtn, { backgroundColor: COLORS.border }]}>
                            <Text style={[styles.rsvpBtnText, { color: COLORS.inkMuted }]}>FULL</Text>
                          </View>
                        ) : (
                          <Pressable
                            style={[styles.rsvpBtn, { backgroundColor: COLORS.accent }]}
                            onPress={() => handleRsvp(m._id)}
                          >
                            <Text style={styles.rsvpBtnText}>RSVP NOW</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
          {/* ══ end meetups page ══ */}

        </Animated.View>
      </View>

      <CommentsSheet
        visible={!!activeCommentPostId}
        postId={activeCommentPostId}
        onClose={() => setActiveCommentPostId(null)}
      />
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={applyFilters}
        initialFilters={{
          sortBy,
          category: activeCategory,
          hasImage: hasImageFilter,
          gender: activeGender,
          hometown: activeHometown,
          location: activeLocation,
        }}
      />
      <ProfileCompletionGateModal
        visible={showProfileGateModal}
        onClose={() => setShowProfileGateModal(false)}
        onCompleteProfile={() => {
          setShowProfileGateModal(false);
          navigation.navigate("Account");
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 120,
  },

  /* ── STICKY BAR ── */
  stickyBar: {
    backgroundColor: COLORS.paper,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tab: {
    marginRight: 16,
    paddingBottom: 6,
    position: "relative",
    alignItems: "flex-start",
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.inkMuted,
  },
  tabLabelActive: {
    color: COLORS.ink,
    fontWeight: "800",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accent,
    borderRadius: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  searchBox: {
    flex: 1,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.paperDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBoxFocused: {
    borderColor: COLORS.accentBlue,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    padding: 0,
    fontWeight: "500",
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.paperDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  meetupFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 8,
  },
  meetupTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.paperDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  meetupTabPillActive: {
    backgroundColor: COLORS.ink,
    borderColor: COLORS.ink,
  },
  meetupTabPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.inkMuted,
    letterSpacing: 0.2,
  },
  meetupTabPillTextActive: {
    color: COLORS.white,
    fontWeight: "800",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.tagBlue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accentBlue,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  datePickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ink,
  },
  datePickerDone: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.accentBlue,
  },

  /* ── SECTION HEADERS ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.inkLight,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accentBlue,
  },

  /* ── MEETUP CAROUSEL ── */
  carouselSection: {
    marginBottom: 4,
  },
  carouselScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 12,
  },
  carouselCard: {
    width: 176,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  carouselImg: { width: "100%", height: 88 },
  carouselBody: { padding: 10 },
  carouselDate: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.accent,
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  carouselTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.ink,
    lineHeight: 17,
    marginBottom: 4,
  },
  carouselHometown: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    backgroundColor: COLORS.accent + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6,
  },
  carouselHometownText: { fontSize: 9, fontWeight: "700", color: COLORS.accent },
  carouselFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  carouselSpots: { flexDirection: "row", alignItems: "center", gap: 3 },
  carouselSpotsText: { fontSize: 10, fontWeight: "600", color: COLORS.inkMuted },
  carouselRsvp: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  carouselRsvpText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },

  /* ── POSTS FEED ── */
  feedSection: { paddingTop: 4, paddingBottom: 48 },
  postCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  postAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  postAuthorCol: { flex: 1 },
  postAuthorName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.inkMuted,
    fontWeight: "500",
    marginTop: 3,
  },
  connectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.tagBlue,
    borderWidth: 1.5,
    borderColor: "#c9d8ff",
    flexShrink: 0,
  },
  connectBtnSent: { backgroundColor: "#e6f7ef", borderColor: "#c4ead7" },
  connectBtnConnected: { backgroundColor: "#fff0ed", borderColor: "#f4c4b8" },
  connectBtnDisabled: { opacity: 0.35 },
  categoryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  categoryPillText: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  postTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.ink,
    lineHeight: 26,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  postBody: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.inkLight,
    marginBottom: 6,
    fontWeight: "400",
  },
  readMoreText: {
    color: COLORS.accentBlue,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  postImgWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
  },
  postImg: { width: "100%", height: "100%" },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.paperDark,
    marginTop: 8,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionCount: { fontSize: 14, fontWeight: "700", color: COLORS.inkMuted },
  errorText: { textAlign: "center", marginTop: 20, color: COLORS.inkMuted, paddingHorizontal: 20 },
  emptyFeed: { alignItems: "center", marginTop: 48, gap: 10, paddingHorizontal: 40 },
  emptyFeedTitle: { fontSize: 16, fontWeight: "800", color: COLORS.inkMuted, letterSpacing: -0.2 },
  emptyFeedSub: { fontSize: 13, color: COLORS.inkMuted, fontWeight: "500", textAlign: "center", lineHeight: 19 },

  /* ── MEETUP CARDS ── */
  emptyState: {
    margin: 20,
    padding: 28,
    borderRadius: 16,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: 10,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.tagBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "900", color: COLORS.ink, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, lineHeight: 19, color: COLORS.inkMuted, fontWeight: "500", textAlign: "center" },
  clearBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.accentBlue },
  clearBtnText: { fontSize: 12, fontWeight: "800", color: COLORS.white, letterSpacing: 0.3 },
  meetCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  meetImgWrap: { height: 148, position: "relative" },
  meetImg: { width: "100%", height: "100%" },
  datePill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  datePillText: { fontSize: 9, fontWeight: "900", color: COLORS.white, letterSpacing: 1 },
  spotsBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spotsText: { fontSize: 10, fontWeight: "800", color: COLORS.ink },
  meetBody: { padding: 14 },
  meetTimeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  meetTime: { fontSize: 11, fontWeight: "800", color: COLORS.inkMuted, letterSpacing: 0.8, textTransform: "uppercase" },
  hometownChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.accent + "15",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hometownChipText: { fontSize: 10, fontWeight: "700", color: COLORS.accent },
  meetTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink, lineHeight: 22, marginBottom: 4, letterSpacing: -0.3 },
  meetDesc: { fontSize: 13, color: COLORS.inkMuted, lineHeight: 18, marginBottom: 2 },
  meetReadMore: { fontSize: 11, fontWeight: "800", color: COLORS.accentBlue, marginBottom: 8, marginTop: 2 },
  meetLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: COLORS.tagBlue,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    alignSelf: "flex-start",
  },
  meetLocText: { fontSize: 12, color: COLORS.accentBlue, fontWeight: "700" },
  meetFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meetMembersRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meetMembersText: { fontSize: 12, fontWeight: "700", color: COLORS.inkMuted },
  rsvpBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, alignItems: "center" },
  rsvpBtnText: { fontSize: 10, fontWeight: "900", color: COLORS.white, letterSpacing: 1.5 },
});
