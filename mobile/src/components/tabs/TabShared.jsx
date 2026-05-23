import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTopHeader from "../AppTopHeader";
import { getUnreadNotificationsCount } from "../../services/notifications/notificationService";

export const TAB_COLORS = {
  blue: "#2563EB",
  blueXLight: "#EFF6FF",
  orange: "#F97316",
  orangeDark: "#C2520F",
  ink: "#0F172A",
  inkFaint: "#94A3B8",
  white: "#FFFFFF",
  bg: "#F1F5F9",
  border: "#E2E8F0",
  surface: "#FFFFFF",
  cardBorder: "#DCE8F8",
};

export function ScreenShell({
  navigation,
  routeName,
  title,
  subtitle,
  noPadding,
  absoluteHeader,
  noPaddingBottom,
  children,
  style,
  contentContainerStyle,
  background,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode,
  notificationCount,
  stickyHeaderIndices,
  onRefresh,
  refreshing,
}) {
  const canGoBack = navigation.canGoBack();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleBack = () => {
    if (canGoBack) {
      navigation.goBack();
      return;
    }

    if (routeName !== "Home") {
      navigation.navigate("Home");
    }
  };

  const Container = absoluteHeader ? View : SafeAreaView;

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadUnread = async () => {
        if (typeof notificationCount === "number") return;
        const result = await getUnreadNotificationsCount();
        if (mounted && result.success) {
          setUnreadCount(result.count || 0);
        }
      };
      loadUnread();
      return () => {
        mounted = false;
      };
    }, [notificationCount])
  );

  return (
    <Container style={[ss.screen, background && { backgroundColor: background }, style]}>
      <StatusBar style="dark" />
      <AppTopHeader
        onBackPress={handleBack}
        onNotificationPress={() => navigation.navigate("Notifications")}
        backDisabled={!canGoBack && routeName === "Home"}
        notificationCount={typeof notificationCount === "number" ? notificationCount : unreadCount}
        absolute={absoluteHeader}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          ss.screenContent,
          noPadding && { paddingHorizontal: 0 },
          absoluteHeader && { paddingTop: 0 },
          noPaddingBottom && { paddingBottom: 0 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        stickyHeaderIndices={stickyHeaderIndices}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor="#C84B0C"
              colors={["#C84B0C"]}
            />
          ) : undefined
        }
      >
        {(title || subtitle) && (
          <LinearGradient colors={["#EEF5FF", "#FFFFFF"]} style={ss.heroCard}>
            {title ? <Text style={ss.heroTitle}>{title}</Text> : null}
            {subtitle ? <Text style={ss.heroSubtitle}>{subtitle}</Text> : null}
          </LinearGradient>
        )}
        {children}
      </ScrollView>
    </Container>
  );
}

export function InfoCard({ title, meta, body }) {
  return (
    <View style={ss.infoCard}>
      <Text style={ss.infoTitle}>{title}</Text>
      {meta ? <Text style={ss.infoMeta}>{meta}</Text> : null}
      <Text style={ss.infoBody}>{body}</Text>
    </View>
  );
}

export function NotificationsShell({ navigation, children }) {
  const canGoBack = navigation.canGoBack();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadUnread = async () => {
        const result = await getUnreadNotificationsCount();
        if (mounted && result.success) {
          setUnreadCount(result.count || 0);
        }
      };
      loadUnread();
      return () => {
        mounted = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={ss.screen}>
      <StatusBar style="dark" />
      <AppTopHeader
        onBackPress={() => {
          if (canGoBack) {
            navigation.goBack();
            return;
          }
          navigation.navigate("Home");
        }}
        onNotificationPress={() => {}}
        notificationCount={unreadCount}
      />
      <ScrollView contentContainerStyle={ss.screenContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#FFF3EA", "#FFFFFF"]} style={ss.heroCard}>
          <Text style={ss.heroTitle}>Notifications</Text>
          <Text style={ss.heroSubtitle}>Important updates from your city circle, all in one place.</Text>
        </LinearGradient>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const tabSharedStyles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  metricBlue: {
    backgroundColor: "#EAF2FF",
    borderColor: "#D3E3FF",
  },
  metricOrange: {
    backgroundColor: "#FFF0E7",
    borderColor: "#F7D9C8",
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "800",
    color: TAB_COLORS.ink,
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#5B6475",
  },
  composerCard: {
    backgroundColor: TAB_COLORS.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TAB_COLORS.cardBorder,
    padding: 18,
    gap: 12,
  },
  composerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DEE8F8",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  composerPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: TAB_COLORS.ink,
  },
  primaryButton: {
    marginTop: 6,
    height: 54,
    borderRadius: 18,
    backgroundColor: TAB_COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: TAB_COLORS.white,
    fontSize: 15,
    fontWeight: "800",
  },
  searchCard: {
    backgroundColor: TAB_COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TAB_COLORS.cardBorder,
    padding: 18,
  },
  searchInputMock: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DEE8F8",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: TAB_COLORS.inkFaint,
  },
  accountCard: {
    alignItems: "center",
    backgroundColor: TAB_COLORS.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TAB_COLORS.cardBorder,
    padding: 24,
  },
  accountAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: TAB_COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  accountAvatarText: {
    color: TAB_COLORS.white,
    fontSize: 28,
    fontWeight: "800",
  },
  accountName: {
    fontSize: 22,
    fontWeight: "800",
    color: TAB_COLORS.ink,
  },
  accountMeta: {
    marginTop: 6,
    fontSize: 14,
    color: "#738199",
  },
  accountButton: {
    marginTop: 20,
    width: "100%",
    height: 52,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  accountButtonText: {
    color: TAB_COLORS.blue,
    fontSize: 15,
    fontWeight: "800",
  },
});

const ss = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: TAB_COLORS.bg,
  },
  screenContent: {
    paddingHorizontal: 18,
    paddingBottom: 150,
    gap: 16,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TAB_COLORS.cardBorder,
    padding: 22,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "800",
    color: TAB_COLORS.ink,
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5B6475",
  },
  infoCard: {
    backgroundColor: TAB_COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TAB_COLORS.cardBorder,
    padding: 18,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TAB_COLORS.ink,
  },
  infoMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#738199",
  },
  infoBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#5B6475",
  },
});
