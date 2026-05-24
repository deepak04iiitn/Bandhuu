import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Image, TextInput, ScrollView,
  Pressable, Dimensions, ActivityIndicator, Platform, Animated, PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenShell } from "./TabShared";
import { createMeetupWithImage } from "../../services/meetups/meetupService";

const { width } = Dimensions.get("window");
const API_BASE_URL = "http://192.168.31.65:5000/api";

// ─── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  bg:          "#F5F0EB",
  surface:     "#FEFCFA",
  inputBg:     "#EDE8E0",
  terra:       "#C84B0C",
  terraLight:  "#FDF0EA",
  green:       "#1A6B4A",
  ink:         "#1C1410",
  inkMid:      "#5C4F47",
  inkMuted:    "#9C8D84",
  border:      "#E8E0D8",
  divider:     "#EEEAE3",
  white:       "#FFFFFF",
  amber:       "#B45309",
  amberLight:  "#FEF3C7",
  amberBorder: "#FCD34D",
  catGeneral:  "#D4820A", catGeneralBg:  "#FEF7E8",
  catHousing:  "#3B6CA8", catHousingBg:  "#EEF3FC",
  catTravel:   "#1A7A5E", catTravelBg:   "#E8F5F1",
  catHangouts: "#B83055", catHangoutsBg: "#FDEEF3",
  catHelp:     "#7040B8", catHelpBg:     "#F3EEFE",
};

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

const CATEGORIES = [
  { name: "General",            icon: "article",  color: C.catGeneral,  bg: C.catGeneralBg  },
  { name: "Flatmate / Housing", icon: "home",     color: C.catHousing,  bg: C.catHousingBg  },
  { name: "Travelmate",         icon: "explore",  color: C.catTravel,   bg: C.catTravelBg   },
  { name: "Trip",               icon: "map",      color: C.catTravel,   bg: C.catTravelBg   },
  { name: "Hangouts",           icon: "people",   color: C.catHangouts, bg: C.catHangoutsBg },
  { name: "Help / Questions",   icon: "help",     color: C.catHelp,     bg: C.catHelpBg     },
];

const charColor = (len, max) => {
  if (len >= max * 0.9) return C.terra;
  if (len >= max * 0.7) return C.amber;
  return C.inkMuted;
};

