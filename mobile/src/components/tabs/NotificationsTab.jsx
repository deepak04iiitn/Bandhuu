import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenShell } from "./TabShared";
import { respondToConnectionRequest } from "../../services/users/userService";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
} from "../../services/notifications/notificationService";
import { useSnackbar } from "../../store/SnackbarContext";

const C = {
  bg: "#f5f2ed",
  surface: "#ffffff",
  ink: "#0a0a0a",
  inkLight: "#3d3d3d",
  soft: "#888888",
  line: "#e0dbd4",
  lineLight: "#ece7e0",
  blue: "#004ac6",
  bluePale: "#eef2ff",
  blueLight: "#c7d8ff",
  accent: "#e8380d",
  accentPale: "#fff0ed",
  coral: "#C05A5A",
  coralPale: "#FAEAEA",
  mint: "#007a5e",
  mintPale: "#ecfdf5",
  purple: "#7c3aed",
  purplePale: "#f5f3ff",
  pink: "#ec4899",
  pinkPale: "#fdf2f8",
  white: "#ffffff",
  unreadBg: "#f0f4ff",
};

const TYPE_META = {
  connection_request: { icon: "person-add", color: C.blue, bg: C.bluePale },
  post_liked:        { icon: "thumb-up",   color: C.accent, bg: C.accentPale },
  post_commented:    { icon: "chat-bubble", color: C.blue, bg: C.bluePale },
  comment_liked:     { icon: "favorite",   color: C.pink, bg: C.pinkPale },
  comment_replied:   { icon: "reply",      color: C.purple, bg: C.purplePale },
};

const FILTERS = [
  { key: "all",              label: "All",      icon: "notifications",  types: null },
  { key: "connection_request", label: "Requests", icon: "person-add",  types: ["connection_request"] },
  { key: "post_liked",       label: "Likes",    icon: "thumb-up",       types: ["post_liked"] },
  { key: "post_commented",   label: "Comments", icon: "chat-bubble",    types: ["post_commented"] },
  { key: "comment_liked",    label: "Comment Likes", icon: "favorite",  types: ["comment_liked"] },
  { key: "comment_replied",  label: "Replies",  icon: "reply",          types: ["comment_replied"] },
];

