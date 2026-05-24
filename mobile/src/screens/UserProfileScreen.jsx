import React, { useEffect, useState, useRef } from "react";
import {
  Alert, View, Text, StyleSheet, ActivityIndicator,
  ScrollView, Image, Pressable, StatusBar, Platform, Animated,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUserProfile, getUserPosts,
  removeConnection, respondToConnectionRequest, sendConnectionRequest,
  blockUser, reportUser,
} from "../services/users/userService";
import { getUnreadNotificationsCount } from "../services/notifications/notificationService";
import AppTopHeader from "../components/AppTopHeader";
import { useSnackbar } from "../store/SnackbarContext";
import { useAuth } from "../store/AuthContext";
import ProfileCompletionGateModal, { isProfileCompleteForConnections } from "../components/common/ProfileCompletionGateModal";
import UserActionsMenu from "../components/common/UserActionsMenu";
import ReportSheet from "../components/common/ReportSheet";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
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
  catGeneral:  "#D4820A", catGeneralBg:  "#FEF7E8",
  catHousing:  "#3B6CA8", catHousingBg:  "#EEF3FC",
  catTravel:   "#1A7A5E", catTravelBg:   "#E8F5F1",
  catHangouts: "#B83055", catHangoutsBg: "#FDEEF3",
  catHelp:     "#7040B8", catHelpBg:     "#F3EEFE",
};

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

const PALETTE = [
  { bg: "#FDF0EA", text: "#C84B0C" },
  { bg: "#EEF3FC", text: "#3B6CA8" },
  { bg: "#E8F5F1", text: "#1A7A5E" },
  { bg: "#FDEEF3", text: "#B83055" },
  { bg: "#F3EEFE", text: "#7040B8" },
  { bg: "#E8F5EE", text: "#1A6B4A" },
];
const getAvatarPalette = (name) => PALETTE[(name?.charCodeAt(0) ?? 0) % PALETTE.length];

const GENDER_ICON  = { Male: "male",        Female: "female",  Other: "transgender" };
const GENDER_COLOR = { Male: "#3B82F6",     Female: "#EC4899", Other: "#8B5CF6"     };
const GENDER_BG    = { Male: "#EFF6FF",     Female: "#FDF2F8", Other: "#F5F3FF"     };

const CAT_META = {
  "general":            { color: C.catGeneral,  bg: C.catGeneralBg  },
  "flatmate":           { color: C.catHousing,  bg: C.catHousingBg  },
  "housing":            { color: C.catHousing,  bg: C.catHousingBg  },
  "travelmate":         { color: C.catTravel,   bg: C.catTravelBg   },
  "trip":               { color: C.catTravel,   bg: C.catTravelBg   },
  "hangouts":           { color: C.catHangouts, bg: C.catHangoutsBg },
  "help":               { color: C.catHelp,     bg: C.catHelpBg     },
  "questions":          { color: C.catHelp,     bg: C.catHelpBg     },
};
const getCatMeta = (cat) => {
  if (!cat) return { color: C.catGeneral, bg: C.catGeneralBg };
  const key = Object.keys(CAT_META).find(k => cat.toLowerCase().includes(k));
  return key ? CAT_META[key] : { color: C.catGeneral, bg: C.catGeneralBg };
};

