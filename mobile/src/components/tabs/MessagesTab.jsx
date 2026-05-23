import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Alert,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import * as ScreenCapture from "expo-screen-capture";
import * as Haptics from "expo-haptics";
import EmojiPicker from "rn-emoji-keyboard";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import { getMyConnections } from "../../services/users/userService";
import { getUnreadNotificationsCount } from "../../services/notifications/notificationService";
import AppTopHeader from "../AppTopHeader";
import {
  ensureChatSocket,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  setChatHandlers,
  clearConversationMessages,
  deleteConversation,
  getChatSocket,
  sendMessageViaSocket,
  emitReadReceipt,
  emitReaction,
  sendImageMessageHttp,
  markOneTimeViewed,
  getServerBaseUrl,
  setGroupChatHandlers,
  joinGroupRoom,
  leaveGroupRoom,
  sendGroupMessageViaSocket,
  emitGroupTyping,
  emitGroupReaction,
  fetchGroupMessages,
  sendGroupImageHttp,
  markGroupOneTimeViewed,
  fetchGroupChatSummaries,
  markGroupChatAsRead,
} from "../../services/chat/chatService";
import {
  decryptMessageText,
  encryptMessageText,
  encryptGroupMessage,
  decryptGroupMessage,
} from "../../services/chat/chatCrypto";
import { fetchMyMeetups, leaveMeetup } from "../../services/meetups/meetupService";
import { BAR_HEIGHT, FAB_LIFT } from "../../screens/MainTabs";
import { useUnreadMsg } from "../../store/UnreadMsgContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_BUBBLE_WIDTH = SCREEN_WIDTH * 0.6;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const COLORS = {
  ink: "#0a0a0a",
  inkLight: "#3d3d3d",
  inkMuted: "#888888",
  paper: "#f5f2ed",
  paperDark: "#ede9e2",
  accent: "#e8380d",
  accentBlue: "#004ac6",
  accentMint: "#007a5e",
  white: "#ffffff",
  cardBg: "#ffffff",
  border: "#e0dbd4",
  tagBlue: "#eef2ff",
  accentGold: "#c9890a",
  tagGold: "#fff8e6",
};

const TAB_BAR_TOTAL = BAR_HEIGHT + FAB_LIFT;