const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function PostTab({ navigation }) {
  const { token, user }  = useAuth();
  const { showSnackbar } = useSnackbar();
  const insets           = useSafeAreaInsets();

  const [mode, setMode] = useState("Post");

  // post
  const [category, setCategory]      = useState("General");
  const [title, setTitle]            = useState("");
  const [details, setDetails]        = useState("");
  const [image, setImage]            = useState(null);
  const [showPostSuccess, setPostOk] = useState(false);

  // meetup
  const [mTitle, setMT]          = useState("");
  const [mDetails, setMD]        = useState("");
  const [mMembers, setMM]        = useState(10);
  const [mHometown, setMH]       = useState("");
  const [mLocation, setML]       = useState("");
  const [mVenue, setMV]          = useState("");
  const [mDate, setMDate]        = useState(new Date());
  const [mTime, setMTime]        = useState(new Date());
  const [mImage, setMImg]        = useState(null);
  const [showDatePicker, setSDP] = useState(false);
  const [showTimePicker, setSTP] = useState(false);
  const [meetupOk, setMeetupOk]  = useState(false);

  // shared
  const [submitting, setSubmitting]       = useState(false);
  const [profileBanner, setProfileBanner] = useState(false);

  const successFade  = useRef(new Animated.Value(0)).current;
  const stepperScale = useRef(new Animated.Value(1)).current;

  // ── pager ─────────────────────────────────────────────────────────────────
  const modeRef   = useRef("Post");
  const translateX = useRef(new Animated.Value(0)).current;

  const snapTo = (toValue) => {
    Animated.spring(translateX, {
      toValue, useNativeDriver: true,
      tension: 80, friction: 12, overshootClamping: true,
    }).start();
  };

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderMove: (_, { dx }) => {
        const base = modeRef.current === "Post" ? 0 : -width;
        const next = base + dx;
        if (next > 0)        translateX.setValue(next * 0.15);
        else if (next < -width) translateX.setValue(-width + (next + width) * 0.15);
        else                    translateX.setValue(next);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const cur = modeRef.current;
        let next = cur;
        if (cur === "Post"   && (dx < -(width * 0.25) || vx < -0.4)) next = "Meetup";
        if (cur === "Meetup" && (dx > width * 0.25   || vx > 0.4))  next = "Post";
        if (next !== cur) { modeRef.current = next; setMode(next); }
        snapTo(next === "Meetup" ? -width : 0);
      },
      onPanResponderTerminate: () => snapTo(modeRef.current === "Post" ? 0 : -width),
    })
  ).current;

  useEffect(() => {
    if (user?.hometown  && !mHometown) setMH(user.hometown);
    if (user?.location  && !mLocation) setML(user.location.split(",")[0].trim());
  }, [user?._id]);

  // ── mode switch (tap) ─────────────────────────────────────────────────────
  // Drafts are preserved — both forms are always rendered side-by-side.
  const switchMode = (next) => {
    if (modeRef.current === next) return;
    modeRef.current = next;
    setMode(next);
    setProfileBanner(false);
    snapTo(next === "Meetup" ? -width : 0);
  };

  const resetPost   = () => { setTitle(""); setDetails(""); setImage(null); setCategory("General"); setPostOk(false); };
  const resetMeetup = () => {
    setMT(""); setMD(""); setMM(10);
    setMH(user?.hometown || ""); setML(user?.location?.split(",")[0]?.trim() || "");
    setMV(""); setMDate(new Date()); setMTime(new Date()); setMImg(null); setMeetupOk(false);
  };

  // ── image ────────────────────────────────────────────────────────────────
  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { showSnackbar("Please allow access to your photos.", "info"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        showSnackbar("Image too large. Max 2 MB.", "error"); return;
      }
      setter(asset);
    }
  };

  const isProfileComplete = !!(user?.hometownCountry && user?.country && user?.organization && user?.bio);

  const bumpStepper = () => {
    Animated.sequence([
      Animated.timing(stepperScale, { toValue: 1.3, duration: 70, useNativeDriver: true }),
      Animated.spring(stepperScale, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const fadeSuccess = () => {
    successFade.setValue(0);
    Animated.timing(successFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  // ── submit post ──────────────────────────────────────────────────────────
  const handleSharePost = async () => {
    if (!title.trim() || !details.trim()) { showSnackbar("Add a title and details first.", "info"); return; }
    if (!isProfileComplete) { setProfileBanner(true); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("category", category);
      fd.append("title", title.trim());
      fd.append("details", details.trim());
      if (image) {
        const uri = image.uri; const fn = uri.split("/").pop(); const m = /\.(\w+)$/.exec(fn);
        fd.append("postImage", { uri, name: fn, type: m ? `image/${m[1]}` : "image" });
      }
      await axios.post(`${API_BASE_URL}/posts`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      resetPost(); setPostOk(true); fadeSuccess();
    } catch (e) {
      showSnackbar(e.response?.data?.message || "Something went wrong.", "error");
    } finally { setSubmitting(false); }
  };

  // ── submit meetup ────────────────────────────────────────────────────────
  const handleCreateMeetup = async () => {
    if (!mTitle.trim() || !mDetails.trim()) { showSnackbar("Add a title and description.", "info"); return; }
    if (mMembers < 2) { showSnackbar("At least 2 members required.", "info"); return; }
    if (!mVenue.trim() || !mLocation.trim()) { showSnackbar("Add venue and location.", "info"); return; }
    if (!isProfileComplete) { setProfileBanner(true); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", mTitle.trim()); fd.append("details", mDetails.trim());
      fd.append("maxMembers", String(mMembers)); fd.append("hometown", mHometown.trim());
      fd.append("meetupLocation", mLocation.trim()); fd.append("venue", mVenue.trim());
      fd.append("date", mDate.toISOString());
      fd.append("time", `${mTime.getHours().toString().padStart(2,"0")}:${mTime.getMinutes().toString().padStart(2,"0")}`);
      if (mImage) {
        const uri = mImage.uri; const fn = uri.split("/").pop(); const m = /\.(\w+)$/.exec(fn);
        fd.append("meetupImage", { uri, name: fn, type: m ? `image/${m[1]}` : "image/jpeg" });
      }
      const res = await createMeetupWithImage(fd);
      if (!res.success) { showSnackbar(res.message || "Failed to create meetup.", "error"); return; }
      resetMeetup(); setMeetupOk(true); fadeSuccess();
    } catch (e) {
      showSnackbar("Something went wrong. Try again.", "error");
    } finally { setSubmitting(false); }
  };

  const activeCat = CATEGORIES.find(c => c.name === category) || CATEGORIES[0];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      navigation={navigation}
      routeName="Post"
      title={null}
      noPadding
      noPaddingBottom
      background={C.bg}
      keyboardShouldPersistTaps="handled"
    >

      {/* ─── SEGMENTED MODE CONTROL ─── */}
      <View style={s.segWrap}>
        <View style={s.segControl}>
          {[
            { key: "Post",   label: "Share a Post"  },
            { key: "Meetup", label: "Plan a Meetup" },
          ].map((m) => (
            <Pressable
              key={m.key}
              onPress={() => switchMode(m.key)}
              style={[s.segTab, mode === m.key && s.segTabActive]}
            >
              <Text style={[s.segTabTxt, mode === m.key && s.segTabTxtActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ═══ SWIPEABLE PAGER — both pages always rendered ═══ */}
      <View style={{ overflow: "hidden" }} {...swipePan.panHandlers}>
        <Animated.View style={{ flexDirection: "row", width: width * 2, transform: [{ translateX }] }}>

          {/* ── PAGE 0: POST ── */}
          <View style={{ width }}>
            {showPostSuccess ? (
              <Animated.View style={[s.successView, { opacity: successFade }]}>
                <View style={[s.successCircle, { backgroundColor: activeCat.color }]}>
                  <MaterialIcons name="check" size={36} color={C.white} />
                </View>
                <Text style={s.successHead}>Post shared.</Text>
                <Text style={s.successSub}>Your post is now live in the feed.</Text>
                <View style={s.successBtns}>
                  <Pressable style={s.successOutline} onPress={() => navigation.navigate("Home")}>
                    <Text style={[s.successOutlineTxt, { color: activeCat.color }]}>View feed</Text>
                  </Pressable>
                  <Pressable
                    style={[s.successFill, { backgroundColor: activeCat.color }]}
                    onPress={() => { successFade.setValue(0); setPostOk(false); }}
                  >
                    <Text style={s.successFillTxt}>Post again</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <View style={s.formWrap}>
                {/* Category chips */}
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.catStrip} nestedScrollEnabled
                >
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.name;
                    return (
                      <Pressable
                        key={cat.name}
                        style={[s.catPill, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                        onPress={() => setCategory(cat.name)}
                      >
                        <MaterialIcons name={cat.icon} size={13} color={active ? C.white : cat.color} />
                        <Text style={[s.catPillTxt, { color: active ? C.white : cat.color }]}>
                          {cat.name.split(" / ")[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Writing card */}
                <View style={s.writeCard}>
                  <TextInput
                    style={s.titleField}
                    placeholder="Give your post a headline…"
                    placeholderTextColor={C.inkMuted}
                    value={title}
                    onChangeText={(t) => setTitle(t.slice(0, 80))}
                    multiline maxLength={80}
                  />
                  <View style={s.writeSep} />
                  <TextInput
                    style={s.bodyField}
                    placeholder="Share more context — what you're looking for, what makes this interesting…"
                    placeholderTextColor={C.inkMuted}
                    multiline textAlignVertical="top"
                    value={details}
                    onChangeText={(t) => setDetails(t.slice(0, 500))}
                    maxLength={500}
                  />
                  <View style={s.charRow}>
                    <Text style={[s.charCount, { color: charColor(details.length, 500) }]}>{details.length}/500</Text>
                  </View>
                  {image && (
                    <View style={s.imgPreviewWrap}>
                      <Image source={{ uri: image.uri }} style={s.imgPreview} />
                      <Pressable style={s.imgRemove} onPress={() => setImage(null)}>
                        <MaterialIcons name="close" size={15} color={C.white} />
                      </Pressable>
                    </View>
                  )}
                  <View style={s.cardActionSep} />
                  <View style={s.cardActions}>
                    <Pressable style={s.cardPhotoBtn} onPress={() => pickImage(setImage)}>
                      <MaterialIcons
                        name={image ? "image" : "add-photo-alternate"} size={21}
                        color={image ? activeCat.color : C.inkMuted}
                      />
                    </Pressable>
                    <View style={[s.cardCatBadge, { backgroundColor: activeCat.bg }]}>
                      <MaterialIcons name={activeCat.icon} size={11} color={activeCat.color} />
                      <Text style={[s.cardCatTxt, { color: activeCat.color }]}>{activeCat.name.split(" / ")[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      style={[s.cardSubmit, { backgroundColor: activeCat.color }, submitting && { opacity: 0.7 }]}
                      onPress={handleSharePost} disabled={submitting}
                    >
                      {submitting
                        ? <ActivityIndicator size="small" color={C.white} />
                        : <Text style={s.cardSubmitTxt}>Share Post</Text>
                      }
                    </Pressable>
                  </View>
                </View>

                {profileBanner && <ProfileBanner onFinish={() => { setProfileBanner(false); navigation.navigate("Account"); }} />}
              </View>
            )}
          </View>
          {/* ── end page 0 ── */}

          {/* ── PAGE 1: MEETUP ── */}
          <View style={{ width }}>
            {meetupOk ? (
              <Animated.View style={[s.successView, { opacity: successFade }]}>
                <Text style={s.successEmoji}>🎉</Text>
                <Text style={s.successHead}>Meetup created.</Text>
                <Text style={s.successSub}>Others can discover and join. You're in the group chat.</Text>
                <View style={s.successBtns}>
                  <Pressable style={s.successOutline} onPress={() => { setMeetupOk(false); navigation.navigate("Home"); }}>
                    <Text style={[s.successOutlineTxt, { color: C.terra }]}>See Meetups</Text>
                  </Pressable>
                  <Pressable style={[s.successFill, { backgroundColor: C.terra }]} onPress={() => { successFade.setValue(0); setMeetupOk(false); }}>
                    <Text style={s.successFillTxt}>Create another</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              <View style={s.formWrap}>
                {/* Cover image */}
                <Pressable style={[s.coverZone, mImage && s.coverZoneFilled]} onPress={() => pickImage(setMImg)}>
                  {mImage ? (
                    <>
                      <Image source={{ uri: mImage.uri }} style={s.coverImg} />
                      <Pressable style={s.imgRemoveCover} onPress={() => setMImg(null)}>
                        <MaterialIcons name="close" size={15} color={C.white} />
                      </Pressable>
                    </>
                  ) : (
                    <View style={s.coverEmpty}>
                      <MaterialIcons name="add-photo-alternate" size={26} color={C.terra} />
                      <Text style={s.coverEmptyTitle}>Add a cover photo</Text>
                      <Text style={s.coverEmptySub}>Makes your meetup stand out in the feed</Text>
                    </View>
                  )}
                </Pressable>

                {/* Writing card */}
                <View style={s.writeCard}>
                  <TextInput
                    style={s.titleField} placeholder="Name your meetup…"
                    placeholderTextColor={C.inkMuted} value={mTitle}
                    onChangeText={(t) => setMT(t.slice(0, 80))} multiline maxLength={80}
                  />
                  <View style={s.writeSep} />
                  <TextInput
                    style={s.bodyField} placeholder="What's happening? Who should come?"
                    placeholderTextColor={C.inkMuted} multiline textAlignVertical="top"
                    value={mDetails} onChangeText={(t) => setMD(t.slice(0, 400))} maxLength={400}
                  />
                  <View style={s.charRow}>
                    <Text style={[s.charCount, { color: charColor(mDetails.length, 400) }]}>{mDetails.length}/400</Text>
                  </View>
                </View>

                {/* Date + Time */}
                <View style={s.eventRow}>
                  <Pressable style={s.eventChip} onPress={() => setSDP(true)}>
                    <View style={[s.eventIcon, { backgroundColor: C.terraLight }]}>
                      <Text style={s.eventIconDay}>{mDate.getDate()}</Text>
                      <Text style={s.eventIconMon}>{mDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventChipLabel}>DATE</Text>
                      <Text style={s.eventChipValue}>{fmtDate(mDate)}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={16} color={C.inkMuted} />
                  </Pressable>
                  <Pressable style={s.eventChip} onPress={() => setSTP(true)}>
                    <View style={[s.eventIcon, { backgroundColor: C.catHousingBg }]}>
                      <MaterialIcons name="schedule" size={19} color={C.catHousing} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventChipLabel}>TIME</Text>
                      <Text style={s.eventChipValue}>{fmtTime(mTime)}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={16} color={C.inkMuted} />
                  </Pressable>
                </View>

                {showDatePicker && (
                  <DateTimePicker value={mDate} mode="date" minimumDate={new Date()}
                    onChange={(e, d) => { setSDP(Platform.OS === "ios"); if (d) setMDate(d); }} />
                )}
                {showTimePicker && (
                  <DateTimePicker value={mTime} mode="time"
                    onChange={(e, d) => { setSTP(Platform.OS === "ios"); if (d) setMTime(d); }} />
                )}

                {/* Members + Hometown */}
                <View style={s.detailCard}>
                  <View style={s.detailRow}>
                    <View style={[s.detailIcon, { backgroundColor: C.catTravelBg }]}>
                      <MaterialIcons name="group" size={15} color={C.catTravel} />
                    </View>
                    <Text style={[s.detailLabel, { flex: 1 }]}>MAX MEMBERS</Text>
                    <View style={s.stepperInline}>
                      <Pressable style={[s.stepperBtn, mMembers <= 2 && s.stepperBtnDim]}
                        onPress={() => { if (mMembers > 2) { setMM(p => p - 1); bumpStepper(); } }} disabled={mMembers <= 2}>
                        <MaterialIcons name="remove" size={15} color={mMembers <= 2 ? C.inkMuted : C.terra} />
                      </Pressable>
                      <Animated.Text style={[s.stepperNum, { transform: [{ scale: stepperScale }] }]}>{mMembers}</Animated.Text>
                      <Pressable style={[s.stepperBtnFill, mMembers >= 50 && s.stepperBtnDim]}
                        onPress={() => { if (mMembers < 50) { setMM(p => p + 1); bumpStepper(); } }} disabled={mMembers >= 50}>
                        <MaterialIcons name="add" size={15} color={mMembers >= 50 ? C.inkMuted : C.white} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={s.detailSep} />
                  <View style={s.detailRow}>
                    <View style={[s.detailIcon, { backgroundColor: C.terraLight }]}>
                      <MaterialIcons name="home" size={15} color={C.terra} />
                    </View>
                    <TextInput style={s.detailInput} placeholder="Target hometown (e.g. Patna)"
                      placeholderTextColor={C.inkMuted} value={mHometown} onChangeText={setMH} />
                  </View>
                </View>

                {/* Location */}
                <View style={s.detailCard}>
                  <View style={s.detailRow}>
                    <View style={[s.detailIcon, { backgroundColor: C.catHousingBg }]}>
                      <MaterialIcons name="location-on" size={15} color={C.catHousing} />
                    </View>
                    <TextInput style={s.detailInput} placeholder="Venue name (Chai Bar, someone's place…)"
                      placeholderTextColor={C.inkMuted} value={mVenue} onChangeText={setMV} />
                  </View>
                  <View style={s.detailSep} />
                  <View style={s.detailRow}>
                    <View style={[s.detailIcon, { backgroundColor: C.catHousingBg }]}>
                      <MaterialIcons name="place" size={15} color={C.catHousing} />
                    </View>
                    <TextInput style={s.detailInput} placeholder="City / Area (Koramangala, Bengaluru…)"
                      placeholderTextColor={C.inkMuted} value={mLocation} onChangeText={setML} />
                  </View>
                </View>

                {profileBanner && <ProfileBanner onFinish={() => { setProfileBanner(false); navigation.navigate("Account"); }} />}

                <Pressable style={[s.meetupSubmit, submitting && { opacity: 0.7 }]}
                  onPress={handleCreateMeetup} disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator size="small" color={C.white} />
                    : <Text style={s.meetupSubmitTxt}>Create Meetup</Text>
                  }
                </Pressable>
                <View style={{ height: 120 }} />
              </View>
            )}
          </View>
          {/* ── end page 1 ── */}

        </Animated.View>
      </View>

    </ScreenShell>
  );
}

// ─── PROFILE BANNER ───────────────────────────────────────────────────────────
function ProfileBanner({ onFinish }) {
  return (
    <View style={s.profileBanner}>
      <MaterialIcons name="info-outline" size={14} color={C.amber} />
      <Text style={s.profileBannerTxt}>Complete your profile to post.</Text>
      <Pressable onPress={onFinish}>
        <Text style={s.profileBannerLink}>Finish →</Text>
      </Pressable>
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({

  // ── Segmented control ──
  segWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  segControl: {
    flexDirection: "row",
    backgroundColor: C.inputBg,
    borderRadius: 14,
    padding: 4,
  },
  segTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 11,
  },
  segTabActive: {
    backgroundColor: C.white,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segTabTxt: { fontSize: 13, fontWeight: "700", color: C.inkMuted, letterSpacing: -0.1 },
  segTabTxtActive: { color: C.terra, fontWeight: "800" },

  // ── Form wrapper ──
  formWrap: { paddingBottom: 32 },

  // ── Category strip ──
  catStrip: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 8,
  },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.border,
  },
  catPillTxt: { fontSize: 12, fontWeight: "700" },

  // ── Writing card ──
  writeCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  titleField: {
    fontFamily: SERIF,
    fontSize: 21,
    fontWeight: "700",
    color: C.ink,
    lineHeight: 29,
    minHeight: 50,
    padding: 0,
    letterSpacing: -0.3,
  },
  writeSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginVertical: 14,
  },
  bodyField: {
    fontSize: 15,
    color: C.inkMid,
    lineHeight: 24,
    minHeight: 100,
    padding: 0,
    textAlignVertical: "top",
    fontWeight: "400",
  },
  charRow: { alignItems: "flex-end", marginTop: 6 },
  charCount: { fontSize: 11, fontWeight: "600" },

  // ── Inline image preview ──
  imgPreviewWrap: {
    marginTop: 14,
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 16 / 9,
  },
  imgPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imgRemove: {
    position: "absolute", top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },

  // ── Card action row (inside write card) ──
  cardActionSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginTop: 14,
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardPhotoBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.bg,
  },
  cardCatBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  cardCatTxt: { fontSize: 11, fontWeight: "800" },
  cardSubmit: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, minWidth: 100, alignItems: "center",
  },
  cardSubmitTxt: { fontSize: 13, fontWeight: "800", color: C.white, letterSpacing: 0.2 },

  // ── Profile banner ──
  profileBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.amberLight, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.amberBorder,
    marginHorizontal: 16, marginTop: 10,
  },
  profileBannerTxt:  { flex: 1, fontSize: 12, fontWeight: "600", color: C.amber },
  profileBannerLink: { fontSize: 12, fontWeight: "800", color: C.amber },

  // ── Meetup: cover image ──
  coverZone: {
    marginHorizontal: 16,
    height: 175,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  coverZoneFilled: { borderStyle: "solid", borderColor: "transparent" },
  coverImg: { width: "100%", height: "100%", resizeMode: "cover" },
  imgRemoveCover: {
    position: "absolute", top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },
  coverEmpty: { alignItems: "center", gap: 6 },
  coverEmptyTitle: { fontSize: 14, fontWeight: "700", color: C.inkMid, marginTop: 4 },
  coverEmptySub:   { fontSize: 12, color: C.inkMuted },

  // ── Meetup: event row ──
  eventRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  eventChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  eventIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  eventIconDay: { fontSize: 14, fontWeight: "900", color: C.terra, lineHeight: 16 },
  eventIconMon: { fontSize: 7,  fontWeight: "800", color: C.terra, letterSpacing: 0.8 },
  eventChipLabel: { fontSize: 8, fontWeight: "900", color: C.inkMuted, letterSpacing: 1.2 },
  eventChipValue: { fontSize: 12, fontWeight: "700", color: C.ink, marginTop: 2 },

  // ── Meetup: detail card ──
  detailCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginLeft: 52,
  },
  detailIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  detailLabel: { fontSize: 13, fontWeight: "600", color: C.inkMid },
  detailInput: { flex: 1, fontSize: 14, fontWeight: "500", color: C.ink, padding: 0 },

  // ── Stepper ──
  stepperInline: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.terra,
  },
  stepperBtnFill: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.terra,
  },
  stepperBtnDim: { borderColor: C.border, backgroundColor: C.border, opacity: 0.4 },
  stepperNum: { fontSize: 18, fontWeight: "900", color: C.ink, minWidth: 28, textAlign: "center" },

  // ── Meetup submit ──
  meetupSubmit: {
    marginHorizontal: 16,
    marginTop: 20,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.terra,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.terra,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  meetupSubmitTxt: {
    fontSize: 15, fontWeight: "800", color: C.white, letterSpacing: 0.3,
  },

  // ── Success view ──
  successView: {
    paddingTop: 60, paddingHorizontal: 32, paddingBottom: 40,
    alignItems: "center", gap: 14,
  },
  successCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  successEmoji: { fontSize: 72, marginBottom: 4 },
  successHead: {
    fontFamily: SERIF, fontSize: 28, fontWeight: "700",
    color: C.ink, textAlign: "center", letterSpacing: -0.6,
  },
  successSub: {
    fontSize: 14, color: C.inkMid, textAlign: "center",
    lineHeight: 22, paddingHorizontal: 10,
  },
  successBtns: { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
  successOutline: {
    flex: 1, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.terra,
  },
  successOutlineTxt: { fontSize: 13, fontWeight: "800" },
  successFill: {
    flex: 1, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center",
  },
  successFillTxt: { fontSize: 13, fontWeight: "800", color: C.white },
});