const fmtRelTime = (d) => {
  if (!d) return "";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  const h = Math.floor(m / 60); const day = Math.floor(h / 24);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${day}d ago`;
};

// ─── Geocoding helpers (unchanged) ────────────────────────────────────────────
async function geocodePlace(city, state) {
  const q = [city, state].filter(Boolean).join(", ");
  if (!q) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "Bandhuu/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

function getRegionForTwo(a, b, padding = 1.6) {
  const minLat = Math.min(a.latitude, b.latitude);
  const maxLat = Math.max(a.latitude, b.latitude);
  const minLon = Math.min(a.longitude, b.longitude);
  const maxLon = Math.max(a.longitude, b.longitude);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * padding, 0.25),
    longitudeDelta: Math.max((maxLon - minLon) * padding, 0.25),
  };
}

// ─── Journey Map (terracotta polyline, same logic) ────────────────────────────
function JourneyMap({ hometownCity, hometownState, currentCity, currentState }) {
  const [homeCoords, setHomeCoords]       = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [loading, setLoading]             = useState(true);

  const homeLabel    = [hometownCity, hometownState].filter(Boolean).join(", ");
  const currentLabel = [currentCity, currentState].filter(Boolean).join(", ");

  useEffect(() => {
    Promise.all([
      geocodePlace(hometownCity, hometownState),
      geocodePlace(currentCity,  currentState),
    ]).then(([home, current]) => {
      setHomeCoords(home); setCurrentCoords(current); setLoading(false);
    });
  }, [hometownCity, hometownState, currentCity, currentState]);

  const bothExist = homeCoords && currentCoords;
  const region = bothExist
    ? getRegionForTwo(homeCoords, currentCoords)
    : homeCoords
    ? { ...homeCoords, latitudeDelta: 0.25, longitudeDelta: 0.25 }
    : null;

  return (
    <View style={s.mapCard}>
      {loading ? (
        <View style={s.mapLoading}><ActivityIndicator color={C.terra} /></View>
      ) : region ? (
        <>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            region={region}
            scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
          >
            {bothExist && (
              <Polyline
                coordinates={[homeCoords, currentCoords]}
                strokeWidth={3}
                strokeColor={C.terra}
                lineDashPattern={[8, 6]}
                geodesic
              />
            )}
            {homeCoords && <Marker coordinate={homeCoords} pinColor="#C84B0C" title="Hometown" description={homeLabel} />}
            {currentCoords && <Marker coordinate={currentCoords} pinColor="#1A6B4A" title="Current City" description={currentLabel} />}
          </MapView>
          <View style={s.mapBar}>
            <View style={s.mapBarCity}>
              <View style={[s.mapBarDot, { backgroundColor: C.terra }]} />
              <Text style={s.mapBarCityTxt} numberOfLines={1}>{homeLabel?.split(",")[0]}</Text>
            </View>
            {bothExist && <MaterialIcons name="east" size={13} color={C.inkMuted} />}
            {currentLabel ? (
              <View style={s.mapBarCity}>
                <View style={[s.mapBarDot, { backgroundColor: C.green }]} />
                <Text style={s.mapBarCityTxt} numberOfLines={1}>{currentLabel?.split(",")[0]}</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <View style={s.mapLoading}>
          <Text style={s.mapFallbackTxt}>{homeLabel || "Hometown"} → {currentLabel || "Current City"}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────
function ProfileSkeleton() {
  const anim = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const Skel = ({ style }) => <Animated.View style={[style, { opacity: anim, backgroundColor: "#EDE5DB" }]} />;
  return (
    <View style={[s.headerZone, { gap: 16, paddingBottom: 24 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Skel style={{ width: 84, height: 84, borderRadius: 42 }} />
        <View style={{ flex: 1, gap: 10 }}>
          <Skel style={{ height: 18, width: "60%", borderRadius: 9 }} />
          <Skel style={{ height: 13, width: "40%", borderRadius: 7 }} />
          <Skel style={{ height: 13, width: "70%", borderRadius: 7 }} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Skel style={{ flex: 1, height: 42, borderRadius: 21 }} />
        <Skel style={{ flex: 1, height: 42, borderRadius: 21 }} />
      </View>
      <Skel style={{ height: 13, width: "80%", borderRadius: 7 }} />
      <Skel style={{ height: 13, width: "65%", borderRadius: 7 }} />
    </View>
  );
}

// ─── Mini post card (for recent posts strip) ──────────────────────────────────
function MiniPostCard({ post, onPress }) {
  const cat = getCatMeta(post.category);
  return (
    <Pressable style={s.miniCard} onPress={() => onPress(post)} activeOpacity={0.8}>
      <View style={[s.miniCatBar, { backgroundColor: cat.color }]} />
      <View style={s.miniCardBody}>
        <Text style={s.miniCardTitle} numberOfLines={3}>{post.title}</Text>
        <Text style={s.miniCardTime}>{fmtRelTime(post.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function UserProfileScreen({ route, navigation }) {
  const insets           = useSafeAreaInsets();
  const { showSnackbar } = useSnackbar();
  const { user }         = useAuth();
  const { username }     = route.params;

  const [profile, setProfile]       = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [connectBusy, setConnectBusy] = useState(false);
  const [unread, setUnread]         = useState(0);
  const [profileGate, setProfileGate] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [userPosts, setUserPosts]   = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getUserProfile(username);
      setProfile(data);
      setIsLoading(false);
      if (data?._id) {
        setPostsLoading(true);
        const pr = await getUserPosts(data._id, 8);
        if (pr.success) setUserPosts(pr.posts);
        setPostsLoading(false);
      }
    };
    load();
  }, [username]);

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      getUnreadNotificationsCount().then(r => {
        if (mounted && r.success) setUnread(r.count || 0);
      });
      return () => { mounted = false; };
    }, [])
  );

  const handleBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Search");

  // ── connect ──────────────────────────────────────────────────────────────
  const onConnectPress = async () => {
    if (!profile?._id || connectBusy) return;
    const isNew = !["connected","request_received","request_sent"].includes(profile.connectionStatus);
    if (isNew && !isProfileCompleteForConnections(user)) { setProfileGate(true); return; }

    setConnectBusy(true);
    const result =
      profile.connectionStatus === "connected"        ? await removeConnection(profile._id)
      : profile.connectionStatus === "request_received" ? await respondToConnectionRequest(profile._id, "accept")
      : profile.connectionStatus === "request_sent"     ? { success: false, message: "Request already sent." }
      : await sendConnectionRequest(profile._id);
    setConnectBusy(false);

    if (!result.success) { showSnackbar(result.message || "Unable to perform action", "error"); return; }
    const refreshed = await getUserProfile(username);
    if (refreshed) setProfile(refreshed);
    showSnackbar(
      profile.connectionStatus === "connected"        ? "Connection removed."
      : profile.connectionStatus === "request_received" ? "Connection accepted."
      : "Connection request sent.", "success"
    );
  };

  // ── block / report ───────────────────────────────────────────────────────
  const handleBlock = () =>
    Alert.alert("Block User", `Block ${profile.fullName}? They won't be able to find or message you.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Block", style: "destructive", onPress: async () => {
        const res = await blockUser(profile._id);
        if (res.success) { showSnackbar("User blocked.", "success"); navigation.goBack(); }
        else showSnackbar(res.message || "Failed to block user", "error");
      }},
    ]);

  const handleReport = async (reason, details) => {
    setReportBusy(true);
    const res = await reportUser(profile._id, reason, details);
    setReportBusy(false);
    if (res.success) { setReportVisible(false); showSnackbar("Report submitted.", "success"); }
    else showSnackbar(res.message || "Failed to submit report", "error");
  };

  // ── loading / error states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={s.screen}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <AppTopHeader onBackPress={handleBack} onNotificationPress={() => navigation.navigate("Notifications")} notificationCount={unread} absolute />
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 74 }]}>
          <ProfileSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={s.screen}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <AppTopHeader onBackPress={handleBack} onNotificationPress={() => navigation.navigate("Notifications")} notificationCount={unread} absolute />
        <View style={s.center}>
          <Text style={s.errorEmoji}>😕</Text>
          <Text style={s.errorHead}>Profile not available</Text>
          <Text style={s.errorSub}>They may have deleted their account or blocked you.</Text>
          <Pressable style={s.errorBack} onPress={handleBack}>
            <Text style={s.errorBackTxt}>← Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const pal           = getAvatarPalette(profile.fullName);
  const hometownLabel = [profile.hometownCity, profile.hometownState].filter(Boolean).join(", ");
  const currentLabel  = [profile.city, profile.state].filter(Boolean).join(", ");
  const hometown      = profile.hometownCity || hometownLabel;
  const currentCity   = profile.city || profile.location?.split(",")[0]?.trim() || "";
  const isSelf        = user?._id === profile?._id;

  const postsCount   = profile.postsCount   ?? 0;
  const meetupsCount = profile.meetupsCount  ?? 0;
  const yaariCount   = profile.yaariCount ?? profile.connectionsCount ?? 0;

  const occupationDetail = profile.studyOrPost && profile.organization
    ? `${profile.studyOrPost} at ${profile.organization}`
    : profile.studyOrPost || profile.organization || (profile.occupationType === "student" ? "Student" : "Working Professional");

  const connectLabel = connectBusy ? "···"
    : profile.connectionStatus === "connected"        ? "Connected ✓"
    : profile.connectionStatus === "request_sent"     ? "Requested"
    : profile.connectionStatus === "request_received" ? "Accept"
    : "Connect";

  const connectStyle = profile.connectionStatus === "connected" ? s.connectBtnDone
    : profile.connectionStatus === "request_sent" ? s.connectBtnSent : s.connectBtn;

  // Interest tags from posts
  const interests = [...new Set(userPosts.map(p => p.category).filter(Boolean))].slice(0, 5);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <AppTopHeader onBackPress={handleBack} onNotificationPress={() => navigation.navigate("Notifications")} notificationCount={unread} absolute />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 74 }]}
      >
        {/* ── Header zone ── */}
        <View style={s.headerZone}>
          <View style={s.headerTopRow}>
            {/* Avatar */}
            <View style={s.avatarRing}>
              {profile.profileImageUri
                ? <Image source={{ uri: profile.profileImageUri }} style={s.avatarImg} />
                : <View style={[s.avatarFallback, { backgroundColor: pal.bg }]}>
                    <Text style={[s.avatarInitial, { color: pal.text }]}>{profile.fullName[0].toUpperCase()}</Text>
                  </View>
              }
            </View>

            {/* Name + journey */}
            <View style={{ flex: 1 }}>
              <Text style={s.profileName}>{profile.fullName}</Text>
              <Text style={s.profileHandle}>@{profile.username}</Text>
              {(hometown || currentCity) ? (
                <View style={s.journeyRow}>
                  {hometown ? <><View style={s.journeyDot} /><Text style={s.journeyFrom}>{hometown}</Text></> : null}
                  {hometown && currentCity ? <MaterialIcons name="east" size={12} color={C.inkMuted} /> : null}
                  {currentCity ? <Text style={s.journeyTo}>{currentCity}</Text> : null}
                </View>
              ) : null}
            </View>

            {/* More button */}
            {!isSelf && (
              <Pressable style={s.moreBtn} onPress={() => setMenuVisible(true)} hitSlop={8}>
                <MaterialIcons name="more-vert" size={20} color={C.inkMuted} />
              </Pressable>
            )}
          </View>

          {/* Action buttons */}
          {!isSelf && (
            <View style={s.actionsRow}>
              <Pressable style={[s.connectBtn, connectStyle]} onPress={onConnectPress} disabled={connectBusy}>
                <Text style={s.connectBtnTxt}>{connectLabel}</Text>
              </Pressable>
              <Pressable
                style={[s.messageBtn, profile.connectionStatus !== "connected" && s.messageBtnDisabled]}
                onPress={() => {
                  if (profile.connectionStatus !== "connected") {
                    showSnackbar("Connect first to send a message.", "info"); return;
                  }
                  navigation.navigate("Messages", {
                    openDmPeer: { _id: profile._id, fullName: profile.fullName, username: profile.username, profileImageUri: profile.profileImageUri || "", city: profile.city || "" },
                  });
                }}
              >
                <MaterialIcons
                  name={profile.connectionStatus === "connected" ? "chat-bubble-outline" : "lock-outline"}
                  size={15} color={profile.connectionStatus === "connected" ? C.ink : C.inkMuted}
                />
                <Text style={[s.messageBtnTxt, profile.connectionStatus !== "connected" && { color: C.inkMuted }]}>
                  Message
                </Text>
              </Pressable>
            </View>
          )}

          {/* Bio */}
          {!!profile.bio && (
            <Text style={s.bio}>{profile.bio}</Text>
          )}
        </View>

        {/* ── Stats bar ── */}
        <View style={s.statsBar}>
          <View style={s.statCol}>
            <Text style={s.statNum}>{postsCount}</Text>
            <Text style={s.statLbl}>Posts</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statNum}>{yaariCount}</Text>
            <Text style={s.statLbl}>Yaaris</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCol}>
            <Text style={s.statNum}>{meetupsCount}</Text>
            <Text style={s.statLbl}>Meetups</Text>
          </View>
        </View>

        {/* ── About section ── */}
        {(occupationDetail || profile.gender) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ABOUT</Text>
            <View style={s.aboutCard}>
              {occupationDetail ? (
                <View style={[s.aboutRow, profile.gender && s.aboutRowBorder]}>
                  <View style={[s.aboutIconWrap, { backgroundColor: C.catHousingBg }]}>
                    <MaterialIcons
                      name={profile.occupationType === "student" ? "school" : "work-outline"}
                      size={18}
                      color={C.catHousing}
                    />
                  </View>
                  <View style={s.aboutContent}>
                    <Text style={s.aboutLabel}>
                      {profile.occupationType === "student" ? "STUDYING" : "WORKING AS"}
                    </Text>
                    <Text style={s.aboutValue}>{occupationDetail}</Text>
                  </View>
                </View>
              ) : null}

              {profile.gender ? (
                <View style={s.aboutRow}>
                  <View style={[s.aboutIconWrap, { backgroundColor: GENDER_BG[profile.gender] || "#F0F0F0" }]}>
                    <MaterialIcons
                      name={GENDER_ICON[profile.gender] || "person"}
                      size={18}
                      color={GENDER_COLOR[profile.gender] || C.inkMuted}
                    />
                  </View>
                  <View style={s.aboutContent}>
                    <Text style={s.aboutLabel}>GENDER</Text>
                    <Text style={[s.aboutValue, { color: GENDER_COLOR[profile.gender] || C.ink }]}>
                      {profile.gender}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ── Journey Map (elevated) ── */}
        {(hometown || currentCity) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>THE JOURNEY</Text>
            <JourneyMap
              hometownCity={profile.hometownCity}
              hometownState={profile.hometownState}
              currentCity={profile.city}
              currentState={profile.state}
            />
          </View>
        )}

        {/* ── Interest tags ── */}
        {interests.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>INTERESTS</Text>
            <View style={s.interestRow}>
              {interests.map((cat) => {
                const meta = getCatMeta(cat);
                return (
                  <View key={cat} style={[s.interestChip, { backgroundColor: meta.bg }]}>
                    <View style={[s.journeyDot, { backgroundColor: meta.color }]} />
                    <Text style={[s.interestChipTxt, { color: meta.color }]}>
                      {cat.split(" / ")[0]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Recent posts ── */}
        {(userPosts.length > 0 || postsLoading) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>RECENT POSTS</Text>
            {postsLoading ? (
              <ActivityIndicator size="small" color={C.terra} style={{ marginTop: 8 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingVertical: 2 }} nestedScrollEnabled>
                {userPosts.map(post => (
                  <MiniPostCard
                    key={post._id}
                    post={post}
                    onPress={() => { /* navigate to post if route exists */ }}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modals */}
      <ProfileCompletionGateModal
        visible={profileGate}
        onClose={() => setProfileGate(false)}
        onCompleteProfile={() => { setProfileGate(false); navigation.navigate("Account"); }}
      />
      <UserActionsMenu visible={menuVisible} onClose={() => setMenuVisible(false)} onBlock={handleBlock} onReport={() => setReportVisible(true)} />
      <ReportSheet visible={reportVisible} onClose={() => setReportVisible(false)} onSubmit={handleReport} userName={profile?.fullName} busy={reportBusy} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 32 },
  scroll: { paddingHorizontal: 0, paddingBottom: 0 },

  // skeleton / error
  errorEmoji: { fontSize: 52, marginBottom: 4 },
  errorHead:  { fontFamily: SERIF, fontSize: 18, fontWeight: "700", color: C.ink, textAlign: "center" },
  errorSub:   { fontSize: 13, color: C.inkMuted, textAlign: "center", lineHeight: 20 },
  errorBack:  { marginTop: 8 },
  errorBackTxt: { fontSize: 14, fontWeight: "700", color: C.terra },

  // ── Header zone ──
  headerZone: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },

  // avatar
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 2.5, borderColor: C.terra,
    overflow: "hidden", flexShrink: 0,
  },
  avatarImg:     { width: "100%", height: "100%", borderRadius: 42 },
  avatarFallback:{ flex: 1, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 34, fontWeight: "900" },

  // name + journey
  profileName:  { fontFamily: SERIF, fontSize: 22, fontWeight: "700", color: C.ink, letterSpacing: -0.5, marginBottom: 2 },
  profileHandle:{ fontSize: 12, fontWeight: "600", color: C.inkMuted, marginBottom: 6 },
  journeyRow:   { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  journeyDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.terra },
  journeyFrom:  { fontSize: 12, fontWeight: "700", color: C.terra },
  journeyTo:    { fontSize: 12, fontWeight: "500", color: C.inkMuted },

  // about card
  aboutCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  aboutRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  aboutIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  aboutContent: { flex: 1, gap: 3 },
  aboutLabel: {
    fontSize: 9, fontWeight: "900", color: C.inkMuted,
    letterSpacing: 1.3, textTransform: "uppercase",
  },
  aboutValue: {
    fontSize: 14, fontWeight: "700", color: C.ink, lineHeight: 20,
  },

  moreBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.inputBg, alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },

  // actions
  actionsRow: { flexDirection: "row", gap: 10 },
  connectBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 22,
    backgroundColor: C.terra, alignItems: "center",
    shadowColor: C.terra, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  connectBtnDone: {
    flex: 1, paddingVertical: 11, borderRadius: 22,
    backgroundColor: C.green, alignItems: "center",
  },
  connectBtnSent: {
    flex: 1, paddingVertical: 11, borderRadius: 22,
    borderWidth: 1.5, borderColor: C.green, backgroundColor: C.greenLight, alignItems: "center",
  },
  connectBtnTxt: { fontSize: 13, fontWeight: "800", color: C.white, letterSpacing: 0.2 },

  messageBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, borderRadius: 22,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
  },
  messageBtnDisabled: { backgroundColor: C.inputBg, borderColor: C.border },
  messageBtnTxt: { fontSize: 13, fontWeight: "700", color: C.ink },

  bio: { fontSize: 14, color: C.inkMid, lineHeight: 22, fontStyle: "italic", fontWeight: "400" },

  // ── Stats bar ──
  statsBar: {
    flexDirection: "row",
    backgroundColor: C.surface,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statCol:     { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: C.divider, marginVertical: 4 },
  statNum:     { fontSize: 24, fontWeight: "900", color: C.ink, letterSpacing: -0.5 },
  statLbl:     { fontSize: 10, fontWeight: "800", color: C.inkMuted, letterSpacing: 1, textTransform: "uppercase" },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: "800", color: C.inkMuted,
    letterSpacing: 1.5, marginBottom: 12,
  },

  // interests
  interestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  interestChipTxt: { fontSize: 12, fontWeight: "700" },

  // mini post card
  miniCard: {
    width: 130, backgroundColor: C.surface, borderRadius: 14,
    overflow: "hidden", borderWidth: 1, borderColor: C.border,
  },
  miniCatBar:  { height: 4 },
  miniCardBody:{ padding: 10, gap: 6, flex: 1, justifyContent: "space-between", minHeight: 90 },
  miniCardTitle: { fontFamily: SERIF, fontSize: 12, fontWeight: "700", color: C.ink, lineHeight: 17 },
  miniCardTime:  { fontSize: 10, color: C.inkMuted, fontWeight: "500" },

  // map
  mapCard:    { height: 195, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  mapLoading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.inputBg, gap: 8 },
  mapFallbackTxt: { fontSize: 13, fontWeight: "700", color: C.inkMid },
  mapBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(0,0,0,0.06)",
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
  },
  mapBarCity:    { flexDirection: "row", alignItems: "center", gap: 5 },
  mapBarDot:     { width: 8, height: 8, borderRadius: 4 },
  mapBarCityTxt: { fontSize: 12, fontWeight: "700", color: C.ink },
});