function NotificationAvatar({ uri, name }) {
  const [hasError, setHasError] = useState(false);
  const initials = useMemo(
    () =>
      (name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase(),
    [name]
  );

  if (uri && !hasError) {
    return (
      <Image source={{ uri }} style={s.avatar} onError={() => setHasError(true)} />
    );
  }

  return (
    <View style={s.avatarFallback}>
      <Text style={s.avatarInitials}>{initials}</Text>
    </View>
  );
}

export default function NotificationsTab({ navigation }) {
  const { showSnackbar } = useSnackbar();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const fabScale = useRef(new Animated.Value(1)).current;

  const toRelativeTime = (dateString) => {
    if (!dateString) return "now";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    return `${days}d`;
  };

  const loadNotifications = useCallback(async (filterKey) => {
    const filter = FILTERS.find((f) => f.key === (filterKey ?? activeFilter));
    const typeParam = filter?.types ? filter.types.join(",") : undefined;
    const result = await fetchNotifications(typeParam);
    if (result.success) setNotifications(result.notifications || []);
    else showSnackbar(result.message || "Unable to load notifications", "error");
  }, [showSnackbar, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(activeFilter);
    }, [activeFilter, loadNotifications])
  );

  useEffect(() => {
    loadNotifications(activeFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const onMarkAllRead = async () => {
    if (!notifications.some((n) => !n.isRead)) return;
    setMarkingAllRead(true);
    const result = await markAllNotificationsAsRead();
    setMarkingAllRead(false);
    if (!result.success) {
      showSnackbar(result.message || "Unable to mark all as read", "error");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showSnackbar("All caught up!", "success");
  };

  const onRespond = async (actorId, action) => {
    setBusyId(`${actorId}:${action}`);
    const result = await respondToConnectionRequest(actorId, action);
    setBusyId("");
    if (result.success) {
      await loadNotifications(activeFilter);
      showSnackbar(
        action === "accept" ? "Connection request accepted." : "Connection request declined.",
        "success"
      );
      return;
    }
    showSnackbar(result.message || "Unable to update request", "error");
  };

  const hasUnread = notifications.some((n) => !n.isRead);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleFabPress = () => {
    if (!hasUnread || markingAllRead) return;
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    onMarkAllRead();
  };

  return (
    <View style={s.root}>
      <ScreenShell
        navigation={navigation}
        routeName="Notifications"
        noPadding
        background={C.bg}
        contentContainerStyle={s.screenContent}
        notificationCount={unreadCount}
        stickyHeaderIndices={[0]}
      >
        {/* ── STICKY HEADER ── */}
        <View style={s.stickyHeader}>
          {/* Title row */}
          <View style={s.titleRow}>
            <Text style={s.screenTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={s.unreadBadge}>
                <Text style={s.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {FILTERS.map((filter) => {
              const isActive = filter.key === activeFilter;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={[s.filterChip, isActive && s.filterChipActive]}
                >
                  <MaterialIcons
                    name={filter.icon}
                    size={12}
                    color={isActive ? C.blue : C.soft}
                  />
                  <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── NOTIFICATION FEED ── */}
        <View style={s.feed}>
          {notifications.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <MaterialIcons name="notifications-none" size={30} color={C.blue} />
              </View>
              <Text style={s.emptyTitle}>All clear</Text>
              <Text style={s.emptySub}>
                {activeFilter === "all"
                  ? "No notifications yet. We'll let you know when something happens."
                  : "No notifications for this filter. Try another."}
              </Text>
            </View>
          ) : (
            notifications.map((notif, idx) => {
              const typeMeta = TYPE_META[notif.type] || TYPE_META.post_liked;
              const isUnread = !notif.isRead;
              const isLast = idx === notifications.length - 1;

              return (
                <View
                  key={notif._id}
                  style={[s.row, isUnread && s.rowUnread, !isLast && s.rowBorder]}
                >
                  {/* Unread accent bar */}
                  {isUnread && <View style={s.accentBar} />}

                  {/* Avatar + type badge */}
                  <View style={s.avatarWrap}>
                    <NotificationAvatar
                      uri={notif.actor?.profileImageUri}
                      name={notif.actor?.fullName}
                    />
                    <View style={[s.typeBadge, { backgroundColor: typeMeta.bg }]}>
                      <MaterialIcons name={typeMeta.icon} size={9} color={typeMeta.color} />
                    </View>
                  </View>

                  {/* Content */}
                  <View style={s.rowContent}>
                    <Text style={[s.message, isUnread && s.messageUnread]} numberOfLines={2}>
                      {notif.message || "You have a new notification"}
                    </Text>

                    <View style={s.metaRow}>
                      <Text style={s.metaUsername}>@{notif.actor?.username || "user"}</Text>
                      {notif.actor?.city ? (
                        <>
                          <Text style={s.metaDot}>·</Text>
                          <Text style={s.metaCity}>{notif.actor.city}</Text>
                        </>
                      ) : null}
                      <Text style={s.metaDot}>·</Text>
                      <Text style={s.metaTime}>{toRelativeTime(notif.createdAt)}</Text>
                    </View>

                    {/* Connection request actions */}
                    {notif.type === "connection_request" && notif.actionable && (
                      <View style={s.actionRow}>
                        <Pressable
                          style={[
                            s.acceptBtn,
                            busyId === `${notif.actor?._id}:accept` && s.btnBusy,
                          ]}
                          disabled={!notif.actor?._id || !!busyId}
                          onPress={() => onRespond(notif.actor?._id, "accept")}
                        >
                          <MaterialIcons name="check" size={13} color={C.white} />
                          <Text style={s.acceptBtnText}>Accept</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            s.declineBtn,
                            busyId === `${notif.actor?._id}:decline` && s.btnBusy,
                          ]}
                          disabled={!notif.actor?._id || !!busyId}
                          onPress={() => onRespond(notif.actor?._id, "decline")}
                        >
                          <Text style={s.declineBtnText}>Decline</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Unread dot */}
                  {isUnread && <View style={s.unreadDot} />}
                </View>
              );
            })
          )}
        </View>
      </ScreenShell>

      {/* Mark all read FAB */}
      {hasUnread && (
        <Animated.View
          style={[s.fab, { bottom: 100 + insets.bottom, transform: [{ scale: fabScale }] }]}
        >
          <Pressable
            onPress={handleFabPress}
            disabled={markingAllRead}
            style={({ pressed }) => [s.fabInner, pressed && { opacity: 0.85 }, markingAllRead && { opacity: 0.6 }]}
          >
            <MaterialIcons name="done-all" size={20} color={C.white} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 120,
  },

  /* ── STICKY HEADER ── */
  stickyHeader: {
    backgroundColor: C.bg,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: C.ink,
    letterSpacing: -0.6,
  },
  unreadBadge: {
    backgroundColor: C.blue,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.3,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 2,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
  },
  filterChipActive: {
    backgroundColor: C.bluePale,
    borderColor: C.blueLight,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.soft,
    letterSpacing: 0.1,
  },
  filterChipTextActive: {
    color: C.blue,
    fontWeight: "800",
  },

  /* ── FEED ── */
  feed: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.line,
  },

  /* ── NOTIFICATION ROW ── */
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    position: "relative",
  },
  rowUnread: {
    backgroundColor: C.unreadBg,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.lineLight,
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.blue,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },

  /* Avatar */
  avatarWrap: {
    position: "relative",
    marginRight: 12,
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.line,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.bluePale,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: "900",
    color: C.blue,
    letterSpacing: 0.5,
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.surface,
  },

  /* Row content */
  rowContent: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontWeight: "600",
    color: C.inkLight,
    lineHeight: 19,
    marginBottom: 4,
  },
  messageUnread: {
    fontWeight: "800",
    color: C.ink,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  metaUsername: {
    fontSize: 11,
    fontWeight: "700",
    color: C.soft,
  },
  metaDot: {
    fontSize: 11,
    color: C.line,
    fontWeight: "700",
  },
  metaCity: {
    fontSize: 11,
    fontWeight: "600",
    color: C.soft,
  },
  metaTime: {
    fontSize: 11,
    fontWeight: "700",
    color: C.soft,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.blue,
    marginLeft: 8,
    marginTop: 4,
    flexShrink: 0,
  },

  /* Connection request actions */
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.blue,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.2,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.coralPale,
    borderWidth: 1,
    borderColor: "#f1c0c0",
  },
  declineBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.coral,
    letterSpacing: 0.2,
  },
  btnBusy: {
    opacity: 0.5,
  },

  /* Empty state */
  emptyWrap: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.bluePale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: C.ink,
    letterSpacing: -0.3,
  },
  emptySub: {
    textAlign: "center",
    color: C.soft,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },

  /* FAB */
  fab: {
    position: "absolute",
    right: 18,
    zIndex: 50,
    elevation: 12,
  },
  fabInner: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.blue,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
