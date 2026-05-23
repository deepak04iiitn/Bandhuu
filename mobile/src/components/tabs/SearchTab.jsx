import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenShell } from "./TabShared";
import SearchResultItem from "../search/SearchResultItem";
import SearchSkeleton from "../search/SearchSkeleton";
import SearchInput from "../search/SearchInput";
import SearchEmptyState from "../search/SearchEmptyState";
import { searchUsers } from "../../services/users/userService";

// ─── Design tokens aligned with HomeTab ───────────────────────────────────────
const C = {
  primary:                "#004ac6",
  onPrimary:              "#ffffff",
  secondary:              "#e8380d",
  secondaryContainer:     "#fff0ed",
  onSecondaryContainer:   "#a13211",
  secondaryFixed:         "#fff8e6",
  onSecondaryFixed:       "#8f6207",
  surfaceLowest:          "#ffffff",
  surfaceLow:             "#f8f6f2",
  surfaceHigh:            "#ede9e2",
  onSurface:              "#0a0a0a",
  onSurfaceVariant:       "#888888",
  outline:                "#e0dbd4",
  cardShadow:             "#0a0a0a",
};

// ─── Remote portrait URLs (from the original HTML design) ────────────────────
const IMG = {
  ishaan:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCrpev4RcWuGGFv2A4W5dH1gTg4U6-iT5x1G1HcPASTKvs8IL_TKo5CsLpYyH9030gLCwQ50CmHY3qj6EBWBUEUzoqb4L42rTKVVUGm1HLjB0tqgkvNrQBEt4S9pk8UD1fFqxCP6uUmQgYS16WZN1LWpSAKb4NAXD3iybc3Lqq0nRbsZpXdAcsvrP_Kz2MvmCyKtADzqUyt_T-bxYMQgbqHskQNubITud-MD31kBXc1ATOAIYpAsmmmuazfF_rnQDfPoZThsveRTwk",
  meera:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBHtfMRhRMk7zqFWfObyF9I9rHAifboe6KLuDO4KYjfyUylgADKHIJFYHhfenMosuzyJt95omjmDFWOY0-NgUzKSzeCO2v_O2ginsK-UboBfuBKTxfIjHClM6ZrX8UI_rDc1352dVb9Pew8bbmAB6IhJBH0d-z5ywpxzaR1XaIvM9ZEAX-RjspyK8DPboqmi1jcGx4QYYzL9YTBkH8wojw0fTWbHwusvVAp7KSchWiKBLN8iLdrY42LEsvp57uRQ9cUT9ClH-u7i9M",
  group1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAsm2VgvQnS9Kwt3LbwjNIukWKyVTaCVx-jNjJTltSz_Ikc7D_PMXG3EO1F0Bab-64wX2qQJBRKa8610sUJRmspZREjye27uKpEygKH_p6lJy26l1vmx1qAnbXMOsdW0CeIo9rheFO2DOo1jWOHp3CFyw-iBzhSRIh7sCgV6wZPFaPQOKl0ku_cAKBXwiM8LMPW5obmBaRLm3njVmU6Co2SmzTjQt-9YSEg0lriFGgnvPJhskfVG6upOgdxclyjwUlWPkewYTKfzPQ",
  group2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDVLOM9rGmxUgivQg3HtcJrbClOev98CfKYYqYvnY04JovXbbdfNvJ_90YTyU6pIxBsPYvpCrsd1M4lyHHUh6BGLkw3jJXLdSQtTjWmjWHpwuroh9l8nNi_f0wimPiUEcduZHhSESwZxEhV7bDuRyD36ttJxavtHX6nmno_XcllYHiGwnW3CY7ACKjttaeRYK7pLEe2kdhFCzF0rDzW3jNSgL0cd34AKlc83oKi-GKbaF1UjYKDZYxhsEqyIW6Nrsf8xwKsqlV_zhM",
  group3:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBhLtsp43bIMZ5ITiZL5o0Nv2iJ0lFoSiZIoNMDluKNnOPcESZB3LnaRzIYKJr6oWU_6oJGoPyInHyKk67QR9yYr21SlmPgNY1EnXyi85SBkH2Q36RruohCZBMm1ZJSS8ZcnqWnYuF5NCqo1bbM824IYCFoe5ygJ7l5keLq73s1C2YN1p9J-6tlnvdmvuPh9GUvjoXnpgOIg6_yWaSdq-r2tzjnQN0MNjbBfia9MoDB6KY5L1q-AmgJoAMFg7P9OrBKfMqRBDHRdcw",
  rahul:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBe6O4pLaR-3px79qpY-7KxW7a-61G0Ln2aZJ1QdNnEp--ew_MqIcAUmQQIySL0BllQkexvDpdQnJ0mLmHQTn8ONEM0IJ9MyB0hlxpUCTrdu_JgLuZqCh9b-D83zObJDI-v5ZFEJPMKaKZCAnAtlIh4EzhHF0I-WUnDmmlrllIdb1m6jug_1SAyk925HcbL4NhS4Y9GeJteZuh6xph2ptPOyVWWTEJqSBIaeGEqEcJccMCzJgQIWu1A1aD-mcpzEdbpn6MunynpylY",
  ananya:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDKTBpj1QHBzfRmodW1CJ3bA6Oi-ukqRcVYcPDn5TZ8EGP-aIngpTysMdMfcTAUSKTEegfdUzV_tOFZvUDIDBG6fxOmJzqfWuWLzViurpS-Nx2pRSam3XX2MkNADHgYXrnBt5c2pRHZ0KWFBaxZLIL3WgS64GAwDwkTEkdAwob6wjX3cMMtzLq6OTD8Sxt2HA_wcuI86xBVApb1qHCjAnwYvwQV1we9mPVu-7ZY0Jftc6C4M8EpAxH2rJcFAiox7oeVqMuuVoVG6z8",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LocationPill({ icon, label, color }) {
  return (
    <View style={s.locationPill}>
      <MaterialIcons name={icon} size={13} color={color} />
      <Text style={s.locationPillText}>{label}</Text>
    </View>
  );
}

