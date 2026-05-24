import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Image, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenShell } from "./TabShared";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import { respondToConnectionRequest } from "../../services/users/userService";
import { fetchNotifications, markAllNotificationsAsRead } from "../../services/notifications/notificationService";

// ─── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#F5F0EB",
  surface:      "#FEFCFA",
  unreadBg:     "#FDF7F2",
  terra:        "#C84B0C",
  terraLight:   "#FDF0EA",
  green:        "#1A6B4A",
  greenLight:   "#E8F5EE",
  ink:          "#1C1410",
  inkMid:       "#5C4F47",
  inkMuted:     "#9C8D84",
  border:       "#E8E0D8",
  divider:      "#F0EAE3",
  white:        "#FFFFFF",
  catHousing:   "#3B6CA8", catHousingBg:  "#EEF3FC",
  catTravel:    "#1A7A5E", catTravelBg:   "#E8F5F1",
  catHangouts:  "#B83055", catHangoutsBg: "#FDEEF3",
  catHelp:      "#7040B8", catHelpBg:     "#F3EEFE",
  skeletonBase: "#EDE5DB",
};

const SERIF = { fontFamily: "Georgia" };

// ─── TYPE META ────────────────────────────────────────────────────────────────
const TYPE_META = {
  connection_request:  { icon: "person-add",  color: C.green,       bg: C.greenLight      },
  connection_accepted: { icon: "how-to-reg",  color: C.green,       bg: C.greenLight      },
  post_liked:          { icon: "thumb-up",    color: C.terra,       bg: C.terraLight      },
  post_commented:      { icon: "chat-bubble", color: C.catHousing,  bg: C.catHousingBg   },
  comment_liked:       { icon: "favorite",    color: C.catHangouts, bg: C.catHangoutsBg  },
  comment_replied:     { icon: "reply",       color: C.catHelp,     bg: C.catHelpBg      },
  meetup_joined:       { icon: "event",       color: C.catTravel,   bg: C.catTravelBg    },
};

// ─── FILTERS ──────────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all",      label: "All",      icon: "notifications",  types: null },
  { key: "requests", label: "Requests", icon: "person-add",     types: ["connection_request", "connection_accepted"] },
  { key: "likes",    label: "Likes",    icon: "thumb-up",       types: ["post_liked", "comment_liked"] },
  { key: "comments", label: "Comments", icon: "chat-bubble",    types: ["post_commented", "comment_replied"] },
  { key: "meetups",  label: "Meetups",  icon: "event",          types: ["meetup_joined"] },
];

