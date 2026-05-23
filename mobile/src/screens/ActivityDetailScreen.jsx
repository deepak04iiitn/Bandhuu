import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenShell } from "../components/tabs/TabShared";
import {
  getMyConnections,
  getMyPosts,
  getMySavedPosts,
  removeConnection,
  blockUser,
  reportUser,
} from "../services/users/userService";
import { deletePost, toggleSave, updatePost } from "../services/posts/postService";
import { deleteMeetup, updateMeetup } from "../services/meetups/meetupService";
import { getServerBaseUrl } from "../services/chat/chatService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "../store/SnackbarContext";
import UserActionsMenu from "../components/common/UserActionsMenu";
import ReportSheet from "../components/common/ReportSheet";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const T = {
  bg: "#f5f2ed",
  bgDeep: "#ede9e2",
  surface: "#ffffff",
  surfaceAlt: "#f8f6f2",
  ink: "#0a0a0a",
  inkLight: "#3d3d3d",
  soft: "#888888",
  mute: "#a6a6a6",
  line: "#e0dbd4",
  lineLight: "#ece7e0",
  blue: "#004ac6",
  bluePale: "#eef2ff",
  blueLight: "#c7d8ff",
  blueGhost: "#f3f6ff",
  accent: "#e8380d",
  accentMint: "#007a5e",
  gold: "#c9890a",
  goldGhost: "#fff8e6",
  goldBorder: "#f0da9e",
  goldDeep: "#8f6207",
  coral: "#C05A5A",
  coralPale: "#FAEAEA",
  white: "#ffffff",
  tagRed: "#fff0ed",
  tagBlue: "#eef2ff",
  tagGold: "#fff8e6",
};

const DEFAULT_MEETUP_IMG = {
  uri: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
};

const POST_CATEGORIES = [
  "General",
  "Flatmate / Housing",
  "Travelmate",
  "Trip",
  "Hangouts",
  "Help / Questions",
];

function ListAvatar({ uri, name }) {
  const initials = (name || "CY")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={st.avatar} />;
  }

  return (
    <View style={st.avatarFallback}>
      <Text style={st.avatarFallbackText}>{initials || "CY"}</Text>
    </View>
  );
}