function SuggestionCard({ avatar, name, handle, hometown, currentCity, primaryAction }) {
  return (
    <View style={s.suggestionCard}>
      <View>
        <Image source={{ uri: avatar }} style={s.suggestionAvatar} />
        {primaryAction && (
          <View style={s.verifiedBadge}>
            <MaterialIcons name="verified" size={11} color={C.onPrimary} />
          </View>
        )}
      </View>
      <View style={s.suggestionBody}>
        <Text style={s.suggestionName}>{name}</Text>
        <Text style={s.suggestionHandle}>{handle}</Text>
        <View style={s.locationRow}>
          <LocationPill icon="home" label={`Hometown: ${hometown}`} color={C.primary} />
          <LocationPill icon="location-city" label={`Current: ${currentCity}`} color={C.secondary} />
        </View>
      </View>
      <Pressable
        style={[
          s.addYaariBtn,
          primaryAction
            ? { backgroundColor: C.primary }
            : { backgroundColor: C.surfaceHigh },
        ]}
      >
        <Text style={[s.addYaariText, { color: primaryAction ? C.onPrimary : C.primary }]}>
          Add Yaari
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Discover view (shown when search bar is empty) ──────────────────────────

function DiscoverView() {
  return (
    <>
      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>TRENDING YAARIS</Text>
        <Pressable>
          <Text style={s.viewAllBtn}>See all -></Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.railRow}
      >
        <Pressable style={[s.railCard, s.railCardLarge]}>
          <Image source={{ uri: IMG.ishaan }} style={s.railCardImage} resizeMode="cover" />
          <View style={s.railCardBody}>
            <Text style={s.railCardTitle}>Ishaan Malik</Text>
            <Text style={s.railCardMeta}>Lucknow -> Bengaluru</Text>
            <View style={s.railBadge}>
              <Text style={s.railBadgeText}>TOP CONNECTOR</Text>
            </View>
          </View>
        </Pressable>

        <Pressable style={s.railCard}>
          <Image source={{ uri: IMG.meera }} style={s.railCardImage} resizeMode="cover" />
          <View style={s.railCardBody}>
            <Text style={s.railCardTitle}>Meera V.</Text>
            <Text style={s.railCardMeta}>Jaipur -> Mumbai</Text>
            <View style={[s.railBadge, { backgroundColor: C.secondaryContainer }]}>
              <Text style={[s.railBadgeText, { color: C.onSecondaryContainer }]}>NEW HERE</Text>
            </View>
          </View>
        </Pressable>

        <Pressable style={s.railCardPromo}>
          <MaterialIcons name="people-alt" size={24} color={C.onPrimary} />
          <Text style={s.railPromoTitle}>Join Jaipur Circle</Text>
          <Text style={s.railPromoMeta}>1.2k active yaaris nearby</Text>
          <View style={s.railPromoBtn}>
            <Text style={s.railPromoBtnText}>JOIN NOW</Text>
          </View>
        </Pressable>
      </ScrollView>

      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>DISCOVER IN YOUR CITY</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.railRow}
      >
        <Pressable style={[s.discoveryCard, { backgroundColor: C.secondaryContainer }]}>
          <MaterialIcons name="location-on" size={22} color={C.onSecondaryContainer} />
          <Text style={s.discoveryTitle}>Nearby Yaaris</Text>
          <Text style={s.discoveryMeta}>People around your area right now</Text>
        </Pressable>

        <Pressable style={s.discoveryCard}>
          <View style={s.stackedAvatars}>
            {[IMG.group1, IMG.group2, IMG.group3].map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[s.stackedAvatar, i > 0 && { marginLeft: -14 }]}
                resizeMode="cover"
              />
            ))}
            <View style={[s.stackedAvatar, s.stackedCount, { marginLeft: -14 }]}>
              <Text style={s.stackedCountText}>+24</Text>
            </View>
          </View>
          <Text style={s.discoveryTitle}>New in your area</Text>
          <Text style={s.discoveryMeta}>Fresh movers from your hometown</Text>
        </Pressable>
      </ScrollView>

      <View style={s.sectionHeader}>
        <Text style={s.sectionLabel}>SUGGESTED FOR YOU</Text>
      </View>

      <SuggestionCard
        avatar={IMG.rahul}
        name="Rahul Sharma"
        handle="@rahul_sharma"
        hometown="Jaipur"
        currentCity="Bengaluru"
        primaryAction
      />

      <SuggestionCard
        avatar={IMG.ananya}
        name="Ananya Sharma"
        handle="@ananya_codes"
        hometown="Jaipur"
        currentCity="Mumbai"
        primaryAction={false}
      />

      {/* Empty-state hint */}
      <View style={s.emptyHint}>
        <View style={s.emptyHintIcon}>
          <MaterialIcons name="auto-awesome" size={28} color={C.outline} />
        </View>
        <Text style={s.emptyHintTitle}>More suggestions coming soon</Text>
        <Text style={s.emptyHintSubtitle}>
          We're finding more people from Jaipur in your network.
        </Text>
      </View>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchTab({ navigation }) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [hasMore, setHasMore]     = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      setPage(1);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      if (active) {
        setIsLoading(true);
        setPage(1);
        performSearch(query, 1);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const performSearch = async (q, p) => {
    const data = await searchUsers(q, p);
    
    if (p === 1) {
      setResults(data.users || []);
    } else {
      setResults(prev => [...prev, ...(data.users || [])]);
    }
    
    setTotal(data.total || 0);
    setHasMore(data.hasMore || false);
    setIsLoading(false);
    setIsMoreLoading(false);
  };

  const loadMore = () => {
    if (hasMore && !isMoreLoading) {
      setIsMoreLoading(true);
      const nextPage = page + 1;
      setPage(nextPage);
      performSearch(query, nextPage);
    }
  };

  const handleUserPress = useCallback(
    (user) => navigation.navigate("UserProfile", { username: user.username }),
    [navigation]
  );

  const searching = query.trim().length > 0;

  return (
    <ScreenShell
      navigation={navigation}
      routeName="Search"
      noPadding
      background={C.surfaceLow}
      contentContainerStyle={s.screenContent}
      stickyHeaderIndices={[0]}
    >
      <View style={s.stickySearchPanel}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>SEARCH PEOPLE</Text>
        </View>

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for friends or usernames..."
        />
      </View>

      <View style={s.main}>
        {searching ? (
          <>
            {total > 0 && !isLoading && (
              <Text style={s.resultsTitle}>
                {total} {total === 1 ? 'result' : 'results'} for "{query}"
              </Text>
            )}

            <View style={s.resultsCard}>
              {isLoading ? (
                <SearchSkeleton />
              ) : results.length > 0 ? (
                <>
                  <FlatList
                    data={results}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item, index }) => (
                      <SearchResultItem
                        user={item}
                        onPress={handleUserPress}
                        isLast={index === results.length - 1}
                      />
                    )}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                  {hasMore && (
                    <Pressable
                      onPress={loadMore}
                      style={({ pressed }) => [s.loadMoreBtn, pressed && { opacity: 0.7 }]}
                      disabled={isMoreLoading}
                    >
                      {isMoreLoading ? (
                        <ActivityIndicator size="small" color={C.primary} />
                      ) : (
                        <Text style={s.loadMoreText}>Show more</Text>
                      )}
                    </Pressable>
                  )}
                </>
              ) : (
                <SearchEmptyState query={query} />
              )}
            </View>
          </>
        ) : (
          <DiscoverView />
        )}
      </View>
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: C.cardShadow,
  shadowOffset: { width: 3, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 5,
};