// ─── EMPTY STATE CONFIG ───────────────────────────────────────────────────────
const EMPTY = {
  all:      { emoji: "🔔", title: "You're all caught up.", sub: "When people interact with you, it shows up here.", action: null },
  requests: { emoji: "🤝", title: "No pending requests.", sub: "Find people from your hometown on the Search tab.", action: { label: "Find people", route: "Search" } },
  likes:    { emoji: "❤️", title: "No likes yet.", sub: "Share a post — someone from your city might relate.", action: { label: "Create a post", route: "Post" } },
  comments: { emoji: "💬", title: "No comments yet.", sub: "Start a conversation by posting something.", action: { label: "Create a post", route: "Post" } },
  meetups:  { emoji: "🗓", title: "No meetup activity.", sub: "Create a meetup and see who joins.", action: { label: "Plan a meetup", route: "Post" } },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const toRelTime = (d) => {
  if (!d) return "now";
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  const h = Math.floor(m / 60);
  const day = Math.floor(h / 24);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${day}d`;
};

const getTimeBucket = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(+today - 86400000);
  const weekAgo   = new Date(+today - 6 * 86400000);
  if (d >= today)     return "TODAY";
  if (d >= yesterday) return "YESTERDAY";
  if (d >= weekAgo)   return "THIS WEEK";
  return "OLDER";
};

const groupLikes = (notifs) => {
  const result = [];
  const likeMap = {}; // refPostId → index in result
  for (const n of notifs) {
    if (n.type === "post_liked" && n.refPost?._id) {
      const key = n.refPost._id;
      if (likeMap[key] !== undefined) {
        result[likeMap[key]].groupActors.push(n.actor);
      } else {
        likeMap[key] = result.length;
        result.push({ ...n, groupActors: [n.actor] });
      }
    } else {
      result.push({ ...n, groupActors: [n.actor] });
    }
  }
  return result;
};

const buildGroupMessage = (notif) => {
  const actors = notif.groupActors || [];
  const n = actors.length;
  const name0 = actors[0]?.fullName || "Someone";
  const name1 = actors[1]?.fullName || "Someone";
  if (n <= 1) return notif.message || `${name0} liked your post`;
  if (n === 2) return `${name0} and ${name1} liked your post`;
  return `${name0}, ${name1} and ${n - 2} other${n - 2 > 1 ? "s" : ""} liked your post`;
};

const toTimeSections = (notifs) => {
  const buckets = { TODAY: [], YESTERDAY: [], "THIS WEEK": [], OLDER: [] };
  notifs.forEach((n) => buckets[getTimeBucket(n.createdAt)].push(n));
  return Object.entries(buckets).filter(([, items]) => items.length > 0);
};

// ─── NOTIFICATION AVATAR ──────────────────────────────────────────────────────
function NotifAvatar({ uri, name, size = 46, color = C.terra, bg = C.terraLight }) {
  const [err, setErr] = useState(false);
  const initials = useMemo(
    () => (name || "?").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase(),
    [name]
  );
  const circle = { width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: C.border };
  if (uri && !err) {
    return <Image source={{ uri }} style={[circle, { backgroundColor: C.border }]} onError={() => setErr(true)} />;
  }
  return (
    <View style={[circle, { backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ fontSize: size * 0.32, fontWeight: "900", color }}>{initials}</Text>
    </View>
  );
}

// ─── AVATAR CLUSTER (grouped likes) ──────────────────────────────────────────
function AvatarCluster({ actors }) {
  const show  = Math.min(actors.length, 2);
  const extra = actors.length - show;
  return (
    <View style={s.cluster}>
      {actors.slice(0, show).map((actor, i) => (
        <View key={actor?._id || i} style={{ marginLeft: i === 0 ? 0 : -10, zIndex: show - i }}>
          <NotifAvatar uri={actor?.profileImageUri} name={actor?.fullName} size={38} />
        </View>
      ))}
      {extra > 0 && (
        <View style={[s.clusterExtra, { marginLeft: -10 }]}>
          <Text style={s.clusterExtraTxt}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

// ─── SKELETON ROW ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  const anim = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View style={[s.skeletonRow, { opacity: anim }]}>
      <View style={s.skeletonAvatar} />
      <View style={s.skeletonContent}>
        <View style={[s.skeletonLine, { width: "78%" }]} />
        <View style={[s.skeletonLine, { width: "52%", marginTop: 8 }]} />
      </View>
    </Animated.View>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ bucket, showClear, onClear, clearing }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionLabel}>{bucket}</Text>
      {showClear && (
        <Pressable onPress={onClear} disabled={clearing} hitSlop={12}>
          <Text style={[s.clearAllTxt, clearing && { opacity: 0.45 }]}>Clear all</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── CONNECTION REQUEST ROW ───────────────────────────────────────────────────
function ConnectionRequestCard({ notif, busyId, onAccept, onDecline, onTap }) {
  const actor     = notif.actor;
  const accepting = busyId === `${actor?._id}:accept`;
  const declining = busyId === `${actor?._id}:decline`;
  const busy      = !!busyId;
  const isUnread  = !notif.isRead;
  const city      = actor?.location?.split(",")[0]?.trim() || actor?.city;

  return (
    <Pressable
      style={[s.notifRow, isUnread && s.notifRowUnread]}
      onPress={() => onTap(notif)}
      activeOpacity={0.75}
    >
      {/* Avatar with badge */}
      <View style={s.notifAvatarWrap}>
        <View style={{ position: "relative" }}>
          <NotifAvatar uri={actor?.profileImageUri} name={actor?.fullName} size={46} color={C.green} bg={C.greenLight} />
          <View style={[s.typeBadge, { backgroundColor: C.greenLight, borderColor: C.surface }]}>
            <MaterialIcons name="person-add" size={10} color={C.green} />
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={s.notifContent}>
        <View style={s.notifTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.connReqName} numberOfLines={1}>{actor?.fullName || "Someone"}</Text>
            {actor?.hometown ? (
              <View style={[s.hometownRow, { marginTop: 2 }]}>
                <View style={s.hometownDot} />
                <Text style={s.connReqMeta} numberOfLines={1}>
                  {actor.hometown}{city && city !== actor.hometown ? ` → ${city}` : ""}
                </Text>
              </View>
            ) : city ? (
              <Text style={[s.connReqMeta, { marginTop: 2 }]}>{city}</Text>
            ) : null}
          </View>
          <Text style={s.rowTime}>{toRelTime(notif.createdAt)}</Text>
        </View>

        <Text style={s.connReqSub}>Wants to connect with you</Text>

        {actor?.bio ? (
          <Text style={s.connReqBio} numberOfLines={1}>{actor.bio}</Text>
        ) : null}

        {notif.actionable && (
          <View style={s.connActions}>
            <Pressable
              style={[s.acceptBtn, busy && s.btnBusy]}
              onPress={() => onAccept(actor?._id)}
              disabled={busy}
            >
              {accepting
                ? <ActivityIndicator size="small" color={C.white} />
                : <><MaterialIcons name="check" size={13} color={C.white} /><Text style={s.acceptBtnTxt}>Accept</Text></>
              }
            </Pressable>
            <Pressable
              style={[s.declineBtn, busy && s.btnBusy]}
              onPress={() => onDecline(actor?._id)}
              disabled={busy}
            >
              <Text style={s.declineBtnTxt}>{declining ? "···" : "Decline"}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {isUnread && <View style={s.unreadDot} />}
    </Pressable>
  );
}

// ─── CONNECTION ACCEPTED ROW ──────────────────────────────────────────────────
function ConnectionAcceptedRow({ notif, onTap, onMessage }) {
  const actor    = notif.actor;
  const isUnread = !notif.isRead;
  return (
    <Pressable
      style={[s.notifRow, isUnread && s.notifRowUnread]}
      onPress={() => onTap(notif)}
      activeOpacity={0.75}
    >
      <View style={s.notifAvatarWrap}>
        <View style={{ position: "relative" }}>
          <NotifAvatar uri={actor?.profileImageUri} name={actor?.fullName} size={46} color={C.green} bg={C.greenLight} />
          <View style={[s.typeBadge, { backgroundColor: C.greenLight, borderColor: C.surface }]}>
            <MaterialIcons name="how-to-reg" size={10} color={C.green} />
          </View>
        </View>
      </View>
      <View style={s.notifContent}>
        <View style={s.notifTopRow}>
          <Text style={[s.notifMsg, isUnread && s.notifMsgUnread]} numberOfLines={2}>
            {notif.message || `${actor?.fullName || "Someone"} accepted your request`}
          </Text>
          <Text style={s.rowTime}>{toRelTime(notif.createdAt)}</Text>
        </View>
        <Pressable style={s.messageBtn} onPress={() => onMessage(notif.actor?._id)}>
          <MaterialIcons name="chat-bubble-outline" size={13} color={C.green} />
          <Text style={s.messageBtnTxt}>Send a message</Text>
        </Pressable>
      </View>
      {isUnread && <View style={s.unreadDot} />}
    </Pressable>
  );
}

// ─── STANDARD NOTIFICATION ROW ────────────────────────────────────────────────
function NotifRow({ notif, isUnread, currentUserHometown, onTap }) {
  const tm         = TYPE_META[notif.type] || TYPE_META.post_liked;
  const isGrouped  = (notif.groupActors?.length || 0) > 1;
  const actors     = notif.groupActors || [notif.actor];

  const showHometown =
    notif.actor?.hometown &&
    currentUserHometown &&
    notif.actor.hometown.toLowerCase() === currentUserHometown.toLowerCase();

  const snippetText = notif.refPost?.title
    || (notif.refPost?.details ? notif.refPost.details.slice(0, 70) : null)
    || (notif.refMeetup?.title ? notif.refMeetup.title : null);

  const message = isGrouped ? buildGroupMessage(notif) : (notif.message || "You have a new notification");

  const memberInfo = notif.refMeetup?.memberCount
    ? `Now ${notif.refMeetup.memberCount} member${notif.refMeetup.memberCount > 1 ? "s" : ""}`
    : null;

  return (
    <Pressable
      style={[s.notifRow, isUnread && s.notifRowUnread]}
      onPress={() => onTap(notif)}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={s.notifAvatarWrap}>
        {isGrouped ? (
          <AvatarCluster actors={actors} />
        ) : (
          <View style={{ position: "relative" }}>
            <NotifAvatar uri={notif.actor?.profileImageUri} name={notif.actor?.fullName} size={46} color={tm.color} bg={tm.bg} />
            <View style={[s.typeBadge, { backgroundColor: tm.bg, borderColor: C.surface }]}>
              <MaterialIcons name={tm.icon} size={10} color={tm.color} />
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.notifContent}>
        <View style={s.notifTopRow}>
          <Text style={[s.notifMsg, isUnread && s.notifMsgUnread]} numberOfLines={2}>
            {message}
          </Text>
          <Text style={s.rowTime}>{toRelTime(notif.createdAt)}</Text>
        </View>

        {/* Post / meetup snippet */}
        {snippetText ? (
          <View style={[s.snippet, { borderLeftColor: tm.color, backgroundColor: tm.bg }]}>
            <Text style={[s.snippetText, { color: tm.color }]} numberOfLines={1}>"{snippetText}"</Text>
          </View>
        ) : null}

        {/* Meetup member count */}
        {memberInfo ? (
          <Text style={[s.memberInfo, { color: tm.color }]}>{memberInfo}</Text>
        ) : null}

        {/* Hometown tag */}
        {showHometown ? (
          <View style={s.hometownRow}>
            <View style={s.hometownDot} />
            <Text style={s.hometownTxt}>From {notif.actor.hometown}, like you</Text>
          </View>
        ) : null}
      </View>

      {/* Unread dot */}
      {isUnread && <View style={s.unreadDot} />}
    </Pressable>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ filterKey, navigation }) {
  const cfg = EMPTY[filterKey] || EMPTY.all;
  return (
    <View style={s.emptyWrap}>
      <Text style={s.emptyEmoji}>{cfg.emoji}</Text>
      <Text style={s.emptyTitle}>{cfg.title}</Text>
      <Text style={s.emptySub}>{cfg.sub}</Text>
      {cfg.action && (
        <Pressable style={s.emptyAction} onPress={() => navigation.navigate(cfg.action.route)}>
          <Text style={s.emptyActionTxt}>{cfg.action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function NotificationsTab({ navigation }) {
  const { showSnackbar }  = useSnackbar();
  const { user }          = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [busyId, setBusyId]               = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [activeFilter, setActiveFilter]   = useState("all");

  // ── data ────────────────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const result = await fetchNotifications(); // always fetch all, filter client-side
    if (result.success) setNotifications(result.notifications || []);
    else showSnackbar(result.message || "Unable to load notifications", "error");
    setLoading(false);
  }, [showSnackbar]);

  useFocusEffect(useCallback(() => { loadNotifications(); }, [loadNotifications]));

  // ── derived state ────────────────────────────────────────────────────────
  const filterCounts = useMemo(() => {
    const counts = {};
    FILTERS.forEach((f) => {
      counts[f.key] = f.types === null
        ? notifications.length
        : notifications.filter((n) => f.types.includes(n.type)).length;
    });
    return counts;
  }, [notifications]);

  const displayed = useMemo(() => {
    const f = FILTERS.find((x) => x.key === activeFilter);
    return f?.types ? notifications.filter((n) => f.types.includes(n.type)) : notifications;
  }, [notifications, activeFilter]);

  const grouped = useMemo(() => groupLikes(displayed), [displayed]);

  const timeSections = useMemo(() => toTimeSections(grouped), [grouped]);

  const hasUnread   = notifications.some((n) => !n.isRead);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── handlers ─────────────────────────────────────────────────────────────
  const onMarkAllRead = async () => {
    if (!hasUnread || markingAllRead) return;
    setMarkingAllRead(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const result = await markAllNotificationsAsRead();
    setMarkingAllRead(false);
    if (!result.success) {
      showSnackbar(result.message || "Unable to mark as read", "error");
      loadNotifications();
    } else {
      showSnackbar("All caught up!", "success");
    }
  };

  const onRespond = async (actorId, action) => {
    setBusyId(`${actorId}:${action}`);
    const result = await respondToConnectionRequest(actorId, action);
    setBusyId("");
    if (result.success) {
      loadNotifications();
      showSnackbar(
        action === "accept" ? "Connection accepted." : "Request declined.",
        "success"
      );
    } else {
      showSnackbar(result.message || "Unable to update request", "error");
    }
  };

  const handleNotifTap = (notif) => {
    if (!notif) return;
    const postTypes = ["post_liked", "post_commented", "comment_liked", "comment_replied"];
    if (postTypes.includes(notif.type)) {
      if (notif.refPost?._id) navigation.navigate("ActivityDetail", { postId: notif.refPost._id });
      else navigation.navigate("Home");
    } else if (["connection_request", "connection_accepted"].includes(notif.type)) {
      if (notif.actor?._id) navigation.navigate("UserProfile", { userId: notif.actor._id });
    } else if (notif.type === "meetup_joined") {
      navigation.navigate("Home");
    }
  };

  const handleSendMessage = (userId) => {
    if (userId) navigation.navigate("Messages");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      navigation={navigation}
      routeName="Notifications"
      noPadding
      background={C.bg}
      contentContainerStyle={s.screenContent}
      notificationCount={unreadCount}
      stickyHeaderIndices={[0]}
      onRefresh={loadNotifications}
      refreshing={loading && notifications.length > 0}
    >
      {/* ══ CHILD 0: Sticky header ══ */}
      <View style={s.stickyHeader}>
        {/* Title row */}
        <View style={s.titleRow}>
          <Text style={s.title}>Notifications</Text>
          <View style={{ flex: 1 }} />
          {unreadCount > 0 && (
            <View style={s.unreadPill}>
              <Text style={s.unreadPillTxt}>{unreadCount} new</Text>
            </View>
          )}
          {hasUnread && (
            <Pressable onPress={onMarkAllRead} disabled={markingAllRead} hitSlop={12}>
              <Text style={[s.clearAllTxt, markingAllRead && { opacity: 0.45 }]}>Clear all</Text>
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          nestedScrollEnabled
        >
          {FILTERS.map((f) => {
            const active = f.key === activeFilter;
            const count  = filterCounts[f.key] || 0;
            const tm     = f.key === "all"
              ? { color: C.terra, bg: C.terraLight }
              : (TYPE_META[f.types?.[0]] || { color: C.terra, bg: C.terraLight });

            return (
              <Pressable
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  s.filterChip,
                  active && { backgroundColor: tm.color, borderColor: tm.color },
                ]}
              >
                <MaterialIcons
                  name={f.icon}
                  size={12}
                  color={active ? C.white : tm.color}
                />
                <Text style={[s.filterChipTxt, active && { color: C.white }]}>{f.label}</Text>
                {count > 0 && (
                  <View style={[s.filterCount, active && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                    <Text style={[s.filterCountTxt, active && { color: C.white }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ CHILD 1: Feed ══ */}
      <View style={s.feed}>
        {/* Loading skeletons */}
        {loading && notifications.length === 0 ? (
          <View style={{ paddingTop: 16 }}>
            <View style={s.sectionHeader}>
              <View style={[s.skeletonLine, { width: 60, height: 10 }]} />
            </View>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </View>
        ) : grouped.length === 0 ? (
          <EmptyState filterKey={activeFilter} navigation={navigation} />
        ) : (
          timeSections.map(([bucket, items]) => (
            <View key={bucket}>
              <SectionHeader
                bucket={bucket}
                showClear={bucket === "TODAY" && hasUnread && !notifications.some((n) => !n.isRead && getTimeBucket(n.createdAt) !== "TODAY")}
                onClear={onMarkAllRead}
                clearing={markingAllRead}
              />
              {items.map((notif, idx) => {
                const isUnread = !notif.isRead;
                const isLast   = idx === items.length - 1;

                if (notif.type === "connection_request") {
                  return (
                    <View key={notif._id} style={[s.notifWrap, !isLast && s.rowBorder]}>
                      <ConnectionRequestCard
                        notif={notif}
                        busyId={busyId}
                        onAccept={(id) => onRespond(id, "accept")}
                        onDecline={(id) => onRespond(id, "decline")}
                        onTap={handleNotifTap}
                      />
                    </View>
                  );
                }

                if (notif.type === "connection_accepted") {
                  return (
                    <View key={notif._id} style={[s.notifWrap, !isLast && s.rowBorder]}>
                      <ConnectionAcceptedRow
                        notif={notif}
                        onTap={handleNotifTap}
                        onMessage={handleSendMessage}
                      />
                    </View>
                  );
                }

                return (
                  <View key={notif._id || idx} style={[s.notifWrap, !isLast && s.rowBorder]}>
                    <NotifRow
                      notif={notif}
                      isUnread={isUnread}
                      currentUserHometown={user?.hometown}
                      onTap={handleNotifTap}
                    />
                  </View>
                );
              })}
            </View>
          ))
        )}
      </View>
    </ScreenShell>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screenContent: { paddingHorizontal: 0, paddingBottom: 120 },

  // ── Sticky header ──
  stickyHeader: {
    backgroundColor: C.bg,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    ...SERIF,
    fontSize: 22,
    fontWeight: "700",
    color: C.ink,
    letterSpacing: -0.5,
  },
  unreadPill: {
    backgroundColor: C.terra,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  unreadPillTxt: { fontSize: 10, fontWeight: "800", color: C.white, letterSpacing: 0.3 },
  clearAllTxt:   { fontSize: 12, fontWeight: "700", color: C.terra },

  // ── Filter chips ──
  filterRow: { paddingHorizontal: 20, paddingBottom: 2, gap: 8, flexDirection: "row" },
  filterChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    height: 32, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
  },
  filterChipTxt: { fontSize: 11, fontWeight: "700", color: C.inkMuted },
  filterCount: {
    backgroundColor: C.border,
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 10, minWidth: 18, alignItems: "center",
  },
  filterCountTxt: { fontSize: 9, fontWeight: "900", color: C.inkMuted },

  // ── Feed ──
  feed: { backgroundColor: C.surface },

  // ── Section header ──
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: "800", color: C.inkMuted, letterSpacing: 1.8,
  },

  // ── Row wrapper ──
  notifWrap: { backgroundColor: C.surface },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },

  // ── Connection request row ──
  connReqName: {
    fontSize: 14, fontWeight: "700", color: C.ink, letterSpacing: -0.1,
  },
  connReqMeta: { fontSize: 11, fontWeight: "600", color: C.inkMuted },
  connReqSub: {
    fontSize: 12, color: C.inkMuted, fontWeight: "400",
    marginTop: 3, marginBottom: 2,
  },
  connReqBio: {
    fontSize: 11, fontStyle: "italic", color: C.inkMuted,
    marginBottom: 2, lineHeight: 15,
  },
  connActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: C.green, borderRadius: 20, justifyContent: "center",
  },
  acceptBtnTxt: { fontSize: 12, fontWeight: "800", color: C.white },
  declineBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
  },
  declineBtnTxt: { fontSize: 12, fontWeight: "700", color: C.inkMuted },
  btnBusy: { opacity: 0.45 },
  messageBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 8, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.green,
  },
  messageBtnTxt: { fontSize: 11, fontWeight: "700", color: C.green },

  // ── Standard notification row ──
  notifRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 13,
    backgroundColor: C.surface,
  },
  notifRowUnread: { backgroundColor: C.unreadBg },
  notifAvatarWrap: { marginRight: 13, flexShrink: 0, alignSelf: "flex-start", paddingTop: 2 },
  notifContent: { flex: 1 },
  notifTopRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 3,
  },
  notifMsg: {
    flex: 1,
    fontSize: 13, fontWeight: "500", color: C.inkMid, lineHeight: 20,
  },
  notifMsgUnread: { fontWeight: "700", color: C.ink },
  rowTime: {
    fontSize: 10, fontWeight: "600", color: C.inkMuted, flexShrink: 0,
  },

  // ── Post / meetup snippet ──
  snippet: {
    borderLeftWidth: 2, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    marginTop: 6, marginBottom: 4,
  },
  snippetText: { fontSize: 11, fontStyle: "italic", fontWeight: "600" },

  // ── Member info ──
  memberInfo: { fontSize: 11, fontWeight: "700", marginTop: 4 },

  // ── Hometown tag ──
  hometownRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  hometownDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.terra },
  hometownTxt:  { fontSize: 10, fontWeight: "700", color: C.terra },

  // ── Type badge (on single avatar) ──
  typeBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
  },

  // ── Unread dot ──
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.terra,
    marginLeft: 8, marginTop: 5, flexShrink: 0,
  },

  // ── Avatar cluster (grouped likes) ──
  cluster: { flexDirection: "row", alignItems: "center", width: 58, height: 46, position: "relative" },
  clusterExtra: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  clusterExtraTxt: { fontSize: 10, fontWeight: "900", color: C.inkMid },

  // ── Skeleton ──
  skeletonRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  skeletonAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: C.skeletonBase,
  },
  skeletonContent: { flex: 1, gap: 0 },
  skeletonLine: {
    height: 13, borderRadius: 6, backgroundColor: C.skeletonBase,
  },

  // ── Empty state ──
  emptyWrap: {
    paddingVertical: 56, paddingHorizontal: 32,
    alignItems: "center", gap: 10,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: {
    ...SERIF,
    fontSize: 18, fontWeight: "700", color: C.ink, textAlign: "center",
  },
  emptySub: {
    fontSize: 13, color: C.inkMuted, textAlign: "center",
    lineHeight: 19, fontWeight: "400",
  },
  emptyAction: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.terra,
  },
  emptyActionTxt: { fontSize: 13, fontWeight: "700", color: C.terra },
});
