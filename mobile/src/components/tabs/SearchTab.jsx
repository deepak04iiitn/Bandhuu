import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Pressable,
  FlatList, ActivityIndicator, Animated, TextInput, Modal,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenShell } from "./TabShared";
import SearchInput from "../search/SearchInput";
import SearchResultItem from "../search/SearchResultItem";
import SearchEmptyState from "../search/SearchEmptyState";
import { searchUsers, sendConnectionRequest, removeConnection, respondToConnectionRequest } from "../../services/users/userService";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import ProfileCompletionGateModal, { isProfileCompleteForConnections } from "../common/ProfileCompletionGateModal";

const C = {
  bg:          "#F5F0EB",
  surface:     "#FEFCFA",
  inputBg:     "#F2EDE6",
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
  catHousing:  "#3B6CA8", catHousingBg: "#EEF3FC",
  catTravel:   "#1A7A5E", catTravelBg:  "#E8F5F1",
};

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

const PALETTE = [
  { bg: "#FDF0EA", text: "#C84B0C" },
  { bg: "#EEF3FC", text: "#3B6CA8" },
  { bg: "#E8F5F1", text: "#1A7A5E" },
  { bg: "#FDEEF3", text: "#B83055" },
  { bg: "#F3EEFE", text: "#7040B8" },
];
const getPalette = (name) => PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length];

// ─── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  const anim = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View style={[s.skelRow, { opacity: anim }]}>
      <View style={s.skelAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[s.skelLine, { width: "55%" }]} />
        <View style={[s.skelLine, { width: "38%" }]} />
      </View>
      <View style={[s.skelLine, { width: 72, height: 28, borderRadius: 14 }]} />
    </Animated.View>
  );
}

// ─── Person card (portrait, for discover strips) ───────────────────────────────
function PersonCard({ user, onPress, onConnect, connectingId }) {
  const pal     = getPalette(user.fullName);
  const status  = user.connectionStatus;
  const isMe    = connectingId === user._id;
  const city    = user.city || user.location?.split(",")[0]?.trim();
  const hometown= user.hometownCity || user.hometown;

  const connectLabel = isMe ? "···" : status === "connected" ? "✓ Added" : status === "request_sent" ? "Sent" : "+ Connect";
  const connectActive = status === "connected";
  const connectSent   = status === "request_sent";

  return (
    <Pressable style={s.personCard} onPress={() => onPress(user)} activeOpacity={0.8}>
      <View style={[s.personAvatarWrap, { backgroundColor: pal.bg }]}>
        {user.profileImageUri
          ? <Image source={{ uri: user.profileImageUri }} style={s.personAvatar} />
          : <Text style={[s.personInitial, { color: pal.text }]}>{(user.fullName || "?")[0].toUpperCase()}</Text>
        }
      </View>
      <Text style={s.personName} numberOfLines={1}>{(user.fullName || "").split(" ")[0]}</Text>
      {hometown ? (
        <View style={s.personHometown}>
          <View style={s.journeyDot} />
          <Text style={s.personHometownTxt} numberOfLines={1}>{hometown}</Text>
        </View>
      ) : null}
      <Pressable
        style={[s.personConnectBtn, connectActive && s.personConnectBtnDone, connectSent && s.personConnectBtnSent]}
        onPress={(e) => { e.stopPropagation?.(); onConnect(user); }}
        disabled={isMe || connectActive}
      >
        <Text style={[s.personConnectTxt, connectActive && s.personConnectTxtDone, connectSent && s.personConnectTxtSent]}>
          {connectLabel}
        </Text>
      </Pressable>
    </Pressable>
  );
}