const s = StyleSheet.create({
  screenContent: {
    backgroundColor: C.surfaceLow,
    paddingHorizontal: 0,
    paddingBottom: 120,
  },
  main: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 120,
  },
  stickySearchPanel: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: C.surfaceLow,
    borderBottomWidth: 1,
    borderBottomColor: C.border || "#E2E8F0",
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: C.onSurfaceVariant,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: C.onSurface,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: "800",
    color: C.primary,
    letterSpacing: 0.3,
  },
  railRow: {
    paddingBottom: 6,
    gap: 12,
    paddingRight: 4,
  },
  railCard: {
    width: 176,
    backgroundColor: C.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.outline,
    overflow: "hidden",
    ...CARD_SHADOW,
  },
  railCardLarge: {
    width: 228,
  },
  railCardImage: {
    width: "100%",
    height: 120,
  },
  railCardBody: {
    padding: 12,
    gap: 4,
  },
  railCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: C.onSurface,
  },
  railCardMeta: {
    fontSize: 11,
    color: C.onSurfaceVariant,
    fontWeight: "700",
  },
  railBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.secondaryFixed,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  railBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: C.onSecondaryFixed,
    letterSpacing: 1,
  },
  railCardPromo: {
    width: 176,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: C.primary,
    padding: 14,
    justifyContent: "space-between",
    ...CARD_SHADOW,
  },
  railPromoTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: C.onPrimary,
    letterSpacing: -0.3,
    marginTop: 8,
  },
  railPromoMeta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginTop: 2,
  },
  railPromoBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  railPromoBtnText: {
    color: C.onPrimary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  discoveryCard: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.outline,
    backgroundColor: C.surfaceLowest,
    padding: 14,
    ...CARD_SHADOW,
  },
  discoveryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: C.onSurface,
    marginTop: 10,
  },
  discoveryMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: C.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 17,
  },

  // Base card
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: C.outline,
    ...CARD_SHADOW,
  },

  // ── Grid row A ──────────────────────────────────────────────────────────────
  gridRowA: {
    flexDirection: "row",
    gap: 12,
  },

  // Card 1 — Ishaan tall portrait
  cardTall: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  portraitImg: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
  },
  portraitMeta: {
    gap: 6,
  },
  portraitName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.onSurface,
  },
  hometownBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.secondaryFixed,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hometownBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: C.onSecondaryFixed,
    letterSpacing: 0.8,
  },

  // Right column (Cards 2 & 3)
  gridRightCol: {
    flex: 1,
    gap: 12,
  },

  // Card 2 — Community (blue)
  communityCard: {
    flex: 1,
    padding: 16,
    justifyContent: "flex-end",
    gap: 4,
  },
  communityCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 18,
  },
  communityCardMeta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
  },

  // Card 3 — Meera
  meeraCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
  },
  meeraAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "rgba(0,74,198,0.12)",
  },
  meeraName: {
    fontSize: 13,
    fontWeight: "700",
    color: C.onSurface,
  },
  meeraHandle: {
    fontSize: 10,
    color: C.onSurfaceVariant,
  },

  // ── Grid row B ──────────────────────────────────────────────────────────────
  gridRowB: {
    flexDirection: "row",
    gap: 12,
  },

  // Card 4 — Nearby Yaaris (orange)
  nearbyCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  nearbyText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.onSecondaryContainer,
    textAlign: "center",
  },

  // Card 5 — New in area (wide)
  newInAreaCard: {
    flex: 1.7,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stackedAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: C.surfaceLow,
  },
  stackedCount: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  stackedCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.onSurface,
  },
  newInAreaText: {
    flex: 1,
    gap: 2,
  },
  newInAreaTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.onSurface,
  },
  newInAreaSubtitle: {
    fontSize: 10,
    color: C.onSurfaceVariant,
    lineHeight: 14,
  },

  // ── Suggestion cards ────────────────────────────────────────────────────────
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surfaceLowest,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.outline,
    padding: 16,
    ...CARD_SHADOW,
  },
  suggestionAvatar: {
    width: 68,
    height: 68,
    borderRadius: 16,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: C.secondary,
    borderRadius: 10,
    padding: 3,
    borderWidth: 3,
    borderColor: C.surfaceLowest,
  },
  suggestionBody: {
    flex: 1,
    gap: 2,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.onSurface,
  },
  suggestionHandle: {
    fontSize: 12,
    color: C.onSurfaceVariant,
  },
  locationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.onSurfaceVariant,
  },
  addYaariBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
  },
  addYaariText: {
    fontSize: 12,
    fontWeight: "800",
  },

  // ── Empty hint ──────────────────────────────────────────────────────────────
  emptyHint: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyHintIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHintTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.onSurface,
  },
  emptyHintSubtitle: {
    fontSize: 13,
    color: C.onSurfaceVariant,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  resultsTitle: {
    fontSize: 12,
    color: C.onSurfaceVariant,
    marginTop: 4,
    marginLeft: 2,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  resultsCard: {
    backgroundColor: C.surfaceLowest,
    borderRadius: 16,
    paddingVertical: 4,
    minHeight: 180,
    borderWidth: 1.5,
    borderColor: C.outline,
    ...CARD_SHADOW,
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  noResultsText: {
    fontSize: 14,
    color: C.onSurfaceVariant,
  },
  loadMoreBtn: {
    marginTop: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: C.outline,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "900",
    color: C.primary,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});