const toRelative = (dateString) => {
  if (!dateString) return "";
  const diff = Math.max(1, Date.now() - new Date(dateString).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const formatLastSeen = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return `last seen today at ${timeStr}`;
  if (target.getTime() === yesterday.getTime()) return `last seen yesterday at ${timeStr}`;

  const daysDiff = Math.floor((today - target) / 86400000);
  if (daysDiff < 7) {
    const dayName = date.toLocaleDateString([], { weekday: "long" });
    return `last seen ${dayName} at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return `last seen ${dateStr} at ${timeStr}`;
};

function Avatar({ uri, name, size = 48 }) {
  const initials = (name || "U")
    .split(" ")
    .map((p) => p?.[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[st.avatarImg, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View style={[st.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[st.avatarInitials, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const SwipeReplyIcon = React.memo(({ progress }) => {
  const scale = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 0.9, 1], extrapolate: "clamp" });
  const opacity = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.7, 1], extrapolate: "clamp" });
  return (
    <View style={st.swipeAction}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <MaterialIcons name="reply" size={22} color={COLORS.accentBlue} />
      </Animated.View>
    </View>
  );
});

const ReactionPills = React.memo(({ reactions, userId, onPress, mine }) => {
  if (!reactions?.length) return null;

  const grouped = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r.userId);
  }

  return (
    <View style={[st.reactionPillsRow, mine ? st.reactionPillsRowMine : st.reactionPillsRowPeer]}>
      {Object.entries(grouped).map(([emoji, userIds]) => {
        const iReacted = userIds.includes(String(userId));
        return (
          <Pressable
            key={emoji}
            style={[st.reactionPill, iReacted && st.reactionPillMine]}
            onPress={() => onPress(emoji)}
          >
            <Text style={st.reactionPillEmoji}>{emoji}</Text>
            {userIds.length > 1 && (
              <Text style={[st.reactionPillCount, iReacted && st.reactionPillCountMine]}>
                {userIds.length}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

const MessageBubble = React.memo(({ item, mine, user, activePeer, onReply, onJump, isHighlighted, isSearchMatch, decrypt, onViewOneTime, onLongPress, onQuickReact }) => {
  const swiperRef = useRef(null);
  const isTemp = String(item._id).startsWith("tmp-");
  const isRead = !!item.readAt;
  const isImage = item.messageType === "image";
  const isOneTime = item.isOneTimeView;
  const wasViewed = !!item.oneTimeViewedAt;
  const hasReactions = item.reactions?.length > 0;

  const renderLeftActions = useCallback((progress) => (
    <SwipeReplyIcon progress={progress} />
  ), []);

  const handleSwipeOpen = useCallback((direction) => {
    if (direction === "left") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onReply(item);
      swiperRef.current?.close();
    }
  }, [onReply, item]);

  const fullImageUri = isImage && item.imageUri
    ? `${getServerBaseUrl()}${item.imageUri}`
    : null;

  const renderImageContent = () => {
    if (isOneTime) {
      if (mine) {
        return (
          <View style={st.oneTimeBubbleContent}>
            <View style={st.oneTimeIconCircle}>
              <MaterialCommunityIcons name="camera-timer" size={24} color={COLORS.accentBlue} />
            </View>
            <Text style={st.oneTimeLabel}>One-time photo</Text>
            <Text style={st.oneTimeSub}>
              {wasViewed ? "Opened" : "Not opened yet"}
            </Text>
          </View>
        );
      }

      if (wasViewed) {
        return (
          <View style={st.oneTimeBubbleContent}>
            <View style={[st.oneTimeIconCircle, { backgroundColor: COLORS.border }]}>
              <MaterialCommunityIcons name="camera-off" size={24} color={COLORS.inkMuted} />
            </View>
            <Text style={[st.oneTimeLabel, { color: COLORS.inkMuted }]}>Photo opened</Text>
            <Text style={st.oneTimeSub}>No longer available</Text>
          </View>
        );
      }

      return (
        <Pressable style={st.oneTimeBubbleContent} onPress={() => onViewOneTime(item)}>
          <View style={[st.oneTimeIconCircle, { backgroundColor: COLORS.accentBlue + "18" }]}>
            <MaterialCommunityIcons name="eye-circle-outline" size={28} color={COLORS.accentBlue} />
          </View>
          <Text style={[st.oneTimeLabel, { color: COLORS.accentBlue }]}>Tap to view</Text>
          <Text style={st.oneTimeSub}>One-time photo</Text>
        </Pressable>
      );
    }

    return (
      <Pressable onPress={() => onViewOneTime({ ...item, _viewOnly: true })}>
        <Image
          source={{ uri: fullImageUri }}
          style={st.imageBubbleImg}
          resizeMode="cover"
        />
      </Pressable>
    );
  };

  return (
    <Swipeable
      ref={swiperRef}
      renderLeftActions={renderLeftActions}
      onSwipeableWillOpen={handleSwipeOpen}
      friction={1.5}
      leftThreshold={35}
      overshootLeft={false}
      overshootFriction={8}
      enableTrackpadTwoFingerGesture
    >
      <Pressable
        onLongPress={() => !isTemp && onLongPress(item)}
        delayLongPress={300}
        style={[st.bubbleRow, mine ? st.bubbleRowMine : st.bubbleRowPeer, hasReactions && { marginBottom: 22 }]}
      >
        {!mine && (
          <View style={st.bubbleAvatarWrap}>
            <Avatar uri={activePeer?.profileImageUri} name={activePeer?.fullName} size={28} />
          </View>
        )}
        <View style={{ maxWidth: "75%" }}>
          <View 
            style={[
              st.bubble, 
              mine ? st.bubbleMine : st.bubblePeer,
              isImage && !isOneTime && st.imageBubble,
              item.replyTo && st.bubbleWithReply,
              isSearchMatch && !isHighlighted && { backgroundColor: COLORS.accentBlue + '0D' },
              isHighlighted && { backgroundColor: COLORS.accentBlue + '22', borderWidth: 1, borderColor: COLORS.accentBlue },
            ]}
          >
            {item.replyTo && (
              <Pressable 
                style={[st.replyInBubble, mine ? st.replyInBubbleMine : st.replyInBubblePeer]}
                onPress={() => onJump(item.replyTo)}
              >
                <View style={st.replyIndicator} />
                <View style={st.replyContent}>
                  <Text style={st.replyUser} numberOfLines={1}>
                    {String(item.sender) === String(user?._id) ? "You" : (activePeer?.fullName || "They")}
                  </Text>
                  <Text style={st.replyText} numberOfLines={2}>
                    {item.replySnippet ? decrypt(item.replySnippet, null, activePeer._id) : "Original message"}
                  </Text>
                </View>
              </Pressable>
            )}
            {isImage ? renderImageContent() : (
              <Text style={[st.bubbleText, mine && st.bubbleTextMine]}>
                {item.text || "Encrypted message"}
              </Text>
            )}
            <View style={st.bubbleMetaRow}>
              {isImage && isOneTime && (
                <MaterialCommunityIcons
                  name="timer-outline"
                  size={12}
                  color={COLORS.inkMuted}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[st.bubbleTime, mine && st.bubbleTimeMine]}>
                {toRelative(item.createdAt)}
              </Text>
              {mine && (
                <View style={st.statusIconWrap}>
                  {isTemp ? (
                    <MaterialCommunityIcons 
                      name="clock-outline" 
                      size={12} 
                      color={COLORS.inkMuted} 
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={isRead ? "check-all" : "check"}
                      size={15}
                      color={isRead ? COLORS.accentBlue : COLORS.inkMuted}
                    />
                  )}
                </View>
              )}
            </View>
            <ReactionPills
              reactions={item.reactions}
              userId={String(user?._id)}
              onPress={(emoji) => onQuickReact(item._id, emoji)}
              mine={mine}
            />
          </View>
        </View>
        {mine && (
          <View style={st.bubbleAvatarWrap}>
            <Avatar uri={user?.profileImageUri} name={user?.fullName} size={28} />
          </View>
        )}
      </Pressable>
    </Swipeable>
  );
});

const TypingDot = ({ delay }) => {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);
  return <Animated.View style={[st.typingDot, { opacity: anim }]} />;
};

const TypingBubble = React.memo(() => (
  <View style={[st.bubbleRow, st.bubbleRowPeer]}>
    <View style={[st.bubble, st.bubblePeer, st.typingBubble]}>
      <View style={st.typingDotsRow}>
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </View>
  </View>
));

export default function MessagesTab({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { refreshUnreadMsgCount } = useUnreadMsg();

  const [conversations, setConversations] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isOneTimeView, setIsOneTimeView] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [viewingOneTime, setViewingOneTime] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [chatSearchActive, setChatSearchActive] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatSearchIndex, setChatSearchIndex] = useState(0);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showNewMsgSheet, setShowNewMsgSheet] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [msgMode, setMsgMode] = useState("yaaris");
  const [myMeetups, setMyMeetups] = useState([]);
  const [groupSummaries, setGroupSummaries] = useState({});
  const [activeGroupMeetup, setActiveGroupMeetup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [loadingGroupMsgs, setLoadingGroupMsgs] = useState(false);
  const [groupText, setGroupText] = useState("");
  const [groupTypers, setGroupTypers] = useState([]);
  const [groupReplyingTo, setGroupReplyingTo] = useState(null);
  const [groupReactionTarget, setGroupReactionTarget] = useState(null);
  const [showGroupEmojiPicker, setShowGroupEmojiPicker] = useState(false);
  const [groupImagePreview, setGroupImagePreview] = useState(null);
  const [groupIsOneTimeView, setGroupIsOneTimeView] = useState(false);
  const [groupSendingImage, setGroupSendingImage] = useState(false);
  const [groupViewingOneTime, setGroupViewingOneTime] = useState(null);
  const [groupViewingImage, setGroupViewingImage] = useState(null);
  const [showGroupScrollDown, setShowGroupScrollDown] = useState(false);
  const [groupSearchActive, setGroupSearchActive] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchIndex, setGroupSearchIndex] = useState(0);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showGroupClearModal, setShowGroupClearModal] = useState(false);
  const [showLeaveGroupModal, setShowLeaveGroupModal] = useState(false);
  const [groupHighlightedMessageId, setGroupHighlightedMessageId] = useState(null);

  const connectionsRef = useRef([]);
  const conversationsRef = useRef([]);
  const activePeerRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isLocalTypingRef = useRef(false);
  const chatSearchInputRef = useRef(null);
  const prevLastMsgIdRef = useRef(null);
  const pendingScrollRef = useRef(false);
  const scrollDownAnim = useRef(new Animated.Value(0)).current;
  const scrollDownVisibleRef = useRef(false);
  const groupFlatListRef = useRef(null);
  const groupScrollDownAnim = useRef(new Animated.Value(0)).current;
  const groupScrollDownVisibleRef = useRef(false);
  const groupPendingScrollRef = useRef(false);
  const prevGroupLastMsgIdRef = useRef(null);
  const groupTypingTimeoutRef = useRef(null);
  const isGroupTypingRef = useRef(false);
  const groupSearchInputRef = useRef(null);

  useEffect(() => {
    const target = showScrollDown && !chatSearchActive ? 1 : 0;
    Animated.timing(scrollDownAnim, {
      toValue: target,
      duration: target ? 200 : 180,
      useNativeDriver: true,
    }).start();
  }, [showScrollDown, chatSearchActive, scrollDownAnim]);

  const handleChatScroll = useCallback(({ nativeEvent }) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;

    if (distFromBottom > 300 && !scrollDownVisibleRef.current) {
      scrollDownVisibleRef.current = true;
      setShowScrollDown(true);
    } else if (distFromBottom < 120 && scrollDownVisibleRef.current) {
      scrollDownVisibleRef.current = false;
      setShowScrollDown(false);
    }

    if (contentOffset.y < 80 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  }, [hasMore, loadingOlder, loadOlderMessages]);

  const scrollToBottom = useCallback((animated = true) => {
    if (chatSearchActive) return;
    const doScroll = () => flatListRef.current?.scrollToEnd({ animated });
    doScroll();
    setTimeout(doScroll, 100);
    setTimeout(doScroll, 300);
    setTimeout(doScroll, 600);
  }, [chatSearchActive]);

  useEffect(() => {
    if (chatSearchActive || messages.length === 0) {
      prevLastMsgIdRef.current = null;
      return;
    }
    const lastId = String(messages[messages.length - 1]._id);
    if (prevLastMsgIdRef.current !== lastId) {
      const isInitial = prevLastMsgIdRef.current === null;
      prevLastMsgIdRef.current = lastId;
      pendingScrollRef.current = true;
      scrollToBottom(!isInitial);
      const timer = setTimeout(() => { pendingScrollRef.current = false; }, 1500);
      return () => clearTimeout(timer);
    }
  }, [messages, chatSearchActive, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => scrollToBottom(true));
    return () => sub.remove();
  }, [scrollToBottom]);

  useEffect(() => {
    if (isPeerTyping) scrollToBottom(true);
  }, [isPeerTyping, scrollToBottom]);

  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { activePeerRef.current = activePeer; }, [activePeer]);

  const decrypt = useCallback(
    (ct, iv, peerId) => {
      if (!ct) return "";
      // Handle snippet format `iv:ciphertext`
      if (!iv && ct.includes(":")) {
        const [ivPart, ctPart] = ct.split(":");
        return decryptMessageText(ctPart, ivPart, user?._id, peerId);
      }
      return decryptMessageText(ct, iv, user?._id, peerId);
    },
    [user?._id]
  );

  const loadConversations = useCallback(async () => {
    try {
      setLoadingList(true);
      const [convRows, connRows] = await Promise.all([
        fetchConversations(),
        getMyConnections(),
      ]);
      setConversations(
        (convRows || []).map((item) => ({
          ...item,
          preview:
            decrypt(
              item?.lastMessage?.ciphertext || "",
              item?.lastMessage?.iv || "",
              item?.peer?._id
            ) || "Tap to chat",
        }))
      );
      setConnections(connRows?.connections || []);
    } catch (_e) {
      showSnackbar("Could not load chats", "error");
    } finally {
      setLoadingList(false);
    }
  }, [decrypt, showSnackbar]);

  const PAGE_SIZE = 50;

  const loadMessages = useCallback(
    async (peer) => {
      if (!peer?._id || !user?._id) return;
      try {
        setLoadingMessages(true);
        setHasMore(true);
        const rows = await fetchMessages(peer._id, { limit: PAGE_SIZE });
        setMessages(
          (rows || []).map((msg) => ({
            ...msg,
            text: decrypt(msg.ciphertext, msg.iv, peer._id),
          }))
        );
        if ((rows || []).length < PAGE_SIZE) setHasMore(false);
        emitReadReceipt(peer._id);
        markConversationRead(peer._id).catch(() => {});
      } catch (_e) {
        showSnackbar("Could not load chat", "error");
      } finally {
        setLoadingMessages(false);
      }
    },
    [decrypt, showSnackbar, user?._id]
  );

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || !activePeerRef.current?._id) return;
    const oldest = messages[0];
    if (!oldest?.createdAt) return;

    setLoadingOlder(true);
    try {
      const peerId = activePeerRef.current._id;
      const rows = await fetchMessages(peerId, { before: oldest.createdAt, limit: PAGE_SIZE });
      if ((rows || []).length < PAGE_SIZE) setHasMore(false);
      if (rows?.length) {
        const decrypted = rows.map((msg) => ({
          ...msg,
          text: decrypt(msg.ciphertext, msg.iv, peerId),
        }));
        setMessages((prev) => [...decrypted, ...prev]);
      }
    } catch (_e) {
      /* silently fail for pagination */
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages, decrypt]);

  const upsertConversation = useCallback(
    (msg, peer) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c.conversationKey === msg.conversationKey);
        const isForMe = String(msg.receiver) === String(user?._id);
        const isOpen = String(activePeerRef.current?._id || "") === String(peer?._id || "");

        const next = {
          conversationKey: msg.conversationKey,
          peer,
          lastMessage: msg,
          unreadCount: isForMe && !isOpen ? (existing?.unreadCount || 0) + 1 : existing?.unreadCount || 0,
          preview: decrypt(msg.ciphertext || "", msg.iv || "", peer?._id) || "Tap to chat",
        };
        return [next, ...prev.filter((c) => c.conversationKey !== msg.conversationKey)];
      });
    },
    [decrypt, user?._id]
  );

  useEffect(() => {
    if (!token || !user?._id) return;

    ensureChatSocket(token);

    setChatHandlers(
      (payload) => {
        const msg = payload?.message;
        const clientTempId = payload?.clientTempId;
        if (!msg?._id) return;

        const senderId = String(msg.sender);
        const receiverId = String(msg.receiver);
        const me = String(user._id);
        const peerId = senderId === me ? receiverId : senderId;

        const peer =
          connectionsRef.current.find((c) => String(c._id) === peerId) ||
          conversationsRef.current.find((c) => String(c.peer?._id) === peerId)?.peer;

        if (peer?._id) upsertConversation(msg, peer);

        if (activePeerRef.current?._id && String(activePeerRef.current._id) === peerId) {
          const decryptedText = decrypt(msg.ciphertext, msg.iv, peerId);

          setMessages((prev) => {
            if (clientTempId && senderId === me) {
              const tempIdx = prev.findIndex((m) => String(m._id) === clientTempId);
              if (tempIdx !== -1) {
                const updated = [...prev];
                updated[tempIdx] = { ...msg, text: decryptedText };
                return updated;
              }
            }
            if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
            return [...prev, { ...msg, text: decryptedText }];
          });

          if (receiverId === me) {
            emitReadReceipt(peerId);
            refreshUnreadMsgCount();
          }
        } else if (receiverId === me) {
          refreshUnreadMsgCount();
        }
      },
      ({ conversationKey, byUserId }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.conversationKey === conversationKey && String(m.sender) === String(user?._id)
              ? { ...m, readAt: new Date().toISOString() }
              : m
          )
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.conversationKey === conversationKey
              ? { ...c, lastMessage: { ...c.lastMessage, readAt: new Date().toISOString() } }
              : c
          )
        );
      },
      ({ userId, isOnline, lastSeenAt }) => {
        setConnections((prev) =>
          prev.map((c) => (String(c._id) === String(userId) ? { ...c, isOnline, lastSeenAt } : c))
        );
        setConversations((prev) =>
          prev.map((c) =>
            String(c.peer?._id) === String(userId)
              ? { ...c, peer: { ...c.peer, isOnline, lastSeenAt } }
              : c
          )
        );
        if (activePeerRef.current?._id && String(activePeerRef.current._id) === String(userId)) {
          setActivePeer((prev) => (prev ? { ...prev, isOnline, lastSeenAt } : prev));
        }
      },
      ({ userId, isTyping }) => {
        if (activePeerRef.current?._id && String(activePeerRef.current._id) === String(userId)) {
          setIsPeerTyping(isTyping);
        }
      },
      ({ messageId, reactions }) => {
        setMessages((prev) =>
          prev.map((m) =>
            String(m._id) === String(messageId) ? { ...m, reactions } : m
          )
        );
      }
    );
  }, [token, user?._id, decrypt, upsertConversation, refreshUnreadMsgCount]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      refreshUnreadMsgCount();
      let alive = true;
      (async () => {
        const r = await getUnreadNotificationsCount();
        if (alive && r.success) setUnreadNotifications(r.count || 0);
      })();
      return () => { alive = false; };
    }, [loadConversations, refreshUnreadMsgCount])
  );

  useEffect(() => {
    const meetup = route?.params?.openGroupMeetup;
    if (meetup?._id) {
      setMsgMode("meetups");
      setTimeout(() => openGroupChat(meetup), 300);
      navigation.setParams({ openGroupMeetup: undefined });
    }
  }, [route?.params?.openGroupMeetup]);

  useEffect(() => {
    const peer = route?.params?.openDmPeer;
    if (peer?._id) {
      setMsgMode("yaaris");
      setTimeout(() => openChat(peer), 300);
      navigation.setParams({ openDmPeer: undefined });
    }
  }, [route?.params?.openDmPeer]);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: (activePeer || activeGroupMeetup) ? { display: "none" } : undefined,
    });
  }, [activePeer, activeGroupMeetup, navigation]);

  const openChat = async (peer) => {
    prevLastMsgIdRef.current = null;
    pendingScrollRef.current = false;
    setActivePeer(peer);
    setIsPeerTyping(false);
    setConversations((prev) =>
      prev.map((c) =>
        String(c.peer?._id) === String(peer?._id) ? { ...c, unreadCount: 0 } : c
      )
    );
    await loadMessages(peer);
    emitReadReceipt(peer._id);
    refreshUnreadMsgCount();
  };

  const scrollToMessage = useCallback((msgId) => {
    const index = messages.findIndex((m) => String(m._id) === String(msgId));
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(String(msgId));
      setTimeout(() => setHighlightedMessageId(null), 1500);
    } else {
      showSnackbar("Original message not found in recent history", "info");
    }
  }, [messages, showSnackbar]);

  const sendNow = async () => {
    const text = input.trim();
    if (!text) return;
    if (!activePeer?._id) return;
    if (!user?._id) return;

    const peerId = activePeer._id;
    setInput("");
    
    if (isLocalTypingRef.current) {
      isLocalTypingRef.current = false;
      getChatSocket()?.emit("chat:typing", { to: peerId, isTyping: false });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    let encrypted;
    try {
      encrypted = encryptMessageText(text, user._id, peerId);
    } catch (encErr) {
      showSnackbar("Encryption error", "error");
      return;
    }

    const replyData = replyingTo ? encryptMessageText(replyingTo.text.slice(0, 100), user._id, peerId) : null;
    const replySnippet = replyData ? `${replyData.iv}:${replyData.ciphertext}` : null;

    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      sender: user._id,
      receiver: peerId,
      conversationKey: [String(user._id), String(peerId)].sort().join(":"),
      text,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      replyTo: replyingTo?._id || null,
      replySnippet,
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    setMessages((prev) => [...prev, optimistic]);
    setReplyingTo(null);

    try {
      await sendMessageViaSocket({
        to: peerId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        clientTempId: tempId,
        replyTo: optimistic.replyTo,
        replySnippet: optimistic.replySnippet,
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      showSnackbar("Message failed to send", "error");
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showSnackbar("Permission to access gallery is required", "error");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert("Image too large", "Please select an image under 2MB.");
        return;
      }
      setImagePreview(asset);
      setIsOneTimeView(false);
    } catch (_e) {
      showSnackbar("Could not pick image", "error");
    }
  };

  const sendImage = async () => {
    if (!imagePreview || !activePeer?._id || !user?._id) return;
    const peerId = activePeer._id;

    setSendingImage(true);
    try {
      const encrypted = encryptMessageText("📷 Photo", user._id, peerId);
      await sendImageMessageHttp(peerId, {
        uri: imagePreview.uri,
        fileName: imagePreview.fileName || `chat-${Date.now()}.jpg`,
        mimeType: imagePreview.mimeType || "image/jpeg",
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        isOneTimeView,
      });
      setImagePreview(null);
      setIsOneTimeView(false);
    } catch (_e) {
      showSnackbar("Failed to send image", "error");
    } finally {
      setSendingImage(false);
    }
  };

  const handleViewOneTime = async (item) => {
    if (item._viewOnly) {
      const fullUri = `${getServerBaseUrl()}${item.imageUri}`;
      setViewingImage(fullUri);
      return;
    }

    if (!item.isOneTimeView || item.oneTimeViewedAt) return;
    const fullUri = `${getServerBaseUrl()}${item.imageUri}`;
    setViewingOneTime({ ...item, fullUri });
    try {
      await ScreenCapture.preventScreenCaptureAsync("oneTimeView");
    } catch (_e) { /* best effort */ }
    try {
      await markOneTimeViewed(item._id);
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(item._id)
            ? { ...m, oneTimeViewedAt: new Date().toISOString() }
            : m
        )
      );
    } catch (_e) {
      showSnackbar("Could not mark image as viewed", "error");
    }
  };

  const closeOneTimeViewer = async () => {
    setViewingOneTime(null);
    try {
      await ScreenCapture.allowScreenCaptureAsync("oneTimeView");
    } catch (_e) { /* best effort */ }
  };

  const closeImageViewer = () => {
    setViewingImage(null);
  };

  const onBubbleLongPress = useCallback((msg) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReactionTarget(msg);
    setShowFullEmojiPicker(false);
  }, []);

  const handleReact = useCallback(async (messageId, emoji) => {
    Haptics.selectionAsync();
    try {
      await emitReaction(String(messageId), emoji);
    } catch (_e) {
      showSnackbar("Could not react", "error");
    }
    setReactionTarget(null);
    setShowFullEmojiPicker(false);
  }, [showSnackbar]);

  const handleClearChat = async () => {
    if (!activePeer?._id) return;
    try {
      await clearConversationMessages(activePeer._id);
      setMessages([]);
      setShowClearModal(false);
      setShowChatMenu(false);
      showSnackbar("Chat cleared successfully", "success");
      loadConversations();
    } catch (err) {
      showSnackbar("Failed to clear chat", "error");
    }
  };

  const handleDeleteConversation = (item) => {
    setDeleteTarget(item);
  };

  const confirmDeleteConversation = async () => {
    if (!deleteTarget?.peer?._id) return;
    try {
      await deleteConversation(deleteTarget.peer._id);
      showSnackbar("Chat deleted and removed from list", "success");
      loadConversations();
    } catch {
      showSnackbar("Failed to delete chat", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const n = c.peer?.fullName?.toLowerCase() || "";
      const u = c.peer?.username?.toLowerCase() || "";
      return n.includes(q) || u.includes(q);
    });
  }, [conversations, search]);

  const filteredConnections = useMemo(() => {
    const q = newMsgSearch.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) => {
      const n = c.fullName?.toLowerCase() || "";
      const u = c.username?.toLowerCase() || "";
      return n.includes(q) || u.includes(q);
    });
  }, [connections, newMsgSearch]);

  const sheetFade = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(sheetFade, {
      toValue: showNewMsgSheet ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showNewMsgSheet, sheetFade]);

  const chatSearchMatchIds = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    if (!q || !chatSearchActive) return [];
    return messages
      .filter((m) => (m.text || "").toLowerCase().includes(q))
      .map((m) => String(m._id));
  }, [messages, chatSearchQuery, chatSearchActive]);

  const chatSearchMatchSet = useMemo(() => new Set(chatSearchMatchIds), [chatSearchMatchIds]);
  const chatSearchFocusId = chatSearchMatchIds[chatSearchIndex] || null;

  useEffect(() => {
    setChatSearchIndex(Math.max(0, chatSearchMatchIds.length - 1));
  }, [chatSearchQuery, chatSearchMatchIds.length]);

  useEffect(() => {
    if (!chatSearchFocusId) return;
    const msgIndex = messages.findIndex((m) => String(m._id) === chatSearchFocusId);
    if (msgIndex !== -1) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: msgIndex, animated: true, viewPosition: 0.5 });
      }, 100);
    }
  }, [chatSearchFocusId]);

  const chatSearchNav = useCallback((direction) => {
    if (!chatSearchMatchIds.length) return;
    Haptics.selectionAsync();
    setChatSearchIndex((prev) => {
      if (direction === "up") {
        return prev > 0 ? prev - 1 : chatSearchMatchIds.length - 1;
      }
      return prev < chatSearchMatchIds.length - 1 ? prev + 1 : 0;
    });
  }, [chatSearchMatchIds.length]);

  const closeChatSearch = useCallback(() => {
    setChatSearchActive(false);
    setChatSearchQuery("");
    setChatSearchIndex(0);
  }, []);

  const headerBlock = (
    <AppTopHeader
      onBackPress={() => {
        if (activePeer) { setActivePeer(null); return; }
        if (navigation.canGoBack()) { navigation.goBack(); return; }
        navigation.navigate("Home");
      }}
      onNotificationPress={() => navigation.navigate("Notifications")}
      backDisabled={!activePeer && !navigation.canGoBack()}
      notificationCount={unreadNotifications}
    />
  );

  // ── GROUP CHAT LOGIC ──

  const loadMyMeetups = useCallback(async () => {
    const [res, summaries] = await Promise.all([
      fetchMyMeetups(),
      fetchGroupChatSummaries().catch(() => ({})),
    ]);
    if (res.success) setMyMeetups(res.meetups);
    setGroupSummaries(summaries);
  }, []);

  useEffect(() => {
    if (msgMode === "meetups") loadMyMeetups();
  }, [msgMode, loadMyMeetups]);

  const openGroupChat = useCallback(async (meetup) => {
    setActiveGroupMeetup(meetup);
    setGroupMessages([]);
    setGroupText("");
    setGroupTypers([]);
    setGroupReplyingTo(null);
    setGroupSearchActive(false);
    setGroupSearchQuery("");
    setLoadingGroupMsgs(true);
    groupPendingScrollRef.current = true;
    joinGroupRoom(meetup._id);
    markGroupChatAsRead(meetup._id).catch(() => {});

    setGroupChatHandlers(
      (msg) => {
        if (msg.meetupId === meetup._id) {
          setGroupMessages((prev) => {
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        }
      },
      (payload) => {
        if (payload.userId !== user?._id) {
          setGroupTypers((prev) => {
            if (payload.isTyping) {
              return prev.includes(payload.userId) ? prev : [...prev, payload.userId];
            }
            return prev.filter((id) => id !== payload.userId);
          });
        }
      },
      (payload) => {
        setGroupMessages((prev) =>
          prev.map((m) => (String(m._id) === String(payload.messageId) ? { ...m, reactions: payload.reactions } : m))
        );
      }
    );

    try {
      const msgs = await fetchGroupMessages(meetup._id, { limit: 50 });
      const decryptedMsgs = msgs.map((m) => ({
        ...m,
        text: m.messageType === "image" ? "[Image]" : decryptGroupMessage(m.ciphertext, m.iv, meetup._id),
      }));
      setGroupMessages(decryptedMsgs);
    } catch {}
    setLoadingGroupMsgs(false);
  }, [user?._id]);

  const closeGroupChat = useCallback(async () => {
    if (activeGroupMeetup) {
      leaveGroupRoom(activeGroupMeetup._id);
      markGroupChatAsRead(activeGroupMeetup._id).catch(() => {});
    }
    setActiveGroupMeetup(null);
    setGroupMessages([]);
    setGroupChatHandlers(null, null, null);
    setGroupReplyingTo(null);
    setGroupSearchActive(false);
    prevGroupLastMsgIdRef.current = null;
    loadMyMeetups();
  }, [activeGroupMeetup, loadMyMeetups]);

  const decryptGroupMsg = useCallback((ct, iv, _peerId) => {
    if (!ct || !activeGroupMeetup) return "";
    if (!iv && ct.includes(":")) {
      const [ivPart, ctPart] = ct.split(":");
      return decryptGroupMessage(ctPart, ivPart, activeGroupMeetup._id);
    }
    return decryptGroupMessage(ct, iv, activeGroupMeetup._id);
  }, [activeGroupMeetup]);

  const sendGroupMsg = useCallback(async () => {
    const txt = groupText.trim();
    if (!txt || !activeGroupMeetup) return;
    setGroupText("");
    const { ciphertext, iv } = encryptGroupMessage(txt, activeGroupMeetup._id);
    try {
      await sendGroupMessageViaSocket({
        meetupId: activeGroupMeetup._id,
        ciphertext,
        iv,
        replyTo: groupReplyingTo?._id || null,
        replySnippet: groupReplyingTo ? (() => { const enc = encryptGroupMessage((groupReplyingTo.text || "").slice(0, 100), activeGroupMeetup._id); return `${enc.iv}:${enc.ciphertext}`; })() : null,
      });
    } catch {}
    setGroupReplyingTo(null);
  }, [groupText, activeGroupMeetup, groupReplyingTo]);

  const groupScrollToBottom = useCallback((animated = true) => {
    if (groupSearchActive) return;
    const doScroll = () => groupFlatListRef.current?.scrollToEnd({ animated });
    doScroll();
    setTimeout(doScroll, 100);
    setTimeout(doScroll, 300);
  }, [groupSearchActive]);

  const handleGroupChatScroll = useCallback(({ nativeEvent }) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distFromBottom > 300 && !groupScrollDownVisibleRef.current) {
      groupScrollDownVisibleRef.current = true;
      setShowGroupScrollDown(true);
    } else if (distFromBottom < 120 && groupScrollDownVisibleRef.current) {
      groupScrollDownVisibleRef.current = false;
      setShowGroupScrollDown(false);
    }
  }, []);

  useEffect(() => {
    const target = showGroupScrollDown && !groupSearchActive ? 1 : 0;
    Animated.timing(groupScrollDownAnim, {
      toValue: target,
      duration: target ? 200 : 150,
      useNativeDriver: true,
    }).start();
  }, [showGroupScrollDown, groupSearchActive, groupScrollDownAnim]);

  useEffect(() => {
    const lastId = groupMessages[groupMessages.length - 1]?._id;
    const isInitial = prevGroupLastMsgIdRef.current === null;
    if (lastId && lastId !== prevGroupLastMsgIdRef.current) {
      prevGroupLastMsgIdRef.current = lastId;
      if (!groupSearchActive && !groupScrollDownVisibleRef.current) {
        groupPendingScrollRef.current = true;
        groupScrollToBottom(!isInitial);
        const timer = setTimeout(() => { groupPendingScrollRef.current = false; }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [groupMessages, groupSearchActive, groupScrollToBottom]);

  const groupPickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { showSnackbar("Photo access needed", "info"); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
          showSnackbar("Image must be under 2MB", "error");
          return;
        }
        setGroupImagePreview(asset);
        setGroupIsOneTimeView(false);
      }
    } catch {}
  };

  const sendGroupImage = async () => {
    if (!groupImagePreview || !activeGroupMeetup) return;
    setGroupSendingImage(true);
    try {
      const { ciphertext, iv } = encryptGroupMessage("📷 Photo", activeGroupMeetup._id);
      await sendGroupImageHttp(activeGroupMeetup._id, {
        uri: groupImagePreview.uri,
        fileName: `group-${Date.now()}.jpg`,
        mimeType: groupImagePreview.mimeType || "image/jpeg",
        ciphertext,
        iv,
        isOneTimeView: groupIsOneTimeView,
      });
      setGroupImagePreview(null);
      setGroupIsOneTimeView(false);
    } catch { showSnackbar("Failed to send image", "error"); }
    setGroupSendingImage(false);
  };

  const handleGroupViewOneTime = async (item) => {
    if (item._viewOnly) {
      const serverBase = getServerBaseUrl();
      setGroupViewingImage(item.imageUri?.startsWith("http") ? item.imageUri : `${serverBase}${item.imageUri}`);
      return;
    }
    if (!item.isOneTimeView || item.oneTimeViewedAt) return;
    const serverBase = getServerBaseUrl();
    const fullUri = item.imageUri?.startsWith("http") ? item.imageUri : `${serverBase}${item.imageUri}`;
    setGroupViewingOneTime({ ...item, fullUri });
    try { await ScreenCapture.preventScreenCaptureAsync("group-one-time"); } catch {}
    try {
      await markGroupOneTimeViewed(item._id);
      setGroupMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(item._id)
            ? { ...m, oneTimeViewedAt: true }
            : m
        )
      );
    } catch {
      showSnackbar("Could not mark image as viewed", "error");
    }
  };

  const closeGroupOneTimeViewer = async () => {
    setGroupViewingOneTime(null);
    try { await ScreenCapture.allowScreenCaptureAsync("group-one-time"); } catch {}
  };

  const onGroupBubbleLongPress = useCallback((msg) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGroupReactionTarget(msg);
  }, []);

  const handleGroupReact = useCallback(async (messageId, emoji) => {
    Haptics.selectionAsync();
    setGroupReactionTarget(null);
    setShowGroupEmojiPicker(false);
    try { await emitGroupReaction(messageId, emoji); } catch {}
  }, []);

  const groupOnReply = useCallback((msg) => {
    setGroupReplyingTo(msg);
  }, []);

  const groupScrollToMessage = useCallback((msgId) => {
    const index = groupMessages.findIndex((m) => String(m._id) === String(msgId));
    if (index >= 0) {
      groupFlatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setGroupHighlightedMessageId(String(msgId));
      setTimeout(() => setGroupHighlightedMessageId(null), 1500);
    } else {
      showSnackbar("Original message not found in recent history", "info");
    }
  }, [groupMessages, showSnackbar]);

  const groupSearchMatchIds = useMemo(() => {
    const q = groupSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return groupMessages
      .filter((m) => {
        const text = m.text || "";
        return text.toLowerCase().includes(q);
      })
      .map((m) => String(m._id));
  }, [groupSearchQuery, groupMessages]);

  const groupSearchMatchSet = useMemo(() => new Set(groupSearchMatchIds), [groupSearchMatchIds]);
  const groupSearchFocusId = groupSearchMatchIds[groupSearchIndex] || null;

  useEffect(() => {
    if (groupSearchFocusId) groupScrollToMessage(groupSearchFocusId);
  }, [groupSearchFocusId, groupScrollToMessage]);

  const groupSearchNav = useCallback((direction) => {
    if (!groupSearchMatchIds.length) return;
    setGroupSearchIndex((prev) => {
      if (direction === "up") return prev > 0 ? prev - 1 : groupSearchMatchIds.length - 1;
      return prev < groupSearchMatchIds.length - 1 ? prev + 1 : 0;
    });
  }, [groupSearchMatchIds]);

  const closeGroupSearch = useCallback(() => {
    setGroupSearchActive(false);
    setGroupSearchQuery("");
    setGroupSearchIndex(0);
  }, []);

  const handleGroupClearChat = async () => {
    setGroupMessages([]);
    setShowGroupClearModal(false);
    setShowGroupMenu(false);
    showSnackbar("Chat cleared for you", "success");
  };

  const handleLeaveGroup = async () => {
    if (!activeGroupMeetup) return;
    const res = await leaveMeetup(activeGroupMeetup._id);
    setShowLeaveGroupModal(false);
    if (res.success) {
      leaveGroupRoom(activeGroupMeetup._id);
      setActiveGroupMeetup(null);
      setGroupMessages([]);
      setGroupChatHandlers(null, null, null);
      loadMyMeetups();
      showSnackbar("You left the group", "success");
    } else {
      showSnackbar(res.message || "Could not leave group", "error");
    }
  };

  const getTypingLabel = () => {
    const count = groupTypers.length;
    if (count === 0) return null;
    const members = activeGroupMeetup?.members || [];
    if (count === 1) {
      const typer = members.find((m) => String(m._id || m) === String(groupTypers[0]));
      const name = typer?.fullName?.split(" ")[0] || "Someone";
      return `${name} is typing...`;
    }
    return `${count} people are typing...`;
  };

  /* ─── CHAT VIEW ─── */
  if (activePeer?._id) {
    return (
      <KeyboardAvoidingView
        style={st.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="dark" />
        {chatSearchActive ? (
          <View style={[st.chatSearchHeader, { paddingTop: insets.top + 14 }]}>
            <Pressable onPress={closeChatSearch} style={st.chatBackArrow}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.ink} />
            </Pressable>
            <View style={st.chatSearchInputWrap}>
              <MaterialIcons name="search" size={18} color={COLORS.inkMuted} />
              <TextInput
                ref={chatSearchInputRef}
                value={chatSearchQuery}
                onChangeText={setChatSearchQuery}
                placeholder="Search messages..."
                placeholderTextColor={COLORS.inkMuted}
                style={st.chatSearchInput}
                autoFocus
                returnKeyType="search"
              />
              {chatSearchQuery.length > 0 && (
                <Pressable onPress={() => setChatSearchQuery("")}>
                  <MaterialIcons name="close" size={18} color={COLORS.inkMuted} />
                </Pressable>
              )}
            </View>
            {chatSearchQuery.trim().length > 0 && (
              <Text style={st.chatSearchCounter}>
                {chatSearchMatchIds.length > 0
                  ? `${chatSearchIndex + 1}/${chatSearchMatchIds.length}`
                  : "0"}
              </Text>
            )}
            <Pressable
              onPress={() => chatSearchNav("up")}
              disabled={chatSearchMatchIds.length === 0}
              style={[st.chatSearchNavBtn, chatSearchMatchIds.length === 0 && { opacity: 0.3 }]}
            >
              <MaterialIcons name="keyboard-arrow-up" size={24} color={COLORS.ink} />
            </Pressable>
            <Pressable
              onPress={() => chatSearchNav("down")}
              disabled={chatSearchMatchIds.length === 0}
              style={[st.chatSearchNavBtn, chatSearchMatchIds.length === 0 && { opacity: 0.3 }]}
            >
              <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.ink} />
            </Pressable>
          </View>
        ) : (
          <View style={[st.chatHeader, { paddingTop: insets.top + 14 }]}>
            <Pressable onPress={() => setActivePeer(null)} style={st.chatBackArrow}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.ink} />
            </Pressable>
            <Avatar uri={activePeer.profileImageUri} name={activePeer.fullName} size={42} />
            <View style={st.chatHeaderInfo}>
              <Text style={st.chatHeaderName} numberOfLines={1}>
                {activePeer.fullName || activePeer.username}
              </Text>
              {isPeerTyping ? (
                <Text style={[st.chatStatusText, { color: COLORS.accentMint, fontWeight: "900" }]}>typing...</Text>
              ) : activePeer.isOnline ? (
                <View style={st.chatEncRow}>
                  <View style={st.onlineDotSmall} />
                  <Text style={[st.chatStatusText, { color: COLORS.accentMint }]}>Online</Text>
                </View>
              ) : (
                <Text style={st.chatStatusText} numberOfLines={1}>
                  {formatLastSeen(activePeer.lastSeenAt)}
                </Text>
              )}
            </View>
            <Pressable 
              onPress={() => setShowChatMenu(true)} 
              style={st.chatHeaderDots}
            >
              <MaterialIcons name="more-vert" size={24} color={COLORS.ink} />
            </Pressable>
          </View>
        )}

        {/* ── CHAT DROPDOWN MENU ── */}
        <Modal
          visible={showChatMenu}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowChatMenu(false)}
        >
          <Pressable 
            style={st.menuOverlay} 
            onPress={() => setShowChatMenu(false)}
          >
            <View style={[st.menuContent, { top: insets.top + 52 }]}>
              <View style={st.menuInner}>
                <Pressable 
                  style={({ pressed }) => [st.menuItem, pressed && st.menuItemPressed]}
                  onPress={() => {
                    setShowChatMenu(false);
                    setChatSearchActive(true);
                    setChatSearchQuery("");
                    setChatSearchIndex(0);
                    setTimeout(() => chatSearchInputRef.current?.focus(), 300);
                  }}
                >
                  <View style={[st.menuIconWrap, { backgroundColor: COLORS.accentBlue + "14" }]}>
                    <MaterialIcons name="search" size={18} color={COLORS.accentBlue} />
                  </View>
                  <View style={st.menuTextCol}>
                    <Text style={st.menuItemTitle}>Search</Text>
                    <Text style={st.menuItemSub}>Find messages in chat</Text>
                  </View>
                </Pressable>
                <View style={st.menuDivider} />
                <Pressable 
                  style={({ pressed }) => [st.menuItem, pressed && st.menuItemPressed]}
                  onPress={() => {
                    setShowChatMenu(false);
                    setShowClearModal(true);
                  }}
                >
                  <View style={[st.menuIconWrap, { backgroundColor: COLORS.accent + "14" }]}>
                    <MaterialIcons name="delete-outline" size={18} color={COLORS.accent} />
                  </View>
                  <View style={st.menuTextCol}>
                    <Text style={[st.menuItemTitle, { color: COLORS.accent }]}>Clear chat</Text>
                    <Text style={st.menuItemSub}>Delete all messages</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── CONFIRMATION MODAL ── */}
        <Modal
          visible={showClearModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowClearModal(false)}
        >
          <View style={st.modalOverlay}>
            <View style={st.modalContent}>
              <View style={st.modalHeader}>
                <View style={st.warningCircle}>
                  <MaterialIcons name="warning" size={32} color={COLORS.accent} />
                </View>
                <Text style={st.modalTitle}>Clear chat?</Text>
              </View>
              <Text style={st.modalText}>
                Are you sure you want to clear the chat? You will not be able to restore the messages once deleted.
              </Text>
              <View style={st.modalActions}>
                <Pressable 
                  style={[st.modalBtn, st.modalBtnCancel]} 
                  onPress={() => setShowClearModal(false)}
                >
                  <Text style={st.modalBtnTextCancel}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[st.modalBtn, st.modalBtnConfirm]} 
                  onPress={handleClearChat}
                >
                  <Text style={st.modalBtnTextConfirm}>Clear</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <View style={st.chatBody}>
          <View style={st.watermarkWrap} pointerEvents="none">
            <View style={st.wmBadge}>
              <Text style={st.wmMain}>
                <Text style={st.wmCity}>ban</Text>
                <Text style={st.wmYaari}>dhuu</Text>
              </Text>
              <View style={st.wmLineRow}>
                <View style={st.wmLineLeft} />
                <View style={st.wmLineDot} />
                <View style={st.wmLineRight} />
              </View>
            </View>
          </View>

          <View style={st.chatListArea}>
            {loadingMessages ? (
              <View style={st.chatLoading}>
                <ActivityIndicator color={COLORS.accentBlue} size="large" />
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => String(item._id)}
                style={st.chatBody}
                contentContainerStyle={st.bubbleList}
              keyboardShouldPersistTaps="handled"
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              onContentSizeChange={() => {
                if (pendingScrollRef.current) {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }
              }}
              onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                  }, 300);
                }}
                onScroll={handleChatScroll}
                scrollEventThrottle={100}
                ListHeaderComponent={
                  loadingOlder ? (
                    <ActivityIndicator style={st.olderLoader} color={COLORS.accentBlue} size="small" />
                  ) : null
                }
                ListFooterComponent={isPeerTyping ? <TypingBubble /> : null}
                ListEmptyComponent={
                  <View style={st.chatEmptyWrap}>
                    <MaterialIcons name="chat-bubble-outline" size={32} color={COLORS.border} />
                    <Text style={st.chatEmptyText}>Say hello to start the conversation</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <MessageBubble
                    item={item}
                    mine={String(item.sender) === String(user?._id)}
                    user={user}
                    activePeer={activePeer}
                    onReply={(msg) => setReplyingTo(msg)}
                    onJump={(msgId) => scrollToMessage(msgId)}
                    isHighlighted={
                      chatSearchActive
                        ? chatSearchFocusId === String(item._id)
                        : highlightedMessageId === String(item._id)
                    }
                    isSearchMatch={chatSearchActive && chatSearchMatchSet.has(String(item._id))}
                    decrypt={decrypt}
                    onViewOneTime={handleViewOneTime}
                    onLongPress={onBubbleLongPress}
                    onQuickReact={handleReact}
                  />
                )}
              />
            )}

            <Animated.View
              pointerEvents={showScrollDown && !chatSearchActive ? "auto" : "none"}
              style={[
                st.scrollDownWrap,
                {
                  opacity: scrollDownAnim,
                  transform: [{
                    translateY: scrollDownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
              ]}
            >
              <Pressable
                style={st.scrollDownBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  scrollToBottom(true);
                }}
              >
                <MaterialIcons name="keyboard-arrow-down" size={26} color={COLORS.white} />
              </Pressable>
            </Animated.View>
          </View>

          {replyingTo && (
            <View style={st.replyPreviewWrap}>
              <View style={st.replyPreviewContent}>
                <View style={st.replyIndicator} />
                <View style={st.replyMain}>
                  <Text style={st.replyUserLabel}>Replying to {String(replyingTo.sender) === String(user?._id) ? "yourself" : (activePeer?.fullName || "Yaari")}</Text>
                  <Text style={st.replyTextLabel} numberOfLines={1}>{replyingTo.text}</Text>
                </View>
              </View>
              <Pressable onPress={() => setReplyingTo(null)} style={st.replyCloseBtn}>
                <MaterialIcons name="close" size={20} color={COLORS.inkMuted} />
              </Pressable>
            </View>
          )}
          <View style={[st.composerWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={st.composer}>
              <Pressable onPress={pickImage} style={st.attachBtn}>
                <MaterialIcons name="image" size={24} color={COLORS.accentBlue} />
              </Pressable>
              <TextInput
                value={input}
                onChangeText={(val) => {
                  setInput(val);
                  if (!activePeer?._id) return;
                  
                  if (!isLocalTypingRef.current && val.trim().length > 0) {
                    isLocalTypingRef.current = true;
                    getChatSocket()?.emit("chat:typing", { to: activePeer._id, isTyping: true });
                  }
                  
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  
                  typingTimeoutRef.current = setTimeout(() => {
                    if (isLocalTypingRef.current) {
                      isLocalTypingRef.current = false;
                      getChatSocket()?.emit("chat:typing", { to: activePeer._id, isTyping: false });
                    }
                  }, 2000);
                }}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.inkMuted}
                style={st.composerInput}
                multiline
              />
              <Pressable
                style={[st.sendBtn, !input.trim() && st.sendBtnDisabled]}
                onPress={sendNow}
                disabled={!input.trim()}
              >
                <MaterialIcons name="send" size={19} color={COLORS.white} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── IMAGE PREVIEW + ONE-TIME TOGGLE MODAL ── */}
        <Modal
          visible={!!imagePreview}
          transparent
          animationType="slide"
          onRequestClose={() => { setImagePreview(null); setIsOneTimeView(false); }}
        >
          <View style={st.imgPreviewOverlay}>
            <View style={st.imgPreviewCard}>
              <View style={st.imgPreviewHeader}>
                <Text style={st.imgPreviewTitle}>Send Photo</Text>
                <Pressable onPress={() => { setImagePreview(null); setIsOneTimeView(false); }}>
                  <MaterialIcons name="close" size={24} color={COLORS.inkMuted} />
                </Pressable>
              </View>

              {imagePreview && (
                <Image
                  source={{ uri: imagePreview.uri }}
                  style={st.imgPreviewImage}
                  resizeMode="contain"
                />
              )}

              <Pressable
                style={st.oneTimeToggleRow}
                onPress={() => setIsOneTimeView((v) => !v)}
              >
                <View style={[
                  st.oneTimeToggle,
                  isOneTimeView && st.oneTimeToggleActive,
                ]}>
                  {isOneTimeView && (
                    <MaterialIcons name="check" size={16} color={COLORS.white} />
                  )}
                </View>
                <View style={st.oneTimeToggleInfo}>
                  <View style={st.oneTimeToggleLabelRow}>
                    <MaterialCommunityIcons name="eye-off-outline" size={18} color={isOneTimeView ? COLORS.accentBlue : COLORS.inkMuted} />
                    <Text style={[st.oneTimeToggleLabel, isOneTimeView && { color: COLORS.accentBlue }]}>
                      One-time view
                    </Text>
                  </View>
                  <Text style={st.oneTimeToggleSub}>
                    Photo can only be viewed once and screenshots are blocked
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[st.imgSendBtn, sendingImage && { opacity: 0.6 }]}
                onPress={sendImage}
                disabled={sendingImage}
              >
                {sendingImage ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color={COLORS.white} />
                    <Text style={st.imgSendBtnText}>Send</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── ONE-TIME VIEW IMAGE VIEWER (screenshot blocked) ── */}
        <Modal
          visible={!!viewingOneTime}
          transparent
          animationType="fade"
          onRequestClose={closeOneTimeViewer}
        >
          <View style={st.oneTimeViewerOverlay}>
            <View style={st.oneTimeViewerHeader}>
              <MaterialCommunityIcons name="eye-circle-outline" size={20} color={COLORS.white} />
              <Text style={st.oneTimeViewerLabel}>One-time view</Text>
            </View>
            {viewingOneTime?.fullUri && (
              <Image
                source={{ uri: viewingOneTime.fullUri }}
                style={st.oneTimeViewerImage}
                resizeMode="contain"
              />
            )}
            <Pressable style={st.oneTimeViewerClose} onPress={closeOneTimeViewer}>
              <Text style={st.oneTimeViewerCloseText}>Close</Text>
            </Pressable>
          </View>
        </Modal>

        {/* ── REGULAR IMAGE VIEWER ── */}
        <Modal
          visible={!!viewingImage}
          transparent
          animationType="fade"
          onRequestClose={closeImageViewer}
        >
          <View style={st.imageViewerOverlay}>
            <Pressable style={st.imageViewerCloseBtn} onPress={closeImageViewer}>
              <MaterialIcons name="close" size={28} color={COLORS.white} />
            </Pressable>
            {viewingImage && (
              <Image
                source={{ uri: viewingImage }}
                style={st.imageViewerImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        {/* ── EMOJI REACTION PICKER ── */}
        <Modal
          visible={!!reactionTarget && !showFullEmojiPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setReactionTarget(null)}
        >
          <Pressable
            style={st.reactOverlay}
            onPress={() => setReactionTarget(null)}
          >
            <Pressable
              style={st.reactPickerCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={st.reactQuickRow}>
                {QUICK_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={st.reactQuickBtn}
                    onPress={() => handleReact(reactionTarget?._id, emoji)}
                  >
                    <Text style={st.reactQuickEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
                <Pressable
                  style={st.reactQuickBtnPlus}
                  onPress={() => setShowFullEmojiPicker(true)}
                >
                  <MaterialIcons name="add" size={20} color={COLORS.white} />
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── FULL EMOJI PICKER (rn-emoji-keyboard) ── */}
        <EmojiPicker
          open={showFullEmojiPicker}
          onEmojiSelected={(emojiObject) => {
            handleReact(reactionTarget?._id, emojiObject.emoji);
          }}
          onClose={() => {
            setShowFullEmojiPicker(false);
            setReactionTarget(null);
          }}
          enableSearchBar
          enableRecentlyUsed
          categoryPosition="top"
          theme={{
            backdrop: "rgba(0,0,0,0.4)",
            knob: COLORS.border,
            container: COLORS.white,
            header: COLORS.ink,
            category: {
              icon: COLORS.inkMuted,
              iconActive: COLORS.accentBlue,
              container: COLORS.paperDark,
              containerActive: COLORS.tagBlue,
            },
            search: {
              text: COLORS.ink,
              placeholder: COLORS.inkMuted,
              icon: COLORS.inkMuted,
              background: COLORS.paperDark,
            },
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  // ── GROUP CHAT VIEW ──

  if (activeGroupMeetup) {
    const serverBase = getServerBaseUrl();
    const typingLabel = getTypingLabel();

    const groupMsgsDecrypted = groupMessages.map((m) => ({
      ...m,
      text: m.text || (m.messageType === "system" ? m.ciphertext : m.messageType === "image" ? "[Image]" : decryptGroupMessage(m.ciphertext, m.iv, activeGroupMeetup._id)),
      sender: typeof m.sender === "object" ? m.sender?._id : m.sender,
      _senderObj: typeof m.sender === "object" ? m.sender : null,
    }));

    const getSenderObj = (item) => {
      if (item._senderObj) return item._senderObj;
      const member = activeGroupMeetup.members?.find((mb) => String(mb._id || mb) === String(item.sender));
      return member || null;
    };

    return (
      <KeyboardAvoidingView
        style={st.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="dark" />

        {groupSearchActive ? (
          <View style={[st.chatSearchHeader, { paddingTop: insets.top + 14 }]}>
            <Pressable onPress={closeGroupSearch} style={st.chatBackArrow}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.ink} />
            </Pressable>
            <View style={st.chatSearchInputWrap}>
              <MaterialIcons name="search" size={18} color={COLORS.inkMuted} />
              <TextInput
                ref={groupSearchInputRef}
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                placeholder="Search messages..."
                placeholderTextColor={COLORS.inkMuted}
                style={st.chatSearchInput}
                autoFocus
                returnKeyType="search"
              />
              {groupSearchQuery.length > 0 && (
                <Pressable onPress={() => setGroupSearchQuery("")}>
                  <MaterialIcons name="close" size={18} color={COLORS.inkMuted} />
                </Pressable>
              )}
            </View>
            {groupSearchQuery.trim().length > 0 && (
              <Text style={st.chatSearchCounter}>
                {groupSearchMatchIds.length > 0 ? `${groupSearchIndex + 1}/${groupSearchMatchIds.length}` : "0"}
              </Text>
            )}
            <Pressable
              onPress={() => groupSearchNav("up")}
              disabled={groupSearchMatchIds.length === 0}
              style={[st.chatSearchNavBtn, groupSearchMatchIds.length === 0 && { opacity: 0.3 }]}
            >
              <MaterialIcons name="keyboard-arrow-up" size={24} color={COLORS.ink} />
            </Pressable>
            <Pressable
              onPress={() => groupSearchNav("down")}
              disabled={groupSearchMatchIds.length === 0}
              style={[st.chatSearchNavBtn, groupSearchMatchIds.length === 0 && { opacity: 0.3 }]}
            >
              <MaterialIcons name="keyboard-arrow-down" size={24} color={COLORS.ink} />
            </Pressable>
          </View>
        ) : (
          <View style={[st.chatHeader, { paddingTop: insets.top + 14 }]}>
            <Pressable onPress={closeGroupChat} style={st.chatBackArrow}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.ink} />
            </Pressable>
            <View style={st.chatHeaderInfo}>
              <Text style={st.chatHeaderName} numberOfLines={1}>{activeGroupMeetup.title}</Text>
              {typingLabel ? (
                <Text style={[st.chatStatusText, { color: COLORS.accentMint, fontWeight: "900" }]}>{typingLabel}</Text>
              ) : (
                <Text style={st.chatStatusText}>{activeGroupMeetup.members?.length || 0} members</Text>
              )}
            </View>
            <Pressable onPress={() => setShowGroupMenu(true)} style={st.chatHeaderDots}>
              <MaterialIcons name="more-vert" size={24} color={COLORS.ink} />
            </Pressable>
          </View>
        )}

        {/* ── GROUP DROPDOWN MENU ── */}
        <Modal visible={showGroupMenu} transparent animationType="none" onRequestClose={() => setShowGroupMenu(false)}>
          <Pressable style={st.menuOverlay} onPress={() => setShowGroupMenu(false)}>
            <View style={[st.menuContent, { top: insets.top + 52 }]}>
              <View style={st.menuInner}>
                <Pressable
                  style={({ pressed }) => [st.menuItem, pressed && st.menuItemPressed]}
                  onPress={() => {
                    setShowGroupMenu(false);
                    setGroupSearchActive(true);
                    setGroupSearchQuery("");
                    setGroupSearchIndex(0);
                    setTimeout(() => groupSearchInputRef.current?.focus(), 300);
                  }}
                >
                  <View style={[st.menuIconWrap, { backgroundColor: COLORS.accentBlue + "14" }]}>
                    <MaterialIcons name="search" size={18} color={COLORS.accentBlue} />
                  </View>
                  <View style={st.menuTextCol}>
                    <Text style={st.menuItemTitle}>Search</Text>
                    <Text style={st.menuItemSub}>Find messages in chat</Text>
                  </View>
                </Pressable>
                <View style={st.menuDivider} />
                <Pressable
                  style={({ pressed }) => [st.menuItem, pressed && st.menuItemPressed]}
                  onPress={() => { setShowGroupMenu(false); setShowGroupClearModal(true); }}
                >
                  <View style={[st.menuIconWrap, { backgroundColor: COLORS.accent + "14" }]}>
                    <MaterialIcons name="delete-outline" size={18} color={COLORS.accent} />
                  </View>
                  <View style={st.menuTextCol}>
                    <Text style={[st.menuItemTitle, { color: COLORS.accent }]}>Clear chat</Text>
                    <Text style={st.menuItemSub}>Clear messages for you</Text>
                  </View>
                </Pressable>
                <View style={st.menuDivider} />
                <Pressable
                  style={({ pressed }) => [st.menuItem, pressed && st.menuItemPressed]}
                  onPress={() => { setShowGroupMenu(false); setShowLeaveGroupModal(true); }}
                >
                  <View style={[st.menuIconWrap, { backgroundColor: COLORS.accent + "14" }]}>
                    <MaterialIcons name="logout" size={18} color={COLORS.accent} />
                  </View>
                  <View style={st.menuTextCol}>
                    <Text style={[st.menuItemTitle, { color: COLORS.accent }]}>Leave group</Text>
                    <Text style={st.menuItemSub}>Exit this meetup group</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* ── GROUP CLEAR CONFIRMATION ── */}
        <Modal visible={showGroupClearModal} transparent animationType="slide" onRequestClose={() => setShowGroupClearModal(false)}>
          <View style={st.modalOverlay}>
            <View style={st.modalContent}>
              <View style={st.modalHeader}>
                <View style={st.warningCircle}>
                  <MaterialIcons name="warning" size={32} color={COLORS.accent} />
                </View>
                <Text style={st.modalTitle}>Clear group chat?</Text>
              </View>
              <Text style={st.modalText}>Messages will be cleared from your view only. Other members can still see them.</Text>
              <View style={st.modalActions}>
                <Pressable style={[st.modalBtn, st.modalBtnCancel]} onPress={() => setShowGroupClearModal(false)}>
                  <Text style={st.modalBtnTextCancel}>Cancel</Text>
                </Pressable>
                <Pressable style={[st.modalBtn, st.modalBtnConfirm]} onPress={handleGroupClearChat}>
                  <Text style={st.modalBtnTextConfirm}>Clear</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── LEAVE GROUP CONFIRMATION ── */}
        <Modal visible={showLeaveGroupModal} transparent animationType="fade" onRequestClose={() => setShowLeaveGroupModal(false)}>
          <View style={st.modalOverlay}>
            <View style={st.modalContent}>
              <View style={st.modalHeader}>
                <View style={[st.warningCircle, { backgroundColor: COLORS.accent + "18" }]}>
                  <MaterialIcons name="logout" size={30} color={COLORS.accent} />
                </View>
                <Text style={st.modalTitle}>Leave group?</Text>
              </View>
              <Text style={st.modalText}>
                <Text style={{ fontWeight: "700", color: COLORS.coffee }}>{activeGroupMeetup?.title || "This meetup"}</Text>
                {" "}will be permanently removed from your chats and you will no longer receive messages from this group.
              </Text>
              <View style={st.modalActions}>
                <Pressable style={[st.modalBtn, st.modalBtnCancel]} onPress={() => setShowLeaveGroupModal(false)}>
                  <Text style={st.modalBtnTextCancel}>Cancel</Text>
                </Pressable>
                <Pressable style={[st.modalBtn, st.modalBtnConfirm]} onPress={handleLeaveGroup}>
                  <Text style={st.modalBtnTextConfirm}>Leave</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <View style={st.chatBody}>
          <View style={st.chatListArea}>
            {loadingGroupMsgs ? (
              <View style={st.chatLoading}>
                <ActivityIndicator color={COLORS.accentBlue} size="large" />
              </View>
            ) : (
              <FlatList
                ref={groupFlatListRef}
                data={groupMsgsDecrypted}
                keyExtractor={(item) => String(item._id)}
                style={st.chatBody}
                contentContainerStyle={st.bubbleList}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => {
                  if (groupPendingScrollRef.current) {
                    groupFlatListRef.current?.scrollToEnd({ animated: false });
                  }
                }}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    groupFlatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                  }, 300);
                }}
                onScroll={handleGroupChatScroll}
                scrollEventThrottle={100}
                ListFooterComponent={typingLabel ? <TypingBubble /> : null}
                ListEmptyComponent={
                  <View style={st.chatEmptyWrap}>
                    <MaterialIcons name="groups" size={32} color={COLORS.border} />
                    <Text style={st.chatEmptyText}>Start the group conversation</Text>
                  </View>
                }
                renderItem={({ item }) => {
                  if (item.messageType === "system") {
                    return (
                      <View style={st.systemMsgWrap}>
                        <View style={st.systemMsgBubble}>
                          <MaterialIcons name="celebration" size={14} color={COLORS.accentGold} style={{ marginRight: 6 }} />
                          <Text style={st.systemMsgText}>{item.text}</Text>
                        </View>
                      </View>
                    );
                  }

                  const mine = String(item.sender) === String(user?._id);
                  const senderObj = getSenderObj(item);
                  const hasReactions = item.reactions?.length > 0;
                  const isImage = item.messageType === "image";
                  const isOneTime = item.isOneTimeView;
                  const wasViewed = !!item.oneTimeViewedAt;
                  const fullImageUri = isImage && item.imageUri ? (item.imageUri.startsWith("http") ? item.imageUri : `${serverBase}${item.imageUri}`) : null;

                  const renderGroupImageContent = () => {
                    if (isOneTime) {
                      if (mine) {
                        return (
                          <View style={st.oneTimeBubbleContent}>
                            <View style={st.oneTimeIconCircle}>
                              <MaterialCommunityIcons name="camera-timer" size={24} color={COLORS.accentBlue} />
                            </View>
                            <Text style={st.oneTimeLabel}>One-time photo</Text>
                            <Text style={st.oneTimeSub}>{wasViewed ? "Opened" : "Not opened yet"}</Text>
                          </View>
                        );
                      }
                      if (wasViewed) {
                        return (
                          <View style={st.oneTimeBubbleContent}>
                            <View style={[st.oneTimeIconCircle, { backgroundColor: COLORS.border }]}>
                              <MaterialCommunityIcons name="camera-off" size={24} color={COLORS.inkMuted} />
                            </View>
                            <Text style={[st.oneTimeLabel, { color: COLORS.inkMuted }]}>Photo opened</Text>
                            <Text style={st.oneTimeSub}>No longer available</Text>
                          </View>
                        );
                      }
                      return (
                        <Pressable style={st.oneTimeBubbleContent} onPress={() => handleGroupViewOneTime(item)}>
                          <View style={[st.oneTimeIconCircle, { backgroundColor: COLORS.accentBlue + "18" }]}>
                            <MaterialCommunityIcons name="eye-circle-outline" size={28} color={COLORS.accentBlue} />
                          </View>
                          <Text style={[st.oneTimeLabel, { color: COLORS.accentBlue }]}>Tap to view</Text>
                          <Text style={st.oneTimeSub}>One-time photo</Text>
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable onPress={() => handleGroupViewOneTime({ ...item, _viewOnly: true })}>
                        <Image source={{ uri: fullImageUri }} style={st.imageBubbleImg} resizeMode="cover" />
                      </Pressable>
                    );
                  };

                  let _swipeRef = null;
                  return (
                    <Swipeable
                      ref={(ref) => { _swipeRef = ref; }}
                      renderLeftActions={(progress) => <SwipeReplyIcon progress={progress} />}
                      onSwipeableWillOpen={(direction) => {
                        if (direction === "left") {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          groupOnReply(item);
                          _swipeRef?.close();
                        }
                      }}
                      friction={1.5}
                      leftThreshold={35}
                      overshootLeft={false}
                      overshootFriction={8}
                      enableTrackpadTwoFingerGesture
                    >
                      <Pressable
                        onLongPress={() => onGroupBubbleLongPress(item)}
                        delayLongPress={300}
                        style={[st.bubbleRow, mine ? st.bubbleRowMine : st.bubbleRowPeer, hasReactions && { marginBottom: 22 }]}
                      >
                        {!mine && (
                          <View style={st.bubbleAvatarWrap}>
                            <Avatar uri={senderObj?.profileImageUri} name={senderObj?.fullName || "?"} size={28} />
                          </View>
                        )}
                        <View style={{ maxWidth: "75%" }}>
                          {!mine && (
                            <Text style={st.groupSenderName}>
                              {senderObj?.fullName || senderObj?.username || "Unknown"}
                            </Text>
                          )}
                          <View
                            style={[
                              st.bubble,
                              mine ? st.bubbleMine : st.bubblePeer,
                              isImage && !isOneTime && st.imageBubble,
                              item.replyTo && st.bubbleWithReply,
                              groupSearchActive && groupSearchMatchSet.has(String(item._id)) && groupSearchFocusId !== String(item._id) && { backgroundColor: COLORS.accentBlue + "0D" },
                              groupSearchActive && groupSearchFocusId === String(item._id) && { backgroundColor: COLORS.accentBlue + "22", borderWidth: 1, borderColor: COLORS.accentBlue },
                              !groupSearchActive && groupHighlightedMessageId === String(item._id) && { backgroundColor: COLORS.accentBlue + "22", borderWidth: 1, borderColor: COLORS.accentBlue },
                            ]}
                          >
                            {item.replyTo && (
                              <Pressable
                                style={[st.replyInBubble, mine ? st.replyInBubbleMine : st.replyInBubblePeer]}
                                onPress={() => groupScrollToMessage(item.replyTo)}
                              >
                                <View style={st.replyIndicator} />
                                <View style={st.replyContent}>
                                  <Text style={st.replyUser} numberOfLines={1}>Reply</Text>
                                  <Text style={st.replyText} numberOfLines={2}>
                                    {item.replySnippet ? decryptGroupMsg(item.replySnippet, null) : "Original message"}
                                  </Text>
                                </View>
                              </Pressable>
                            )}
                            {isImage ? renderGroupImageContent() : (
                              <Text style={[st.bubbleText, mine && st.bubbleTextMine]}>
                                {item.text || "Encrypted message"}
                              </Text>
                            )}
                            <View style={st.bubbleMetaRow}>
                              <Text style={[st.bubbleTime, mine && st.bubbleTimeMine]}>
                                {toRelative(item.createdAt)}
                              </Text>
                            </View>
                            <ReactionPills
                              reactions={item.reactions}
                              userId={String(user?._id)}
                              onPress={(emoji) => handleGroupReact(item._id, emoji)}
                              mine={mine}
                            />
                          </View>
                        </View>
                        {mine && (
                          <View style={st.bubbleAvatarWrap}>
                            <Avatar uri={user?.profileImageUri} name={user?.fullName} size={28} />
                          </View>
                        )}
                      </Pressable>
                    </Swipeable>
                  );
                }}
              />
            )}

            <Animated.View
              pointerEvents={showGroupScrollDown && !groupSearchActive ? "auto" : "none"}
              style={[
                st.scrollDownWrap,
                {
                  opacity: groupScrollDownAnim,
                  transform: [{ translateY: groupScrollDownAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
              ]}
            >
              <Pressable
                style={st.scrollDownBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); groupScrollToBottom(true); }}
              >
                <MaterialIcons name="keyboard-arrow-down" size={26} color={COLORS.white} />
              </Pressable>
            </Animated.View>
          </View>

          {groupReplyingTo && (
            <View style={st.replyPreviewWrap}>
              <View style={st.replyPreviewContent}>
                <View style={st.replyIndicator} />
                <View style={st.replyMain}>
                  <Text style={st.replyUserLabel}>
                    Replying to {String(groupReplyingTo.sender) === String(user?._id) ? "yourself" : (getSenderObj(groupReplyingTo)?.fullName || "member")}
                  </Text>
                  <Text style={st.replyTextLabel} numberOfLines={1}>{groupReplyingTo.text}</Text>
                </View>
              </View>
              <Pressable onPress={() => setGroupReplyingTo(null)} style={st.replyCloseBtn}>
                <MaterialIcons name="close" size={20} color={COLORS.inkMuted} />
              </Pressable>
            </View>
          )}

          <View style={[st.composerWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <View style={st.composer}>
              <Pressable onPress={groupPickImage} style={st.attachBtn}>
                <MaterialIcons name="image" size={24} color={COLORS.accentBlue} />
              </Pressable>
              <TextInput
                value={groupText}
                onChangeText={(val) => {
                  setGroupText(val);
                  if (!activeGroupMeetup?._id) return;
                  if (!isGroupTypingRef.current && val.trim().length > 0) {
                    isGroupTypingRef.current = true;
                    emitGroupTyping(activeGroupMeetup._id, true);
                  }
                  if (groupTypingTimeoutRef.current) clearTimeout(groupTypingTimeoutRef.current);
                  groupTypingTimeoutRef.current = setTimeout(() => {
                    if (isGroupTypingRef.current) {
                      isGroupTypingRef.current = false;
                      emitGroupTyping(activeGroupMeetup._id, false);
                    }
                  }, 2000);
                }}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.inkMuted}
                style={st.composerInput}
                multiline
              />
              <Pressable
                style={[st.sendBtn, !groupText.trim() && st.sendBtnDisabled]}
                onPress={sendGroupMsg}
                disabled={!groupText.trim()}
              >
                <MaterialIcons name="send" size={19} color={COLORS.white} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── GROUP IMAGE PREVIEW + ONE-TIME TOGGLE ── */}
        <Modal visible={!!groupImagePreview} transparent animationType="slide" onRequestClose={() => { setGroupImagePreview(null); setGroupIsOneTimeView(false); }}>
          <View style={st.imgPreviewOverlay}>
            <View style={st.imgPreviewCard}>
              <View style={st.imgPreviewHeader}>
                <Text style={st.imgPreviewTitle}>Send Photo</Text>
                <Pressable onPress={() => { setGroupImagePreview(null); setGroupIsOneTimeView(false); }}>
                  <MaterialIcons name="close" size={24} color={COLORS.inkMuted} />
                </Pressable>
              </View>
              {groupImagePreview && (
                <Image source={{ uri: groupImagePreview.uri }} style={st.imgPreviewImage} resizeMode="contain" />
              )}
              <Pressable style={st.oneTimeToggleRow} onPress={() => setGroupIsOneTimeView((v) => !v)}>
                <View style={[st.oneTimeToggle, groupIsOneTimeView && st.oneTimeToggleActive]}>
                  {groupIsOneTimeView && <MaterialIcons name="check" size={16} color={COLORS.white} />}
                </View>
                <View style={st.oneTimeToggleInfo}>
                  <View style={st.oneTimeToggleLabelRow}>
                    <MaterialCommunityIcons name="eye-off-outline" size={18} color={groupIsOneTimeView ? COLORS.accentBlue : COLORS.inkMuted} />
                    <Text style={[st.oneTimeToggleLabel, groupIsOneTimeView && { color: COLORS.accentBlue }]}>One-time view</Text>
                  </View>
                  <Text style={st.oneTimeToggleSub}>Photo can only be viewed once</Text>
                </View>
              </Pressable>
              <Pressable style={[st.imgSendBtn, groupSendingImage && { opacity: 0.6 }]} onPress={sendGroupImage} disabled={groupSendingImage}>
                {groupSendingImage ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color={COLORS.white} />
                    <Text style={st.imgSendBtnText}>Send</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── GROUP ONE-TIME VIEWER ── */}
        <Modal visible={!!groupViewingOneTime} transparent animationType="fade" onRequestClose={closeGroupOneTimeViewer}>
          <View style={st.oneTimeViewerOverlay}>
            <View style={st.oneTimeViewerHeader}>
              <MaterialCommunityIcons name="eye-circle-outline" size={20} color={COLORS.white} />
              <Text style={st.oneTimeViewerLabel}>One-time view</Text>
            </View>
            {groupViewingOneTime?.fullUri && (
              <Image source={{ uri: groupViewingOneTime.fullUri }} style={st.oneTimeViewerImage} resizeMode="contain" />
            )}
            <Pressable style={st.oneTimeViewerClose} onPress={closeGroupOneTimeViewer}>
              <Text style={st.oneTimeViewerCloseText}>Close</Text>
            </Pressable>
          </View>
        </Modal>

        {/* ── GROUP IMAGE VIEWER ── */}
        <Modal visible={!!groupViewingImage} transparent animationType="fade" onRequestClose={() => setGroupViewingImage(null)}>
          <View style={st.imageViewerOverlay}>
            <Pressable style={st.imageViewerCloseBtn} onPress={() => setGroupViewingImage(null)}>
              <MaterialIcons name="close" size={28} color={COLORS.white} />
            </Pressable>
            {groupViewingImage && <Image source={{ uri: groupViewingImage }} style={st.imageViewerImage} resizeMode="contain" />}
          </View>
        </Modal>

        {/* ── GROUP EMOJI REACTION PICKER ── */}
        <Modal visible={!!groupReactionTarget && !showGroupEmojiPicker} transparent animationType="fade" onRequestClose={() => setGroupReactionTarget(null)}>
          <Pressable style={st.reactOverlay} onPress={() => setGroupReactionTarget(null)}>
            <Pressable style={st.reactPickerCard} onPress={(e) => e.stopPropagation()}>
              <View style={st.reactQuickRow}>
                {QUICK_EMOJIS.map((emoji) => (
                  <Pressable key={emoji} style={st.reactQuickBtn} onPress={() => handleGroupReact(groupReactionTarget?._id, emoji)}>
                    <Text style={st.reactQuickEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
                <Pressable style={st.reactQuickBtnPlus} onPress={() => setShowGroupEmojiPicker(true)}>
                  <MaterialIcons name="add" size={20} color={COLORS.white} />
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── GROUP FULL EMOJI PICKER ── */}
        <EmojiPicker
          open={showGroupEmojiPicker}
          onEmojiSelected={(emojiObject) => handleGroupReact(groupReactionTarget?._id, emojiObject.emoji)}
          onClose={() => { setShowGroupEmojiPicker(false); setGroupReactionTarget(null); }}
          enableSearchBar
          enableRecentlyUsed
          categoryPosition="top"
          theme={{
            backdrop: "rgba(0,0,0,0.4)",
            knob: COLORS.border,
            container: COLORS.white,
            header: COLORS.ink,
            category: { icon: COLORS.inkMuted, iconActive: COLORS.accentBlue, container: COLORS.paperDark, containerActive: COLORS.tagBlue },
            search: { text: COLORS.ink, placeholder: COLORS.inkMuted, icon: COLORS.inkMuted },
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  /* ─── CONVERSATION LIST VIEW ─── */
  return (
    <View style={st.root}>
      <StatusBar style="dark" />
      {headerBlock}

      <ScrollView
        style={st.scrollBody}
        contentContainerStyle={{ paddingBottom: TAB_BAR_TOTAL + insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── SEARCH ── */}
        <View style={st.searchRow}>
          <View style={st.searchBox}>
            <MaterialIcons name="search" size={20} color={COLORS.inkMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search conversations..."
              placeholderTextColor={COLORS.inkMuted}
              style={st.searchInput}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <MaterialIcons name="close" size={18} color={COLORS.inkMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── YAARIS / MEETUPS TOGGLE ── */}
        <View style={st.msgModeToggle}>
          {["yaaris", "meetups"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setMsgMode(tab)}
              style={[st.msgModeTab, msgMode === tab && st.msgModeTabActive]}
            >
              <MaterialIcons
                name={tab === "yaaris" ? "chat" : "groups"}
                size={16}
                color={msgMode === tab ? COLORS.white : COLORS.inkMuted}
              />
              <Text style={[st.msgModeText, msgMode === tab && st.msgModeTextActive]}>
                {tab === "yaaris" ? "Yaaris" : "Meetups"}
              </Text>
            </Pressable>
          ))}
        </View>

        {msgMode === "yaaris" ? (
          <>
            {/* ── CONVERSATION LIST ── */}
            <View style={st.convSection}>
              <Text style={st.sectionLabel}>RECENT CHATS</Text>
            </View>

            {loadingList ? (
              <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.accentBlue} size="large" />
            ) : filtered.length === 0 ? (
              <View style={st.emptyCard}>
                <View style={st.emptyIconWrap}>
                  <MaterialIcons name="chat-bubble-outline" size={28} color={COLORS.accentBlue} />
                </View>
                <Text style={st.emptyTitle}>No messages yet</Text>
                <Text style={st.emptyBody}>
                  Connect with people in your city,{"\n"}then start your first encrypted chat.
                </Text>
              </View>
            ) : (
              filtered.map((item, idx) => (
                <React.Fragment key={item.conversationKey}>
                  <Pressable
                    style={({ pressed }) => [st.convRow, pressed && st.convRowPressed]}
                    onPress={() => openChat(item.peer)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      handleDeleteConversation(item);
                    }}
                    delayLongPress={400}
                  >
                    <View style={st.convAvatarWrap}>
                      <Avatar uri={item.peer?.profileImageUri} name={item.peer?.fullName} size={50} />
                      {item.peer?.isOnline && <View style={st.convOnline} />}
                    </View>
                    <View style={st.convMid}>
                      <View style={st.convNameRow}>
                        <Text style={[st.convName, !!item.unreadCount && st.convNameUnread]} numberOfLines={1}>
                          {item.peer?.fullName || item.peer?.username}
                        </Text>
                        <Text style={[st.convTime, !!item.unreadCount && st.convTimeUnread]}>
                          {toRelative(item.lastMessage?.createdAt)}
                        </Text>
                      </View>
                      <View style={st.convPreviewRow}>
                        <Text style={[st.convPreview, !!item.unreadCount && st.convPreviewUnread]} numberOfLines={1}>
                          {item.preview || "Tap to chat"}
                        </Text>
                        {!!item.unreadCount && (
                          <View style={st.badge}>
                            <Text style={st.badgeText}>
                              {item.unreadCount > 9 ? "9+" : item.unreadCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                  {idx < filtered.length - 1 && <View style={st.convDivider} />}
                </React.Fragment>
              ))
            )}
          </>
        ) : (
          <>
            {/* ── MEETUP GROUP CHATS ── */}
            <View style={st.convSection}>
              <Text style={st.sectionLabel}>MEETUP GROUPS</Text>
            </View>

            {myMeetups.length === 0 ? (
              <View style={st.emptyCard}>
                <View style={st.emptyIconWrap}>
                  <MaterialIcons name="groups" size={28} color={COLORS.accentBlue} />
                </View>
                <Text style={st.emptyTitle}>No meetup chats</Text>
                <Text style={st.emptyBody}>
                  Join a meetup from the Home tab to start group chatting.
                </Text>
              </View>
            ) : (
              myMeetups.map((meetup, idx) => {
                const serverBase = getServerBaseUrl();
                const imgSrc = meetup.imageUri
                  ? { uri: meetup.imageUri.startsWith("http") ? meetup.imageUri : `${serverBase}${meetup.imageUri}` }
                  : null;
                const summary = groupSummaries[meetup._id];
                const lastMsg = summary?.lastMessage;
                let preview = meetup.venue || meetup.meetupLocation || "Tap to chat";
                if (lastMsg) {
                  if (lastMsg.messageType === "image") {
                    preview = "📷 Photo";
                  } else {
                    try {
                      preview = decryptGroupMessage(lastMsg.ciphertext, lastMsg.iv, meetup._id) || "Encrypted message";
                    } catch {
                      preview = "Encrypted message";
                    }
                  }
                }

                return (
                  <React.Fragment key={meetup._id}>
                    <Pressable
                      style={({ pressed }) => [st.convRow, pressed && st.convRowPressed]}
                      onPress={() => openGroupChat(meetup)}
                    >
                      <View style={st.meetupAvatar}>
                        {imgSrc ? (
                          <Image source={imgSrc} style={st.meetupAvatarImg} />
                        ) : (
                          <MaterialIcons name="groups" size={24} color={COLORS.accentBlue} />
                        )}
                      </View>
                      <View style={st.convMid}>
                        <View style={st.convNameRow}>
                          <Text style={st.convName} numberOfLines={1}>{meetup.title}</Text>
                          <Text style={st.convTime}>
                            {lastMsg ? toRelative(lastMsg.createdAt) : `${meetup.members?.length || 0} members`}
                          </Text>
                        </View>
                        <View style={st.convPreviewRow}>
                          <Text style={st.convPreview} numberOfLines={1}>
                            {preview}
                          </Text>
                          {!!summary?.unreadCount && (
                            <View style={st.badge}>
                              <Text style={st.badgeText}>
                                {summary.unreadCount > 99 ? "99+" : summary.unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                    {idx < myMeetups.length - 1 && <View style={st.convDivider} />}
                  </React.Fragment>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* ── DELETE CONVERSATION MODAL ── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={st.delModalOverlay}>
          <View style={st.delModalBox}>
            <Text style={st.delModalTitle}>Delete chat?</Text>
            <Text style={st.delModalText}>
              All messages with{" "}
              <Text style={{ fontWeight: "800", color: COLORS.ink }}>
                {deleteTarget?.peer?.fullName || deleteTarget?.peer?.username}
              </Text>
              {" "}will be permanently deleted. This can't be undone.
            </Text>
            <View style={st.delModalActions}>
              <Pressable
                style={({ pressed }) => [st.delModalBtn, st.delModalCancel, pressed && { opacity: 0.8 }]}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={st.delModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [st.delModalBtn, st.delModalConfirm, pressed && { opacity: 0.8 }]}
                onPress={confirmDeleteConversation}
              >
                <Text style={st.delModalConfirmText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FLOATING NEW MESSAGE BUTTON ── */}
      {connections.length > 0 && msgMode === "yaaris" && (
        <Pressable
          style={({ pressed }) => [
            st.fab,
            { bottom: insets.bottom + 95 },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
          onPress={() => { setShowNewMsgSheet(true); setNewMsgSearch(""); }}
        >
          <MaterialIcons name="chat" size={24} color={COLORS.white} />
        </Pressable>
      )}

      {/* ── NEW MESSAGE BOTTOM SHEET ── */}
      <Modal
        visible={showNewMsgSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewMsgSheet(false)}
      >
        <Animated.View style={[st.sheetBackdrop, { opacity: sheetFade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNewMsgSheet(false)} />
        </Animated.View>
        <View style={st.sheetOuter}>
          <View style={st.sheetInner}>
            <View style={st.sheetHandle} />
            <View style={st.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={st.sheetTitle}>New Message</Text>
                <Text style={st.sheetSub}>Select a connection to start chatting</Text>
              </View>
              <Pressable onPress={() => setShowNewMsgSheet(false)} style={st.sheetCloseBtn}>
                <MaterialIcons name="close" size={16} color={COLORS.inkMuted} />
              </Pressable>
            </View>

            <View style={st.sheetSearchRow}>
              <MaterialIcons name="search" size={20} color={COLORS.inkMuted} />
              <TextInput
                value={newMsgSearch}
                onChangeText={setNewMsgSearch}
                placeholder="Search connections..."
                placeholderTextColor={COLORS.inkMuted}
                style={st.sheetSearchInput}
                autoCorrect={false}
              />
              {newMsgSearch.length > 0 && (
                <Pressable onPress={() => setNewMsgSearch("")}>
                  <MaterialIcons name="close" size={18} color={COLORS.inkMuted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredConnections.length === 0 ? (
                <View style={st.sheetEmpty}>
                  <MaterialIcons name="person-search" size={36} color={COLORS.border} />
                  <Text style={st.sheetEmptyText}>No connections found</Text>
                </View>
              ) : (
                filteredConnections.map((c, idx) => (
                  <React.Fragment key={c._id}>
                    <Pressable
                      style={({ pressed }) => [st.sheetRow, pressed && st.sheetRowPressed]}
                      onPress={() => {
                        setShowNewMsgSheet(false);
                        openChat(c);
                      }}
                    >
                      <Avatar uri={c.profileImageUri} name={c.fullName} size={44} />
                      <View style={st.sheetRowText}>
                        <Text style={st.sheetRowName} numberOfLines={1}>
                          {c.fullName || c.username}
                        </Text>
                        <Text style={st.sheetRowHandle} numberOfLines={1}>
                          @{c.username}
                        </Text>
                      </View>
                      <View style={st.sheetRowArrow}>
                        <MaterialIcons name="chat-bubble-outline" size={18} color={COLORS.accentBlue} />
                      </View>
                    </Pressable>
                    {idx < filteredConnections.length - 1 && <View style={st.sheetDivider} />}
                  </React.Fragment>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.paper,
  },
  scrollBody: {
    flex: 1,
  },

  /* ── MASTHEAD (mirrors HomeTab) ── */
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  mastheadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.ink,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentMint,
  },
  liveLabel: {
    fontSize: 8,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.ink,
    lineHeight: 38,
    letterSpacing: -1,
  },
  heroTitleLight: {
    fontWeight: "400",
    color: COLORS.inkMuted,
  },

  /* ── SEARCH (mirrors HomeTab) ── */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    padding: 0,
    fontWeight: "500",
  },

  /* ── FLOATING NEW MESSAGE BUTTON ── */
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: COLORS.inkMuted,
    marginBottom: 12,
  },

  /* ── CONV SECTION ── */
  /* ── MSG MODE TOGGLE ── */
  msgModeToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.paperDark,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  msgModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  msgModeTabActive: {
    backgroundColor: COLORS.ink,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  msgModeText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.inkMuted,
    letterSpacing: 0.5,
  },
  msgModeTextActive: {
    color: COLORS.white,
  },

  meetupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.paperDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  meetupAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  groupSenderName: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accentBlue,
    marginBottom: 2,
    paddingLeft: 4,
  },
  systemMsgWrap: {
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  systemMsgBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.tagGold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  systemMsgText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accentGold,
    letterSpacing: 0.2,
  },

  convSection: {
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  convRowPressed: {
    backgroundColor: COLORS.paperDark,
  },
  convAvatarWrap: {
    position: "relative",
  },
  convOnline: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accentMint,
    borderWidth: 2.5,
    borderColor: COLORS.paper,
  },
  convMid: {
    flex: 1,
    marginLeft: 14,
  },
  convNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  convName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  convNameUnread: {
    fontWeight: "900",
  },
  convPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  convPreview: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.inkMuted,
    lineHeight: 18,
  },
  convPreviewUnread: {
    fontWeight: "700",
    color: COLORS.inkLight,
  },
  convTime: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.inkMuted,
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  convTimeUnread: {
    fontWeight: "800",
    color: COLORS.accentBlue,
  },
  convDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.5,
    marginLeft: 84,
    marginRight: 20,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  /* ── EMPTY STATE ── */
  emptyCard: {
    marginTop: 50,
    marginHorizontal: 30,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.tagBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.inkMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: COLORS.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexShrink: 0,
  },
  chatBackArrow: {
    padding: 4,
    marginRight: 10,
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.ink,
  },
  chatEncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  chatEncText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accentMint,
  },
  onlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentMint,
  },
  chatStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.inkMuted,
  },
  chatBody: {
    flex: 1,
  },
  chatListArea: {
    flex: 1,
  },
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  wmBadge: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  wmMain: {
    fontSize: 58,
    fontWeight: "900",
    letterSpacing: 3,
    opacity: 0.08,
  },
  wmCity: {
    color: COLORS.ink,
    fontStyle: "normal",
  },
  wmYaari: {
    color: COLORS.accentBlue,
    fontStyle: "italic",
  },
  wmLineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  wmLineLeft: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.ink,
    opacity: 0.06,
  },
  wmLineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    opacity: 0.16,
  },
  wmLineRight: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accentBlue,
    opacity: 0.08,
  },
  chatLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleList: {
    flexGrow: 1,
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 10,
  },
  olderLoader: {
    paddingVertical: 14,
    alignSelf: "center",
  },
  chatEmptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatEmptyText: {
    color: COLORS.inkMuted,
    fontSize: 14,
    fontWeight: "600",
  },

  /* ── SCROLL TO BOTTOM FAB ── */
  scrollDownWrap: {
    position: "absolute",
    bottom: 12,
    right: 16,
    zIndex: 10,
  },
  scrollDownBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentBlue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  typingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.inkMuted,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    paddingHorizontal: 4,
    width: "100%",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowPeer: {
    justifyContent: "flex-start",
  },
  bubbleAvatarWrap: {
    marginBottom: 2,
    marginHorizontal: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: COLORS.tagBlue,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 74, 198, 0.15)", // Subtle brand blue border
  },
  bubblePeer: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bubbleWithReply: {
    minWidth: "60%",
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.ink,
    fontWeight: "500",
  },
  bubbleTextMine: {
    color: COLORS.ink,
  },
  bubbleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
    gap: 4,
  },
  bubbleTime: {
    fontSize: 10,
    color: COLORS.inkMuted,
    fontWeight: "600",
  },
  bubbleTimeMine: {
    color: COLORS.inkMuted,
  },
  statusIconWrap: {
    marginLeft: 4,
  },
  composerWrap: {
    paddingHorizontal: 10,
    paddingTop: 6,
    backgroundColor: COLORS.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexShrink: 0,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 36,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.ink,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  avatarImg: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.tagBlue,
    borderWidth: 1.5,
    borderColor: "#cfe0ff",
  },
  avatarInitials: {
    fontWeight: "900",
    color: COLORS.accentBlue,
  },

  /* ── REPLY UI ── */
  swipeAction: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  replyPreviewWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.tagBlue,
    borderRadius: 8,
    overflow: "hidden",
  },
  replyIndicator: {
    width: 4,
    height: "100%",
    backgroundColor: COLORS.accentBlue,
  },
  replyMain: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyUserLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.accentBlue,
  },
  replyTextLabel: {
    fontSize: 12,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  replyCloseBtn: {
    padding: 8,
    marginLeft: 8,
  },

  /* ── REPLY IN BUBBLE ── */
  replyInBubble: {
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
  },
  replyInBubbleMine: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  replyInBubblePeer: {
    backgroundColor: COLORS.tagBlue,
    borderColor: "#dbeafe",
  },
  replyContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyUser: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.accentBlue,
  },
  replyText: {
    fontSize: 11,
    color: COLORS.inkMuted,
    marginTop: 1,
  },

  /* ── CHAT SEARCH BAR ── */
  chatSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: COLORS.paperDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexShrink: 0,
    gap: 2,
  },
  chatSearchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.ink,
    padding: 0,
  },
  chatSearchCounter: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.accentBlue,
    marginHorizontal: 2,
    minWidth: 32,
    textAlign: "center",
  },
  chatSearchNavBtn: {
    padding: 4,
    borderRadius: 16,
  },

  /* ── CHAT MENU ── */
  chatHeaderDots: {
    padding: 8,
    marginLeft: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContent: {
    position: "absolute",
    right: 14,
    alignItems: "flex-end",
  },
  menuInner: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 210,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: COLORS.paperDark,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  menuItemSub: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.inkMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
    opacity: 0.5,
  },

  /* ── CLEAR MODAL ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  warningCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.ink,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.inkMuted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: COLORS.paperDark,
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.accent,
  },
  modalBtnTextCancel: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.inkLight,
  },
  modalBtnTextConfirm: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
  },
  delModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  delModalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  delModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.ink,
    marginBottom: 8,
  },
  delModalText: {
    fontSize: 13,
    color: COLORS.inkMuted,
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: "500",
  },
  delModalActions: {
    flexDirection: "row",
    gap: 10,
  },
  delModalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  delModalCancel: {
    backgroundColor: COLORS.paperDark,
  },
  delModalConfirm: {
    backgroundColor: COLORS.accent,
  },
  delModalCancelText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.inkLight,
  },
  delModalConfirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.white,
  },

  /* ── ATTACH BUTTON ── */
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── IMAGE BUBBLE ── */
  imageBubble: {
    padding: 4,
  },
  imageBubbleImg: {
    width: IMAGE_BUBBLE_WIDTH,
    height: IMAGE_BUBBLE_WIDTH * 0.75,
    borderRadius: 16,
  },

  /* ── ONE-TIME VIEW BUBBLE ── */
  oneTimeBubbleContent: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 160,
  },
  oneTimeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.tagBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  oneTimeLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.2,
  },
  oneTimeSub: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.inkMuted,
    marginTop: 2,
  },

  /* ── IMAGE PREVIEW MODAL ── */
  imgPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  imgPreviewCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  imgPreviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  imgPreviewTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.ink,
  },
  imgPreviewImage: {
    width: "100%",
    height: 320,
    backgroundColor: COLORS.paperDark,
  },
  oneTimeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  oneTimeToggle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  oneTimeToggleActive: {
    backgroundColor: COLORS.accentBlue,
    borderColor: COLORS.accentBlue,
  },
  oneTimeToggleInfo: {
    flex: 1,
  },
  oneTimeToggleLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  oneTimeToggleLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.ink,
  },
  oneTimeToggleSub: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  imgSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
  },
  imgSendBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
  },

  /* ── ONE-TIME VIEWER ── */
  oneTimeViewerOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  oneTimeViewerHeader: {
    position: "absolute",
    top: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  oneTimeViewerLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.white,
  },
  oneTimeViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  oneTimeViewerClose: {
    position: "absolute",
    bottom: 60,
    paddingHorizontal: 36,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 28,
  },
  oneTimeViewerCloseText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
  },

  /* ── REGULAR IMAGE VIEWER ── */
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },

  /* ── REACTION PILLS ON BUBBLES ── */
  reactionPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    position: "absolute",
    bottom: -19,
  },
  reactionPillsRowMine: {
    right: 8,
  },
  reactionPillsRowPeer: {
    left: 8,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionPillMine: {
    borderColor: COLORS.accentBlue + "50",
    backgroundColor: COLORS.tagBlue,
  },
  reactionPillEmoji: {
    fontSize: 14,
  },
  reactionPillCount: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.inkMuted,
    marginLeft: 3,
  },
  reactionPillCountMine: {
    color: COLORS.accentBlue,
  },

  /* ── REACTION PICKER MODAL ── */
  reactOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  reactPickerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  reactQuickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  reactQuickBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  reactQuickEmoji: {
    fontSize: 28,
  },

  reactQuickBtnPlus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentBlue,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── NEW MESSAGE BOTTOM SHEET ── */
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,20,10,0.45)",
  },
  sheetOuter: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetInner: {
    maxHeight: "85%",
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 13,
    color: COLORS.inkMuted,
    marginTop: 3,
    fontWeight: "500",
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.paperDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    backgroundColor: COLORS.paperDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    padding: 0,
    fontWeight: "500",
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 14,
    borderRadius: 12,
  },
  sheetRowPressed: {
    backgroundColor: COLORS.paperDark,
  },
  sheetRowText: {
    flex: 1,
  },
  sheetRowName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.ink,
  },
  sheetRowHandle: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  sheetRowArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.tagBlue,
    borderWidth: 1,
    borderColor: COLORS.accentBlue + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 62,
  },
  sheetEmpty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  sheetEmptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.inkMuted,
  },
});