// ─── Hometown circle banner ────────────────────────────────────────────────────
function HometownBanner({ users, hometown, onFindThem, onConnect, connectingId }) {
  if (!users.length || !hometown) return null;
  const faceCount = Math.min(users.length, 3);
  const extra     = users.length - faceCount;
  return (
    <Pressable style={s.hometownBanner} onPress={onFindThem} activeOpacity={0.85}>
      <View style={s.hometownBannerLeft} />
      <View style={s.hometownBannerContent}>
        <View style={s.hometownBannerTop}>
          <View style={s.facepile}>
            {users.slice(0, faceCount).map((u, i) => {
              const pal = getPalette(u.fullName);
              return (
                <View key={u._id} style={[s.facepileItem, { marginLeft: i === 0 ? 0 : -9, zIndex: faceCount - i }]}>
                  {u.profileImageUri
                    ? <Image source={{ uri: u.profileImageUri }} style={s.facepileImg} />
                    : <View style={[s.facepileImg, { backgroundColor: pal.bg, alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 10, fontWeight: "900", color: pal.text }}>{(u.fullName || "?")[0]}</Text>
                      </View>
                  }
                </View>
              );
            })}
            {extra > 0 && (
              <View style={[s.facepileItem, s.facepileExtra, { marginLeft: -9 }]}>
                <Text style={s.facepileExtraTxt}>+{extra}</Text>
              </View>
            )}
          </View>
          <Text style={s.hometownBannerCount}>{users.length} people</Text>
        </View>
        <Text style={s.hometownBannerTitle}>
          From <Text style={{ color: C.terra }}>{hometown}</Text>, in your city
        </Text>
        <Text style={s.hometownBannerSub}>Your hometown circle is here. Start connecting.</Text>
      </View>
      <View style={s.hometownBannerArrow}>
        <MaterialIcons name="chevron-right" size={20} color={C.terra} />
      </View>
    </Pressable>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, action, onAction }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionLabel}>{label}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={s.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Filter bottom sheet ──────────────────────────────────────────────────────
function FilterSheet({ visible, onClose, onApply, initial }) {
  const [hometown, setHometown] = useState(initial.hometown || "");
  const [city, setCity]         = useState(initial.city     || "");
  const [gender, setGender]     = useState(initial.gender   || "");
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }),
      Animated.spring(slide, { toValue: visible ? 0 : 300, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible && slide._value >= 300) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFillObject, s.filterOverlay, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={s.filterOuter} pointerEvents="box-none">
        <Animated.View style={[s.filterSheet, { transform: [{ translateY: slide }] }]}>
          <View style={s.filterHandle} />
          <View style={s.filterHeader}>
            <Pressable onPress={onClose} style={s.filterCloseBtn} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={C.inkMuted} />
            </Pressable>
            <Text style={s.filterTitle}>Filter People</Text>
            <Pressable onPress={() => { setHometown(""); setCity(""); setGender(""); }} hitSlop={10}>
              <Text style={s.filterReset}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
            <Text style={s.filterSectionLabel}>HOMETOWN CITY</Text>
            <View style={[s.filterInput]}>
              <MaterialIcons name="home" size={15} color={C.inkMuted} />
              <TextInput style={s.filterInputText} placeholder="e.g. Patna, Lucknow"
                placeholderTextColor={C.inkMuted} value={hometown} onChangeText={setHometown} />
            </View>

            <Text style={[s.filterSectionLabel, { marginTop: 20 }]}>CURRENT CITY</Text>
            <View style={s.filterInput}>
              <MaterialIcons name="location-on" size={15} color={C.inkMuted} />
              <TextInput style={s.filterInputText} placeholder="e.g. Bengaluru, Mumbai"
                placeholderTextColor={C.inkMuted} value={city} onChangeText={setCity} />
            </View>

            <Text style={[s.filterSectionLabel, { marginTop: 20 }]}>GENDER</Text>
            <View style={s.filterChips}>
              {["Male", "Female", "Other"].map(g => (
                <Pressable
                  key={g}
                  style={[s.filterChip, gender === g && { backgroundColor: C.terra, borderColor: C.terra }]}
                  onPress={() => setGender(gender === g ? "" : g)}
                >
                  <Text style={[s.filterChipTxt, gender === g && { color: C.white }]}>{g}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={s.filterFooter}>
            <Pressable style={s.filterApplyBtn} onPress={() => { onApply({ hometown, city, gender }); onClose(); }}>
              <Text style={s.filterApplyTxt}>Apply Filters</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SearchTab({ navigation }) {
  const { user }         = useAuth();
  const { showSnackbar } = useSnackbar();

  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters]             = useState({});
  const [profileGate, setProfileGate]     = useState(false);

  // discover data
  const [hometownUsers, setHometownUsers] = useState([]);
  const [cityUsers, setCityUsers]         = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // per-user connection state
  const [connectingId, setConnectingId]   = useState(null);

  const debounceRef = useRef(null);
  const hasFilter   = !!(filters.hometown || filters.city || filters.gender);
  const isSearching = query.trim().length > 0 || hasFilter;

  // ── load discover data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;
    const hometown = user.hometown || user.hometownCity;
    const city     = user.location?.split(",")[0]?.trim() || user.city;
    if (!hometown && !city) return;

    setDiscoverLoading(true);
    Promise.all([
      hometown ? searchUsers("", 1, 10, { hometown }) : Promise.resolve({ users: [] }),
      city     ? searchUsers("", 1, 8,  { city })     : Promise.resolve({ users: [] }),
    ]).then(([hResult, cResult]) => {
      setHometownUsers(hResult.users || []);
      setCityUsers(cResult.users || []);
      setDiscoverLoading(false);
    });
  }, [user?._id]);

  // ── search with debounce ────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() && !hasFilter) {
      setResults([]); setTotal(0); setHasMore(false); setPage(1); setIsLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setIsLoading(true); setPage(1);
      performSearch(query, 1, filters);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, filters]);

  const performSearch = async (q, p, f = {}) => {
    const data = await searchUsers(q, p, 10, f);
    if (p === 1) setResults(data.users || []);
    else setResults(prev => [...prev, ...(data.users || [])]);
    setTotal(data.total || 0);
    setHasMore(data.hasMore || false);
    setIsLoading(false);
    setIsMoreLoading(false);
  };

  const loadMore = () => {
    if (hasMore && !isMoreLoading) {
      setIsMoreLoading(true);
      const next = page + 1;
      setPage(next);
      performSearch(query, next, filters);
    }
  };

  // ── connection handler ──────────────────────────────────────────────────
  const handleConnect = useCallback(async (targetUser) => {
    if (!targetUser?._id || connectingId) return;
    if (!isProfileCompleteForConnections(user)) { setProfileGate(true); return; }

    const tid = targetUser._id;
    setConnectingId(tid);

    const updateStatus = (newStatus) => {
      const update = (list) => list.map(u => u._id === tid ? { ...u, connectionStatus: newStatus } : u);
      setResults(update);
      setHometownUsers(update);
      setCityUsers(update);
    };

    const curStatus = targetUser.connectionStatus;
    let result;
    if (curStatus === "connected") {
      result = await removeConnection(tid);
      if (result.success) { updateStatus("none"); showSnackbar("Connection removed.", "success"); }
    } else if (curStatus === "request_received") {
      result = await respondToConnectionRequest(tid, "accept");
      if (result.success) { updateStatus("connected"); showSnackbar("Connection accepted.", "success"); }
    } else if (curStatus === "none" || !curStatus) {
      result = await sendConnectionRequest(tid);
      if (result.success) { updateStatus("request_sent"); showSnackbar("Connection request sent.", "success"); }
    } else {
      result = { success: false, message: "Request already sent." };
    }

    if (!result?.success) showSnackbar(result?.message || "Unable to perform action", "error");
    setConnectingId(null);
  }, [user, connectingId]);

  const handleUserPress = useCallback(
    (u) => navigation.navigate("UserProfile", { username: u.username }),
    [navigation]
  );

  const handleFindHometown = () => {
    const hometown = user?.hometown || user?.hometownCity;
    if (hometown) { setQuery(hometown); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <ScreenShell
        navigation={navigation}
        routeName="Search"
        noPadding
        background={C.bg}
        contentContainerStyle={s.screenContent}
        stickyHeaderIndices={[0]}
      >
        {/* ── Sticky header ── */}
        <View style={s.stickyHeader}>
          <View style={s.searchRow}>
            <SearchInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, city or hometown…"
            />
            <Pressable
              style={[s.filterBtn, hasFilter && s.filterBtnActive]}
              onPress={() => setFilterVisible(true)}
            >
              <MaterialIcons name="tune" size={18} color={hasFilter ? C.white : C.inkMuted} />
            </Pressable>
          </View>
          {hasFilter && (
            <View style={s.activeFilters}>
              {filters.hometown && (
                <View style={s.filterTag}>
                  <MaterialIcons name="home" size={10} color={C.terra} />
                  <Text style={s.filterTagTxt}>{filters.hometown}</Text>
                  <Pressable onPress={() => setFilters(f => ({ ...f, hometown: "" }))} hitSlop={8}>
                    <MaterialIcons name="close" size={12} color={C.inkMuted} />
                  </Pressable>
                </View>
              )}
              {filters.city && (
                <View style={s.filterTag}>
                  <MaterialIcons name="location-on" size={10} color={C.catHousing} />
                  <Text style={[s.filterTagTxt, { color: C.catHousing }]}>{filters.city}</Text>
                  <Pressable onPress={() => setFilters(f => ({ ...f, city: "" }))} hitSlop={8}>
                    <MaterialIcons name="close" size={12} color={C.inkMuted} />
                  </Pressable>
                </View>
              )}
              {filters.gender && (
                <View style={s.filterTag}>
                  <Text style={s.filterTagTxt}>{filters.gender}</Text>
                  <Pressable onPress={() => setFilters(f => ({ ...f, gender: "" }))} hitSlop={8}>
                    <MaterialIcons name="close" size={12} color={C.inkMuted} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Discover mode ── */}
        {!isSearching && (
          <View style={s.discoverWrap}>
            {discoverLoading ? (
              <View style={{ gap: 0 }}>
                {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
              </View>
            ) : (
              <>
                {/* Hometown circle banner */}
                <HometownBanner
                  users={hometownUsers}
                  hometown={user?.hometown || user?.hometownCity}
                  onFindThem={handleFindHometown}
                  onConnect={handleConnect}
                  connectingId={connectingId}
                />

                {/* From your hometown strip */}
                {hometownUsers.length > 0 && (
                  <View>
                    <SectionHeader label="FROM YOUR HOMETOWN" action="See all" onAction={handleFindHometown} />
                    <ScrollView
                      horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.strip} nestedScrollEnabled
                    >
                      {hometownUsers.slice(0, 8).map(u => (
                        <PersonCard
                          key={u._id} user={u}
                          onPress={handleUserPress} onConnect={handleConnect}
                          connectingId={connectingId}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Active in your city */}
                {cityUsers.length > 0 && (
                  <View>
                    <SectionHeader label="ACTIVE IN YOUR CITY" />
                    <ScrollView
                      horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={s.strip} nestedScrollEnabled
                    >
                      {cityUsers.slice(0, 8).map(u => (
                        <PersonCard
                          key={u._id} user={u}
                          onPress={handleUserPress} onConnect={handleConnect}
                          connectingId={connectingId}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Empty discover */}
                {!discoverLoading && hometownUsers.length === 0 && cityUsers.length === 0 && (
                  <SearchEmptyState query="" />
                )}
              </>
            )}
          </View>
        )}

        {/* ── Search / filter results ── */}
        {isSearching && (
          <View style={s.resultsWrap}>
            {total > 0 && !isLoading && (
              <Text style={s.resultCount}>{total} {total === 1 ? "person" : "people"} found</Text>
            )}

            {isLoading ? (
              <View>
                {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
              </View>
            ) : results.length > 0 ? (
              <>
                <View style={s.resultsCard}>
                  <FlatList
                    data={results}
                    keyExtractor={item => item._id}
                    renderItem={({ item, index }) => (
                      <SearchResultItem
                        user={item}
                        onPress={handleUserPress}
                        onConnect={handleConnect}
                        isLast={index === results.length - 1}
                        connectingId={connectingId}
                      />
                    )}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
                {hasMore && (
                  <Pressable onPress={loadMore} style={s.loadMoreBtn} disabled={isMoreLoading}>
                    {isMoreLoading
                      ? <ActivityIndicator size="small" color={C.terra} />
                      : <Text style={s.loadMoreTxt}>Load more</Text>
                    }
                  </Pressable>
                )}
              </>
            ) : (
              <SearchEmptyState query={query} />
            )}
          </View>
        )}

      </ScreenShell>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(f) => setFilters(f)}
        initial={filters}
      />

      <ProfileCompletionGateModal
        visible={profileGate}
        onClose={() => setProfileGate(false)}
        onCompleteProfile={() => { setProfileGate(false); navigation.navigate("Account"); }}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screenContent: { paddingHorizontal: 0, paddingBottom: 120 },

  // header
  stickyHeader: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  searchRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: C.terra, borderColor: C.terra },
  activeFilters: {
    flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10,
  },
  filterTag: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.terraLight, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: C.terra + "40",
  },
  filterTagTxt: { fontSize: 11, fontWeight: "700", color: C.terra },

  // discover
  discoverWrap: { paddingBottom: 40 },

  // hometown banner
  hometownBanner: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: C.terraLight,
    borderRadius: 16, borderWidth: 1, borderColor: C.terra + "30",
    flexDirection: "row", alignItems: "center", overflow: "hidden",
  },
  hometownBannerLeft: { width: 4, alignSelf: "stretch", backgroundColor: C.terra },
  hometownBannerContent: { flex: 1, padding: 14, gap: 4 },
  hometownBannerTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  facepile: { flexDirection: "row", alignItems: "center" },
  facepileItem: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.terraLight, overflow: "hidden" },
  facepileImg:  { width: 28, height: 28, borderRadius: 14 },
  facepileExtra: { backgroundColor: C.border, alignItems: "center", justifyContent: "center" },
  facepileExtraTxt: { fontSize: 9, fontWeight: "900", color: C.inkMid },
  hometownBannerCount: { fontSize: 11, fontWeight: "700", color: C.inkMuted },
  hometownBannerTitle: { fontFamily: SERIF, fontSize: 15, fontWeight: "700", color: C.ink },
  hometownBannerSub:   { fontSize: 11, color: C.inkMuted, lineHeight: 16 },
  hometownBannerArrow: { paddingRight: 12 },

  // section header
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 12,
  },
  sectionLabel:  { fontSize: 10, fontWeight: "800", color: C.inkMuted, letterSpacing: 1.5 },
  sectionAction: { fontSize: 12, fontWeight: "700", color: C.terra },

  // strip
  strip: { paddingHorizontal: 20, paddingBottom: 4, gap: 10 },

  // person card
  personCard: {
    width: 88, backgroundColor: C.surface, borderRadius: 14,
    padding: 10, alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: C.border,
  },
  personAvatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  personAvatar:  { width: 52, height: 52, borderRadius: 26 },
  personInitial: { fontSize: 20, fontWeight: "900" },
  personName:    { fontSize: 12, fontWeight: "700", color: C.ink, textAlign: "center" },
  personHometown: { flexDirection: "row", alignItems: "center", gap: 3 },
  journeyDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: C.terra },
  personHometownTxt: { fontSize: 9, fontWeight: "600", color: C.terra, maxWidth: 70 },
  personConnectBtn: {
    width: "100%", paddingVertical: 5, borderRadius: 10,
    backgroundColor: C.terraLight, borderWidth: 1.5, borderColor: C.terra,
    alignItems: "center", marginTop: 2,
  },
  personConnectBtnDone: { backgroundColor: "#E8F5EE", borderColor: C.green },
  personConnectBtnSent: { backgroundColor: "#E8F5EE", borderColor: C.green },
  personConnectTxt:     { fontSize: 10, fontWeight: "800", color: C.terra },
  personConnectTxtDone: { color: C.green },
  personConnectTxtSent: { color: C.green },

  // search results
  resultsWrap: { paddingTop: 8 },
  resultCount: { fontSize: 12, color: C.inkMuted, fontWeight: "600", paddingHorizontal: 20, marginBottom: 8 },
  resultsCard: { backgroundColor: C.surface },

  loadMoreBtn: { alignItems: "center", paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider, marginHorizontal: 20 },
  loadMoreTxt: { fontSize: 13, fontWeight: "700", color: C.terra },

  // skeleton
  skelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  skelAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#EDE5DB" },
  skelLine:   { height: 12, borderRadius: 6, backgroundColor: "#EDE5DB" },

  // filter sheet
  filterOverlay: { backgroundColor: "rgba(0,0,0,0.5)" },
  filterOuter:   { flex: 1, justifyContent: "flex-end" },
  filterSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: "75%",
    borderWidth: 1, borderColor: C.border, borderBottomWidth: 0,
  },
  filterHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 12 },
  filterHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
  },
  filterCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.inputBg, alignItems: "center", justifyContent: "center",
  },
  filterTitle:  { fontSize: 16, fontWeight: "700", color: C.ink },
  filterReset:  { fontSize: 13, fontWeight: "700", color: C.terra },
  filterSectionLabel: {
    fontSize: 10, fontWeight: "900", color: C.inkMuted,
    letterSpacing: 1.4, marginBottom: 10, marginTop: 20,
  },
  filterInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  filterInputText: { flex: 1, fontSize: 14, fontWeight: "500", color: C.ink, padding: 0 },
  filterChips: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
  },
  filterChipTxt: { fontSize: 13, fontWeight: "700", color: C.inkMid },
  filterFooter: { padding: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  filterApplyBtn: {
    backgroundColor: C.terra, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.terra, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  filterApplyTxt: { fontSize: 14, fontWeight: "800", color: C.white, letterSpacing: 0.3 },
});