function useFade(trigger) {
  const anim = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(anim, {
      toValue: trigger ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [trigger]);
  return anim;
}

function EditSheet({ visible, onClose, title, subtitle, children }) {
  const fade = useFade(visible);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Animated.View style={[st.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={st.sheetOuter}>
        <View style={st.sheetInner}>
          <View style={st.sheetHandle} />
          <View style={st.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={st.sheetTitle}>{title}</Text>
              {subtitle ? (
                <Text style={st.sheetSub}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} style={st.closeBtn}>
              <MaterialIcons name="close" size={16} color={T.soft} />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getCategoryTheme = (category) => {
  const defaultTheme = { color: T.accent, bg: T.tagRed };
  if (!category) return defaultTheme;
  const lower = category.toLowerCase();
  if (lower.includes("housing") || lower.includes("flatmate"))
    return { color: T.blue, bg: T.tagBlue };
  if (lower.includes("travel") || lower.includes("trip"))
    return { color: "#10b981", bg: "#ecfdf5" };
  if (lower.includes("hangouts") || lower.includes("events"))
    return { color: T.gold, bg: T.tagGold };
  if (lower.includes("help") || lower.includes("questions"))
    return { color: "#ef4444", bg: "#fef2f2" };
  return defaultTheme;
};

const formatMeetupDate = (d) => {
  const date = new Date(d);
  return date
    .toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .toUpperCase();
};

const formatMeetupTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const formatDateDisplay = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTimeDisplay = (d) => {
  const date = new Date(d);
  const h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
};

export default function ActivityDetailScreen({ navigation, route }) {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const type = route?.params?.type || "connections";
  const title = route?.params?.title || "Activity";
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [expandedMeetupDescs, setExpandedMeetupDescs] = useState({});
  const [postsSubTab, setPostsSubTab] = useState("posts");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [connMenuTarget, setConnMenuTarget] = useState(null);
  const [connReportTarget, setConnReportTarget] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [connSearch, setConnSearch] = useState("");
  const connDebounceRef = useRef(null);
  const connSearchIsInitial = useRef(true);

  const [editForm, setEditForm] = useState({
    title: "",
    details: "",
    category: "General",
  });

  const [meetupEditForm, setMeetupEditForm] = useState({
    title: "",
    details: "",
    maxMembers: "",
    hometown: "",
    meetupLocation: "",
    venue: "",
    date: new Date(),
    time: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const getRelativeTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 60) return `${Math.max(1, diffMins)} mins ago`;
    if (diffHrs < 24) return `${diffHrs} hours ago`;
    return `${diffDays} days ago`;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      const result =
        type === "connections"
          ? await getMyConnections()
          : type === "posts"
          ? await getMyPosts()
          : await getMySavedPosts();
      if (!mounted) return;
      if (result.success) {
        setItems(result.connections || result.posts || []);
      } else {
        setItems([]);
      }
      setIsLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [type]);

  const count = useMemo(() => items.length, [items]);
  const myPosts = useMemo(() => items.filter((x) => x.kind !== "Meetup"), [items]);
  const myMeetups = useMemo(() => items.filter((x) => x.kind === "Meetup"), [items]);
  const activePostItems = postsSubTab === "meetups" ? myMeetups : myPosts;

  // Debounced server-side connections search
  useEffect(() => {
    if (type !== "connections") return;
    if (connSearchIsInitial.current) {
      connSearchIsInitial.current = false;
      return; // initial load is handled by the mount effect below
    }
    if (connDebounceRef.current) clearTimeout(connDebounceRef.current);
    const delay = connSearch.trim() ? 350 : 0;
    connDebounceRef.current = setTimeout(async () => {
      const result = await getMyConnections(connSearch.trim() || undefined);
      if (result.success) setItems(result.connections || []);
    }, delay);
    return () => clearTimeout(connDebounceRef.current);
  }, [connSearch, type]);

  const onRemoveConnection = async (id) => {
    const res = await removeConnection(id);
    if (!res.success) {
      showSnackbar(res.message || "Unable to remove connection", "error");
      return;
    }
    setItems((prev) => prev.filter((x) => x._id !== id));
    showSnackbar("Connection removed successfully.", "success");
  };

  const handleBlockConnection = (item) => {
    Alert.alert(
      "Block User",
      `Block ${item.fullName}? They won't be able to find or message you, and your connection will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            const res = await blockUser(item._id);
            if (res.success) {
              setItems((prev) => prev.filter((x) => x._id !== item._id));
              showSnackbar("User blocked.", "success");
            } else {
              showSnackbar(res.message || "Failed to block user", "error");
            }
          },
        },
      ]
    );
  };

  const handleReportConnection = async (reason, details) => {
    if (!connReportTarget) return;
    setReportBusy(true);
    const res = await reportUser(connReportTarget._id, reason, details);
    setReportBusy(false);
    if (res.success) {
      setConnReportTarget(null);
      showSnackbar("Report submitted. Our team will review it.", "success");
    } else {
      showSnackbar(res.message || "Failed to submit report", "error");
    }
  };

  const onDeletePost = (id) => {
    const item = items.find((x) => x._id === id);
    if (!item) return;
    setDeleteConfirm(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteBusy(true);
    const res =
      deleteConfirm.kind === "Meetup"
        ? await deleteMeetup(deleteConfirm._id)
        : await deletePost(deleteConfirm._id);
    setDeleteBusy(false);
    if (!res.success) {
      showSnackbar(res.message || "Unable to delete", "error");
      return;
    }
    setItems((prev) => prev.filter((x) => x._id !== deleteConfirm._id));
    setDeleteConfirm(null);
    showSnackbar("Deleted successfully.", "success");
  };

  const onUnsave = async (id) => {
    const res = await toggleSave(id);
    if (!res.success) {
      showSnackbar(res.message || "Unable to unsave post", "error");
      return;
    }
    setItems((prev) => prev.filter((x) => x._id !== id));
    showSnackbar("Removed from saved posts.", "success");
  };

  const openEditSheet = (item) => {
    setEditingItem(item);
    if (item.kind === "Meetup") {
      const timeDate = new Date();
      if (item.time) {
        const [h, m] = item.time.split(":").map(Number);
        if (!isNaN(h)) timeDate.setHours(h);
        if (!isNaN(m)) timeDate.setMinutes(m);
      }
      setMeetupEditForm({
        title: item.title || "",
        details: item.details || "",
        maxMembers: String(item.maxMembers || ""),
        hometown: item.hometown || "",
        meetupLocation: item.meetupLocation || item.location || "",
        venue: item.venue || "",
        date: item.date ? new Date(item.date) : new Date(),
        time: timeDate,
      });
    } else {
      setEditForm({
        title: item.title || "",
        details: item.details || "",
        category: item.category || "General",
      });
    }
    setEditOpen(true);
  };

  const onSaveEdit = async () => {
    if (!editingItem) return;
    const isMeetup = editingItem.kind === "Meetup";

    if (isMeetup) {
      if (!meetupEditForm.title.trim() || !meetupEditForm.details.trim()) {
        showSnackbar("Title and details are required.", "info");
        return;
      }
      setEditBusy(true);
      const timeH = meetupEditForm.time.getHours();
      const timeM = meetupEditForm.time.getMinutes();
      const payload = {
        title: meetupEditForm.title.trim(),
        details: meetupEditForm.details.trim(),
        maxMembers: Number(meetupEditForm.maxMembers) || 10,
        hometown: meetupEditForm.hometown.trim(),
        meetupLocation: meetupEditForm.meetupLocation.trim(),
        venue: meetupEditForm.venue.trim(),
        date: meetupEditForm.date.toISOString(),
        time: `${String(timeH).padStart(2, "0")}:${String(timeM).padStart(2, "0")}`,
      };
      const res = await updateMeetup(editingItem._id, payload);
      setEditBusy(false);
      if (!res.success) {
        showSnackbar(res.message || "Unable to update meetup", "error");
        return;
      }
      setItems((prev) =>
        prev.map((x) =>
          x._id === editingItem._id
            ? { ...x, ...payload, date: payload.date }
            : x
        )
      );
    } else {
      if (!editForm.title.trim() || !editForm.details.trim()) {
        showSnackbar("Title and details are required.", "info");
        return;
      }
      setEditBusy(true);
      const payload = {
        title: editForm.title.trim(),
        details: editForm.details.trim(),
        category: editForm.category.trim(),
      };
      const res = await updatePost(editingItem._id, payload);
      setEditBusy(false);
      if (!res.success) {
        showSnackbar(res.message || "Unable to update post", "error");
        return;
      }
      setItems((prev) =>
        prev.map((x) =>
          x._id === editingItem._id ? { ...x, ...payload } : x
        )
      );
    }

    setEditOpen(false);
    setEditingItem(null);
    showSnackbar("Updated successfully.", "success");
  };

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderPostCard = (item, idx, isLast, showActions = true) => {
    const theme = getCategoryTheme(item.category);
    const author = item.user && typeof item.user === "object" ? item.user : user;
    return (
      <View key={item._id || idx}>
        {idx > 0 && <View style={st.hrule} />}
        <View style={st.postCard}>
          <View style={st.postHeader}>
            <View style={st.authorRow}>
              <View style={st.avatarWrap}>
                <Image
                  source={{
                    uri:
                      author?.profileImageUri ||
                      "https://via.placeholder.com/150",
                  }}
                  style={st.avatarImg}
                />
              </View>
              <View>
                <Text style={st.authorName}>
                  {author?.fullName || "Unknown User"}
                </Text>
                <Text style={st.postTime}>
                  {getRelativeTime(item.createdAt)}
                </Text>
              </View>
            </View>
            <View style={[st.catTag, { backgroundColor: theme.bg }]}>
              <Text style={[st.catText, { color: theme.color }]}>
                {(item.category || "General").toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={st.postTitle}>{item.title}</Text>
          <Text
            style={st.postBody}
            numberOfLines={expandedPosts[item._id] ? undefined : 3}
          >
            {item.details}
          </Text>
          {item.details && item.details.length > 100 && (
            <Pressable onPress={() => toggleExpand(item._id)} hitSlop={10}>
              <Text style={st.readMore}>
                {expandedPosts[item._id] ? "Show less" : "Read more"}
              </Text>
            </Pressable>
          )}

          {item.imageUri ? (
            <View style={st.postImgWrap}>
              <Image source={{ uri: item.imageUri }} style={st.postImg} />
            </View>
          ) : null}

          <View style={st.postStats}>
            <View style={st.postStatsLeft}>
              <View style={st.statItem}>
                <MaterialIcons name="thumb-up-off-alt" size={15} color={T.soft} />
                <Text style={st.statCount}>{item.likes?.length || 0}</Text>
              </View>
              <View style={st.statItem}>
                <MaterialIcons name="thumb-down-off-alt" size={15} color={T.soft} />
                <Text style={st.statCount}>{item.dislikes?.length || 0}</Text>
              </View>
              <View style={st.statItem}>
                <MaterialIcons name="chat-bubble-outline" size={15} color={T.soft} />
                <Text style={st.statCount}>{item.comments || 0}</Text>
              </View>
            </View>
          </View>

          {showActions && (
            <View style={st.cardActions}>
              <Pressable
                style={st.editBtn}
                onPress={() => openEditSheet(item)}
              >
                <MaterialIcons name="edit" size={14} color={T.blue} />
                <Text style={st.editBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                style={st.deleteBtn}
                onPress={() => onDeletePost(item._id)}
              >
                <MaterialIcons name="delete-outline" size={14} color={T.coral} />
                <Text style={st.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMeetupCard = (item, idx, isLast, showActions = true) => {
    const serverBase = getServerBaseUrl();
    const imgSrc = item.imageUri
      ? {
          uri: item.imageUri.startsWith("http")
            ? item.imageUri
            : `${serverBase}${item.imageUri}`,
        }
      : DEFAULT_MEETUP_IMG;
    const spotsLeft = (item.maxMembers || 0) - (item.members?.length || 0);

    return (
      <View key={item._id} style={st.meetCardFull}>
        <View style={st.meetImgWrap}>
          <Image source={imgSrc} style={st.meetImg} />
          <View style={[st.datePill, { backgroundColor: T.accent }]}>
            <Text style={st.datePillText}>{formatMeetupDate(item.date)}</Text>
          </View>
          <View style={st.spotsBadge}>
            <MaterialIcons name="people" size={10} color={T.ink} />
            <Text style={st.spotsText}>
              {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
            </Text>
          </View>
        </View>

        <View style={st.meetBody}>
          <View style={st.meetTimeRow}>
            <Text style={st.meetTime}>{formatMeetupTime(item.time)}</Text>
            {item.hometown ? (
              <View style={st.hometownInline}>
                <MaterialIcons name="home" size={11} color={T.accent} />
                <Text style={st.hometownInlineText}>
                  For {item.hometown} folks
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={st.meetTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.details ? (
            <View>
              <Text
                style={st.meetDesc}
                numberOfLines={
                  expandedMeetupDescs[item._id] ? undefined : 2
                }
              >
                {item.details}
              </Text>
              {item.details.length > 80 && (
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut
                    );
                    setExpandedMeetupDescs((prev) => ({
                      ...prev,
                      [item._id]: !prev[item._id],
                    }));
                  }}
                  hitSlop={8}
                >
                  <Text style={st.meetReadMore}>
                    {expandedMeetupDescs[item._id] ? "Show less" : "Read more"}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
          {item.venue || item.meetupLocation || item.location ? (
            <View style={st.meetLoc}>
              <MaterialIcons name="location-on" size={13} color={T.blue} />
              <Text style={st.meetLocText} numberOfLines={1}>
                {[item.venue, item.meetupLocation || item.location]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          ) : null}

          <View style={st.meetFooter}>
            <View style={st.meetMembers}>
              <MaterialIcons name="group" size={14} color={T.soft} />
              <Text style={st.meetMembersText}>
                {item.members?.length || 0}/{item.maxMembers}
              </Text>
            </View>
            <View
              style={[
                st.statusBadge,
                item.status === "completed" && st.statusBadgeCompleted,
                item.status === "cancelled" && st.statusBadgeCancelled,
              ]}
            >
              <Text
                style={[
                  st.statusBadgeText,
                  item.status === "completed" && st.statusBadgeTextCompleted,
                  item.status === "cancelled" && st.statusBadgeTextCancelled,
                ]}
              >
                {(item.status || "upcoming").toUpperCase()}
              </Text>
            </View>
          </View>

          {showActions && (
            <View style={st.cardActions}>
              <Pressable
                style={st.editBtn}
                onPress={() => openEditSheet(item)}
              >
                <MaterialIcons name="edit" size={14} color={T.blue} />
                <Text style={st.editBtnText}>Edit</Text>
              </Pressable>
              <Pressable
                style={st.deleteBtn}
                onPress={() => onDeletePost(item._id)}
              >
                <MaterialIcons name="delete-outline" size={14} color={T.coral} />
                <Text style={st.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const isMeetupEdit = editingItem?.kind === "Meetup";

  return (
    <ScreenShell
      navigation={navigation}
      routeName="Account"
      noPadding
      background={T.bg}
      contentContainerStyle={st.screenContent}
      stickyHeaderIndices={[1]}
    >
      {/* Child 0: Masthead (scrolls away) */}
      <View style={st.masthead}>
        <View style={st.topChip}>
          <Text style={st.topChipText}>MY ACTIVITY</Text>
        </View>
        <Text style={st.heroTitle}>
          {title}
          <Text style={{ color: T.blue }}>.</Text>
        </Text>
        <Text style={st.heroSub}>
          {type === "posts"
            ? `${myPosts.length} ${myPosts.length === 1 ? "post" : "posts"} · ${myMeetups.length} ${myMeetups.length === 1 ? "meetup" : "meetups"}`
            : `${count} ${count === 1 ? "item" : "items"} in this section`}
        </Text>
      </View>

      {/* Child 1: Sticky panel — search bar (connections) or sub-tabs (posts) */}
      <View style={st.stickyPanel}>
        {type === "connections" && !isLoading && items.length > 0 && (
          <View style={st.searchWrap}>
            <View style={st.searchBar}>
              <MaterialIcons name="search" size={18} color={T.mute} style={{ marginRight: 8 }} />
              <TextInput
                style={st.searchInput}
                placeholder="Search connections..."
                placeholderTextColor={T.mute}
                value={connSearch}
                onChangeText={setConnSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              {connSearch.length > 0 && (
                <Pressable onPress={() => setConnSearch("")} hitSlop={8}>
                  <MaterialIcons name="close" size={16} color={T.soft} />
                </Pressable>
              )}
            </View>
            {connSearch.trim().length > 0 && (
              <Text style={st.searchCount}>
                {items.length}{" "}
                {items.length === 1 ? "result" : "results"}
              </Text>
            )}
          </View>
        )}
        {type === "posts" && (
          <View style={st.subTabRow}>
            {[
              { key: "posts", label: "POSTS", icon: "description", count: myPosts.length },
              { key: "meetups", label: "MEETUPS", icon: "event", count: myMeetups.length },
            ].map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setPostsSubTab(tab.key)}
                style={[
                  st.subTabPill,
                  postsSubTab === tab.key && st.subTabPillActive,
                ]}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={15}
                  color={postsSubTab === tab.key ? T.white : T.soft}
                />
                <Text
                  style={[
                    st.subTabText,
                    postsSubTab === tab.key && st.subTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    st.subTabCount,
                    postsSubTab === tab.key && st.subTabCountActive,
                  ]}
                >
                  <Text
                    style={[
                      st.subTabCountText,
                      postsSubTab === tab.key && st.subTabCountTextActive,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Child 2+: Content */}
      {type === "connections" ? (
        <View style={st.connectionsFeed}>
          {isLoading ? (
            <Text style={st.emptyText}>Loading...</Text>
          ) : items.length === 0 ? (
            <Text style={st.emptyText}>No connections yet.</Text>
          ) : items.length === 0 ? (
            <View style={st.emptySearchWrap}>
              <MaterialIcons name="search-off" size={36} color={T.line} />
              <Text style={st.emptyText}>No matches found</Text>
            </View>
          ) : (
            items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              return (
                <View
                  key={item._id}
                  style={[
                    st.connectionRow,
                    !isLast && st.connectionRowBorder,
                  ]}
                >
                  <ListAvatar
                    uri={item.profileImageUri}
                    name={item.fullName}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowTitle}>{item.fullName}</Text>
                    <Text style={st.rowMeta}>@{item.username}</Text>
                    {(item.hometownCity || item.city) && (
                      <Text style={st.rowSub}>
                        {[item.hometownCity, item.city]
                          .filter(Boolean)
                          .join(" → ")}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => setConnMenuTarget(item)}
                    style={st.connMoreBtn}
                    hitSlop={6}
                  >
                    <MaterialIcons name="more-vert" size={18} color={T.soft} />
                  </Pressable>
                  <Pressable
                    onPress={() => onRemoveConnection(item._id)}
                    style={st.dangerBtnSmall}
                  >
                    <Text style={st.dangerBtnSmallText}>Remove</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      ) : type === "saved" ? (
        <View style={st.postsFeed}>
          {isLoading ? (
            <Text style={st.emptyText}>Loading...</Text>
          ) : items.length === 0 ? (
            <Text style={st.emptyText}>No saved posts yet.</Text>
          ) : (
            items.map((item, idx) => {
              const isLast = idx === items.length - 1;
              const theme = getCategoryTheme(item.category);
              return (
                <View key={item._id}>
                  {idx > 0 && <View style={st.hrule} />}
                  <View style={st.postCard}>
                    <View style={st.postHeader}>
                      <View style={st.authorRow}>
                        <View style={st.avatarWrap}>
                          <Image
                            source={{
                              uri:
                                item.user?.profileImageUri ||
                                "https://via.placeholder.com/150",
                            }}
                            style={st.avatarImg}
                          />
                        </View>
                        <View>
                          <Text style={st.authorName}>
                            {item.user?.fullName || "Unknown User"}
                          </Text>
                          <Text style={st.postTime}>
                            {getRelativeTime(item.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[st.catTag, { backgroundColor: theme.bg }]}
                      >
                        <Text style={[st.catText, { color: theme.color }]}>
                          {(item.category || "General").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={st.postTitle}>{item.title}</Text>
                    <Text
                      style={st.postBody}
                      numberOfLines={
                        expandedPosts[item._id] ? undefined : 3
                      }
                    >
                      {item.details}
                    </Text>
                    {item.details && item.details.length > 100 && (
                      <Pressable
                        onPress={() => toggleExpand(item._id)}
                        hitSlop={10}
                      >
                        <Text style={st.readMore}>
                          {expandedPosts[item._id] ? "Show less" : "Read more"}
                        </Text>
                      </Pressable>
                    )}

                    {item.imageUri ? (
                      <View style={st.postImgWrap}>
                        <Image
                          source={{ uri: item.imageUri }}
                          style={st.postImg}
                        />
                      </View>
                    ) : null}

                    <View style={st.cardActions}>
                      <Pressable
                        style={st.unsaveBtn}
                        onPress={() => onUnsave(item._id)}
                      >
                        <MaterialIcons
                          name="bookmark-remove"
                          size={14}
                          color={T.blue}
                        />
                        <Text style={st.editBtnText}>Unsave</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      ) : (
        <>
          <View style={st.postsFeed}>
            {isLoading ? (
              <Text style={st.emptyText}>Loading...</Text>
            ) : activePostItems.length === 0 ? (
              <Text style={st.emptyText}>
                {postsSubTab === "meetups"
                  ? "No meetups yet."
                  : "No posts yet."}
              </Text>
            ) : postsSubTab === "meetups" ? (
              activePostItems.map((item, idx) => {
                const isLast = idx === activePostItems.length - 1;
                return renderMeetupCard(item, idx, isLast, true);
              })
            ) : (
              activePostItems.map((item, idx) => {
                const isLast = idx === activePostItems.length - 1;
                return renderPostCard(item, idx, isLast, true);
              })
            )}
          </View>
        </>
      )}

      {/* Edit Sheet */}
      <EditSheet
        visible={editOpen}
        title={isMeetupEdit ? "Edit Meetup" : "Edit Post"}
        subtitle={
          isMeetupEdit
            ? "Update your meetup details."
            : "Update details and save your changes."
        }
        onClose={() => {
          if (editBusy) return;
          setEditOpen(false);
          setEditingItem(null);
        }}
      >
        {isMeetupEdit ? (
          <>
            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>MEETUP TITLE</Text>
              <TextInput
                value={meetupEditForm.title}
                onChangeText={(v) =>
                  setMeetupEditForm((p) => ({ ...p, title: v }))
                }
                placeholder="Ex. - Weekend Hiking Trip"
                placeholderTextColor={T.mute}
                style={st.fieldInput}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                value={meetupEditForm.details}
                onChangeText={(v) =>
                  setMeetupEditForm((p) => ({ ...p, details: v }))
                }
                placeholder="What's this meetup about?"
                placeholderTextColor={T.mute}
                multiline
                textAlignVertical="top"
                style={[st.fieldInput, st.fieldTextArea]}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>MAX MEMBERS</Text>
              <TextInput
                value={meetupEditForm.maxMembers}
                onChangeText={(v) =>
                  setMeetupEditForm((p) => ({ ...p, maxMembers: v }))
                }
                placeholder="e.g. 10"
                placeholderTextColor={T.mute}
                keyboardType="number-pad"
                style={st.fieldInput}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>HOMETOWN</Text>
              <TextInput
                value={meetupEditForm.hometown}
                onChangeText={(v) =>
                  setMeetupEditForm((p) => ({ ...p, hometown: v }))
                }
                placeholder="Target hometown (e.g. Patna, Lucknow)"
                placeholderTextColor={T.mute}
                style={st.fieldInput}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>MEETUP LOCATION</Text>
              <TextInput
                value={meetupEditForm.meetupLocation}
                onChangeText={(v) =>
                  setMeetupEditForm((p) => ({ ...p, meetupLocation: v }))
                }
                placeholder="City, State, Country"
                placeholderTextColor={T.mute}
                style={st.fieldInput}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>VENUE</Text>
              <TextInput
                value={meetupEditForm.venue}
                onChangeText={(v) =>
                  setMeetupEditForm((p) => ({ ...p, venue: v }))
                }
                placeholder="Venue name"
                placeholderTextColor={T.mute}
                style={st.fieldInput}
              />
            </View>

            <View style={st.meetupPickerRow}>
              <View style={[st.fieldWrap, { flex: 1 }]}>
                <Text style={st.fieldLabel}>DATE</Text>
                <Pressable
                  style={st.pickerBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons name="event" size={18} color={T.blue} />
                  <Text style={st.pickerBtnText}>
                    {formatDateDisplay(meetupEditForm.date)}
                  </Text>
                </Pressable>
              </View>
              <View style={[st.fieldWrap, { flex: 1 }]}>
                <Text style={st.fieldLabel}>TIME</Text>
                <Pressable
                  style={st.pickerBtn}
                  onPress={() => setShowTimePicker(true)}
                >
                  <MaterialIcons name="schedule" size={18} color={T.blue} />
                  <Text style={st.pickerBtnText}>
                    {formatTimeDisplay(meetupEditForm.time)}
                  </Text>
                </Pressable>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={meetupEditForm.date}
                mode="date"
                minimumDate={new Date()}
                onChange={(e, d) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (d)
                    setMeetupEditForm((p) => ({ ...p, date: d }));
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={meetupEditForm.time}
                mode="time"
                onChange={(e, d) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (d)
                    setMeetupEditForm((p) => ({ ...p, time: d }));
                }}
              />
            )}
          </>
        ) : (
          <>
            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>TITLE</Text>
              <TextInput
                value={editForm.title}
                onChangeText={(v) =>
                  setEditForm((p) => ({ ...p, title: v }))
                }
                placeholder="Post title"
                placeholderTextColor={T.mute}
                style={st.fieldInput}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>DETAILS</Text>
              <TextInput
                value={editForm.details}
                onChangeText={(v) =>
                  setEditForm((p) => ({ ...p, details: v }))
                }
                placeholder="Write more details..."
                placeholderTextColor={T.mute}
                multiline
                textAlignVertical="top"
                style={[st.fieldInput, st.fieldTextArea]}
              />
            </View>

            <View style={st.fieldWrap}>
              <Text style={st.fieldLabel}>CATEGORY</Text>
              <View style={st.categoryWrap}>
                {POST_CATEGORIES.map((cat) => {
                  const active = editForm.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() =>
                        setEditForm((p) => ({ ...p, category: cat }))
                      }
                      style={[
                        st.categoryChip,
                        active && st.categoryChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          st.categoryChipText,
                          active && st.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <Pressable
          onPress={onSaveEdit}
          disabled={editBusy}
          style={({ pressed }) => [
            st.primaryBtn,
            (pressed || editBusy) && { opacity: 0.82 },
          ]}
        >
          <Text style={st.primaryBtnText}>
            {editBusy ? "Saving..." : "Save Changes"}
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color={T.white} />
        </Pressable>
      </EditSheet>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteBusy && setDeleteConfirm(null)}
      >
        <Pressable
          style={st.confirmOverlay}
          onPress={() => !deleteBusy && setDeleteConfirm(null)}
        >
          <Pressable style={st.confirmCard} onPress={() => {}}>
            <View style={st.confirmIconWrap}>
              <MaterialIcons
                name={deleteConfirm?.kind === "Meetup" ? "event-busy" : "delete-forever"}
                size={28}
                color={T.coral}
              />
            </View>

            <Text style={st.confirmTitle}>
              Delete {deleteConfirm?.kind === "Meetup" ? "Meetup" : "Post"}?
            </Text>

            <Text style={st.confirmBody}>
              {deleteConfirm?.kind === "Meetup"
                ? "This will permanently remove the meetup and notify all members. This action cannot be undone."
                : "This will permanently remove your post, including all likes and comments. This action cannot be undone."}
            </Text>

            <View style={st.confirmItemPreview}>
              <Text style={st.confirmItemTitle} numberOfLines={1}>
                {deleteConfirm?.title}
              </Text>
              <Text style={st.confirmItemMeta}>
                {deleteConfirm?.kind === "Meetup" ? "Meetup" : deleteConfirm?.category || "Post"}
              </Text>
            </View>

            <View style={st.confirmBtnRow}>
              <Pressable
                style={({ pressed }) => [
                  st.confirmCancelBtn,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => setDeleteConfirm(null)}
                disabled={deleteBusy}
              >
                <Text style={st.confirmCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  st.confirmDeleteBtn,
                  (pressed || deleteBusy) && { opacity: 0.75 },
                ]}
                onPress={confirmDelete}
                disabled={deleteBusy}
              >
                <MaterialIcons name="delete-outline" size={16} color={T.white} />
                <Text style={st.confirmDeleteText}>
                  {deleteBusy ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <UserActionsMenu
        visible={!!connMenuTarget}
        onClose={() => setConnMenuTarget(null)}
        onBlock={() => connMenuTarget && handleBlockConnection(connMenuTarget)}
        onReport={() => {
          setConnReportTarget(connMenuTarget);
          setConnMenuTarget(null);
        }}
      />

      <ReportSheet
        visible={!!connReportTarget}
        onClose={() => setConnReportTarget(null)}
        onSubmit={handleReportConnection}
        userName={connReportTarget?.fullName}
        busy={reportBusy}
      />
    </ScreenShell>
  );
}

const st = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 120,
    gap: 0,
    backgroundColor: T.bg,
  },

  stickyPanel: {
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: T.ink,
  },
  topChip: {
    alignSelf: "flex-start",
    backgroundColor: T.goldGhost,
    borderWidth: 1,
    borderColor: T.goldBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  topChipText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: T.goldDeep,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "900",
    color: T.ink,
    lineHeight: 46,
    letterSpacing: -1.2,
  },
  heroSub: {
    marginTop: 5,
    fontSize: 12,
    color: T.soft,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  /* ── Sub-tabs (Posts / Meetups toggle) ── */
  subTabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: T.bgDeep,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1.5,
    borderColor: T.line,
    gap: 4,
  },
  subTabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  subTabPillActive: {
    backgroundColor: T.ink,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.soft,
    letterSpacing: 1,
  },
  subTabTextActive: {
    color: T.white,
  },
  subTabCount: {
    backgroundColor: T.line,
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  subTabCountActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  subTabCountText: {
    fontSize: 10,
    fontWeight: "900",
    color: T.soft,
  },
  subTabCountTextActive: {
    color: T.white,
  },

  /* ── Posts Feed ── */
  postsFeed: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hrule: {
    height: 1.5,
    backgroundColor: T.line,
    marginVertical: 4,
  },
  postCard: {
    paddingVertical: 20,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: T.line,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  authorName: {
    fontSize: 13,
    fontWeight: "800",
    color: T.ink,
    letterSpacing: -0.2,
  },
  postTime: {
    fontSize: 10,
    color: T.soft,
    fontWeight: "500",
    marginTop: 2,
  },
  catTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  catText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: T.ink,
    lineHeight: 26,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  postBody: {
    fontSize: 14,
    lineHeight: 22,
    color: T.inkLight,
    marginBottom: 8,
    fontWeight: "400",
  },
  readMore: {
    color: T.blue,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  postImgWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.surfaceAlt,
  },
  postImg: {
    width: "100%",
    height: "100%",
  },
  postStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.bgDeep,
  },
  postStatsLeft: {
    flexDirection: "row",
    gap: 18,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statCount: {
    fontSize: 13,
    fontWeight: "700",
    color: T.soft,
  },

  /* ── Card Actions ── */
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.lineLight,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: T.blueLight,
    backgroundColor: T.bluePale,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: T.blue,
  },
  unsaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: T.blueLight,
    backgroundColor: T.bluePale,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#f1c0c0",
    backgroundColor: T.coralPale,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: T.coral,
  },

  /* ── Meetup Cards ── */
  meetCardFull: {
    marginBottom: 16,
    backgroundColor: T.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: T.line,
    shadowColor: T.ink,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  meetImgWrap: {
    height: 150,
    position: "relative",
  },
  meetImg: {
    width: "100%",
    height: "100%",
  },
  datePill: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  datePillText: {
    fontSize: 9,
    fontWeight: "900",
    color: T.white,
    letterSpacing: 1,
  },
  spotsBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.white,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  spotsText: {
    fontSize: 10,
    fontWeight: "800",
    color: T.ink,
    letterSpacing: 0.3,
  },
  meetBody: {
    padding: 16,
  },
  meetTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
  },
  meetTime: {
    fontSize: 11,
    fontWeight: "800",
    color: T.soft,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  hometownInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.accent + "12",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hometownInlineText: {
    fontSize: 10,
    fontWeight: "700",
    color: T.accent,
    letterSpacing: 0.2,
  },
  meetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: T.ink,
    lineHeight: 23,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  meetDesc: {
    fontSize: 13,
    fontWeight: "500",
    color: T.soft,
    lineHeight: 18,
    marginBottom: 2,
  },
  meetReadMore: {
    fontSize: 11,
    fontWeight: "800",
    color: T.blue,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 2,
  },
  meetLoc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    backgroundColor: T.tagBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  meetLocText: {
    fontSize: 12,
    color: T.blue,
    fontWeight: "700",
    flex: 1,
  },
  meetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meetMembers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meetMembersText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.soft,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: T.bluePale,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: T.blue,
    letterSpacing: 1,
  },
  statusBadgeCompleted: {
    backgroundColor: "#e0f2e9",
  },
  statusBadgeTextCompleted: {
    color: T.accentMint,
  },
  statusBadgeCancelled: {
    backgroundColor: T.coralPale,
  },
  statusBadgeTextCancelled: {
    color: T.coral,
  },

  /* ── Connections ── */
  connectionsFeed: {
    width: "100%",
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderColor: T.line,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.lineLight,
    paddingHorizontal: 14,
    height: 46,
    shadowColor: "#0a0a0a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: T.ink,
    paddingVertical: 0,
  },
  searchCount: {
    fontSize: 11,
    fontWeight: "700",
    color: T.soft,
    marginTop: 8,
    marginLeft: 4,
  },
  emptySearchWrap: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 10,
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  connectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.lineLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.line,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.bluePale,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 12,
    fontWeight: "900",
    color: T.blue,
    letterSpacing: 0.3,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: T.ink,
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: T.soft,
    marginTop: 1,
  },
  rowSub: {
    fontSize: 11,
    color: T.mute,
    marginTop: 2,
  },
  connMoreBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.lineLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  dangerBtnSmall: {
    borderWidth: 1.2,
    borderColor: "#f1c0c0",
    backgroundColor: T.coralPale,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dangerBtnSmallText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.coral,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 22,
    color: T.soft,
    fontSize: 13,
    fontWeight: "600",
  },

  /* ── Edit Sheet ── */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,20,10,0.45)",
  },
  sheetOuter: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetInner: {
    maxHeight: "88%",
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#3A8FB5",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.bluePale,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: T.ink,
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 13,
    color: T.soft,
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 270,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.bluePale,
    borderWidth: 1,
    borderColor: T.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Form Fields ── */
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: T.soft,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  fieldInput: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1.5,
    borderColor: T.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.ink,
    fontWeight: "500",
  },
  fieldTextArea: {
    minHeight: 120,
  },
  meetupPickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerBtn: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1.5,
    borderColor: T.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickerBtnText: {
    fontSize: 14,
    color: T.ink,
    fontWeight: "600",
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.surfaceAlt,
  },
  categoryChipActive: {
    borderColor: T.blueLight,
    backgroundColor: T.bluePale,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.soft,
  },
  categoryChipTextActive: {
    color: T.blue,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: T.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: T.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: T.white,
    letterSpacing: 0.2,
  },

  /* ── Delete Confirmation Modal ── */
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 10, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: T.lineLight,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.coralPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: "#f1c0c0",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: T.ink,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 13,
    lineHeight: 20,
    color: T.soft,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  confirmItemPreview: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
  },
  confirmItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: T.ink,
    flex: 1,
    marginRight: 10,
  },
  confirmItemMeta: {
    fontSize: 9,
    fontWeight: "900",
    color: T.soft,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1.5,
    borderColor: T.line,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: T.ink,
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: T.coral,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: T.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "800",
    color: T.white,
  },
});
