import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Image, TextInput, ScrollView,
  Pressable, Dimensions, Alert, ActivityIndicator, Platform, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import { useAuth } from "../../store/AuthContext";
import { useSnackbar } from "../../store/SnackbarContext";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenShell } from "./TabShared";
import { createMeetupWithImage } from "../../services/meetups/meetupService";

const { width, height: SCREEN_H } = Dimensions.get("window");
const API_BASE_URL = "http://192.168.31.65:5000/api";

// ─── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#F5F0EB",
  headerTop:    "#EAE0D5",
  surface:      "#FEFCFA",
  inputBg:      "#F2EDE6",
  terra:        "#C84B0C",
  terraDeep:    "#A83A08",
  terraLight:   "#FDF0EA",
  green:        "#1A6B4A",
  ink:          "#1C1410",
  inkMid:       "#5C4F47",
  inkMuted:     "#9C8D84",
  border:       "#E8E0D8",
  divider:      "#F0EAE3",
  white:        "#FFFFFF",
  amber:        "#B45309",
  amberLight:   "#FEF3C7",
  amberBorder:  "#FCD34D",
  catGeneral:   "#D4820A", catGeneralBg:  "#FEF7E8",
  catHousing:   "#3B6CA8", catHousingBg:  "#EEF3FC",
  catTravel:    "#1A7A5E", catTravelBg:   "#E8F5F1",
  catHangouts:  "#B83055", catHangoutsBg: "#FDEEF3",
  catHelp:      "#7040B8", catHelpBg:     "#F3EEFE",
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

const charCountColor = (len, max) => {
  if (len >= max * 0.9) return C.terra;
  if (len >= max * 0.7) return C.amber;
  return C.inkMuted;
};

const inputStyle = (focused) => focused
  ? { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.terra }
  : { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border };

const fmtDate = (d) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const fmtTime = (d) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

// ─── SECTION LABEL ─────────────────────────────────────────────────────────────
function SectionLabel({ label, first = false }) {
  return (
    <View style={[s.sectionWrap, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 20, marginTop: 8 }]}>
      <Text style={s.sectionText}>{label}</Text>
    </View>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PostTab({ navigation }) {
  const { token, user } = useAuth();
  const { showSnackbar }  = useSnackbar();
  const insets            = useSafeAreaInsets();

  // ── mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("Post");

  // ── post form ─────────────────────────────────────────────────────────────
  const [category, setCategory]       = useState("General");
  const [title, setTitle]             = useState("");
  const [details, setDetails]         = useState("");
  const [image, setImage]             = useState(null);
  const [titleFocused, setTF]         = useState(false);
  const [detailsFocused, setDF]       = useState(false);
  const [showPostSuccess, setPostOk]  = useState(false);

  // ── meetup form ───────────────────────────────────────────────────────────
  const [meetupTitle, setMT]              = useState("");
  const [meetupDetails, setMD]            = useState("");
  const [meetupMaxMembers, setMMM]        = useState(10);
  const [meetupHometown, setMH]           = useState("");
  const [meetupLocation, setML]           = useState("");
  const [meetupVenue, setMV]             = useState("");
  const [meetupDate, setMDate]            = useState(new Date());
  const [meetupTime, setMTime]            = useState(new Date());
  const [meetupImage, setMImg]            = useState(null);
  const [showDatePicker, setShowDate]     = useState(false);
  const [showTimePicker, setShowTime]     = useState(false);
  const [meetupSuccess, setMeetupOk]      = useState(false);
  const [mtFocused, setMTF]               = useState(false);
  const [mdFocused, setMDF]               = useState(false);
  const [venueFocused, setVF]             = useState(false);
  const [locationFocused, setLF]          = useState(false);
  const [hometownFocused, setHF]          = useState(false);

  // ── shared ────────────────────────────────────────────────────────────────
  const [isSubmitting, setSubmitting]     = useState(false);
  const [showProfileBanner, setProfileBanner] = useState(false);

  // ── animations ────────────────────────────────────────────────────────────
  const successFade  = useRef(new Animated.Value(0)).current;
  const stepperScale = useRef(new Animated.Value(1)).current;

  // auto-fill from profile
  useEffect(() => {
    if (user?.hometown  && !meetupHometown) setMH(user.hometown);
    if (user?.location  && !meetupLocation) setML(user.location.split(",")[0].trim());
  }, [user?._id]);

  // ── mode switch ───────────────────────────────────────────────────────────
  const handleModeSwitch = (next) => {
    if (mode === next) return;
    const dirty = mode === "Post" ? (title.trim() || details.trim()) : (meetupTitle.trim() || meetupDetails.trim());
    const doSwitch = () => {
      setMode(next);
      setProfileBanner(false);
      if (next === "Post") resetMeetup();
      else resetPost();
    };
    dirty
      ? Alert.alert(`Switch to ${next === "Post" ? "Share a Post" : "Plan a Meetup"}?`, "Your draft will be cleared.", [
          { text: "Cancel", style: "cancel" },
          { text: "Switch", style: "destructive", onPress: doSwitch },
        ])
      : doSwitch();
  };

  const resetPost = () => {
    setTitle(""); setDetails(""); setImage(null); setCategory("General"); setPostOk(false);
  };
  const resetMeetup = () => {
    setMT(""); setMD(""); setMMM(10);
    setMH(user?.hometown || "");
    setML(user?.location?.split(",")[0]?.trim() || "");
    setMV(""); setMDate(new Date()); setMTime(new Date()); setMImg(null); setMeetupOk(false);
  };

  // ── image picker ──────────────────────────────────────────────────────────
  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { showSnackbar("Please allow access to your photos.", "info"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        showSnackbar("Image too large. Please choose one under 2 MB.", "error"); return;
      }
      setter(asset);
    }
  };

  // ── profile check ─────────────────────────────────────────────────────────
  const isProfileComplete = !!(user?.hometownCountry && user?.country && user?.organization && user?.bio);

  const triggerProfileBanner = () => setProfileBanner(true);

  // ── stepper animation ────────────────────────────────────────────────────
  const bumpStepper = () => {
    Animated.sequence([
      Animated.timing(stepperScale, { toValue: 1.25, duration: 80, useNativeDriver: true }),
      Animated.spring(stepperScale, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  // ── fade in success ───────────────────────────────────────────────────────
  const fadeInSuccess = () => {
    successFade.setValue(0);
    Animated.timing(successFade, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  };

  // ── submit: post ──────────────────────────────────────────────────────────
  const handleSharePost = async () => {
    if (!title.trim() || !details.trim()) {
      showSnackbar("Please add a title and some details.", "info"); return;
    }
    if (!isProfileComplete) { triggerProfileBanner(); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("category", category);
      fd.append("title", title.trim());
      fd.append("details", details.trim());
      if (image) {
        const uri = image.uri;
        const fn  = uri.split("/").pop();
        const m   = /\.(\w+)$/.exec(fn);
        fd.append("postImage", { uri, name: fn, type: m ? `image/${m[1]}` : "image" });
      }
      await axios.post(`${API_BASE_URL}/posts`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      resetPost();
      setPostOk(true);
      fadeInSuccess();
    } catch (err) {
      showSnackbar(err.response?.data?.message || "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── submit: meetup ────────────────────────────────────────────────────────
  const handleCreateMeetup = async () => {
    if (!meetupTitle.trim() || !meetupDetails.trim()) {
      showSnackbar("Please add a title and description.", "info"); return;
    }
    if (meetupMaxMembers < 2) {
      showSnackbar("Max members must be at least 2.", "info"); return;
    }
    if (!meetupVenue.trim() || !meetupLocation.trim()) {
      showSnackbar("Please add a venue and location.", "info"); return;
    }
    if (!isProfileComplete) { triggerProfileBanner(); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", meetupTitle.trim());
      fd.append("details", meetupDetails.trim());
      fd.append("maxMembers", String(meetupMaxMembers));
      fd.append("hometown", meetupHometown.trim());
      fd.append("meetupLocation", meetupLocation.trim());
      fd.append("venue", meetupVenue.trim());
      fd.append("date", meetupDate.toISOString());
      fd.append("time", `${meetupTime.getHours().toString().padStart(2,"0")}:${meetupTime.getMinutes().toString().padStart(2,"0")}`);
      if (meetupImage) {
        const uri = meetupImage.uri;
        const fn  = uri.split("/").pop();
        const m   = /\.(\w+)$/.exec(fn);
        fd.append("meetupImage", { uri, name: fn, type: m ? `image/${m[1]}` : "image/jpeg" });
      }
      const res = await createMeetupWithImage(fd);
      if (!res.success) { showSnackbar(res.message || "Failed to create meetup.", "error"); return; }
      resetMeetup();
      setMeetupOk(true);
      fadeInSuccess();
    } catch (err) {
      showSnackbar("Something went wrong. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const activeCat     = CATEGORIES.find(c => c.name === category) || CATEGORIES[0];
  const HEADER_PT     = insets.top + 64 + 16; // AppTopHeader height + breathing room
  const userCity      = user?.location?.split(",")[0]?.trim();

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      navigation={navigation}
      routeName="Post"
      title={null}
      noPadding
      absoluteHeader
      noPaddingBottom
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[C.headerTop, C.bg]}
        style={[s.header, { paddingTop: HEADER_PT }]}
      >
        {/* User identity */}
        <View style={s.userRow}>
          <Image
            source={{ uri: user?.profileImageUri || "https://via.placeholder.com/150" }}
            style={s.headerAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.headerName} numberOfLines={1}>{user?.fullName || "You"}</Text>
            {userCity ? <Text style={s.headerCity}>{userCity}</Text> : null}
          </View>
        </View>

        {/* Mode switcher */}
        <View style={s.modeRow}>
          {[
            { key: "Post",   icon: "article", label: "Share a Post",  sub: "Thoughts, housing, travel..." },
            { key: "Meetup", icon: "event",   label: "Plan a Meetup", sub: "Organize a gathering"         },
          ].map((m) => (
            <Pressable
              key={m.key}
              style={[s.modeCard, mode === m.key && s.modeCardActive]}
              onPress={() => handleModeSwitch(m.key)}
            >
              <MaterialIcons name={m.icon} size={21} color={mode === m.key ? C.white : C.inkMid} />
              <View style={{ flex: 1 }}>
                <Text style={[s.modeLabel, mode === m.key && s.modeLabelActive]}>{m.label}</Text>
                <Text style={[s.modeSub, mode === m.key && s.modeSubActive]} numberOfLines={1}>{m.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* ── Form card ── */}
      <View style={s.formCard}>

        {/* ══ POST MODE ══ */}
        {mode === "Post" && (
          showPostSuccess ? (
            /* Post success */
            <Animated.View style={[s.successView, { opacity: successFade }]}>
              <View style={[s.successCircle, { backgroundColor: activeCat.color }]}>
                <MaterialIcons name="check" size={34} color={C.white} />
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
            /* Post form */
            <View style={s.form}>

              {/* Category grid */}
              <View style={s.group}>
                <Text style={s.label}>CHOOSE A CATEGORY</Text>
                <View style={s.catGrid}>
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.name;
                    return (
                      <Pressable
                        key={cat.name}
                        style={[
                          s.catBlock,
                          { backgroundColor: active ? cat.color : cat.bg, borderColor: active ? cat.color : C.border },
                        ]}
                        onPress={() => setCategory(cat.name)}
                      >
                        <MaterialIcons name={cat.icon} size={19} color={active ? C.white : cat.color} />
                        <Text style={[s.catBlockTxt, { color: active ? C.white : cat.color }]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Title */}
              <View style={s.group}>
                <View style={s.labelRow}>
                  <Text style={s.label}>WHAT'S IT ABOUT?</Text>
                  <Text style={[s.charCount, { color: charCountColor(title.length, 80) }]}>{title.length}/80</Text>
                </View>
                <TextInput
                  style={[s.input, s.titleInput, inputStyle(titleFocused)]}
                  placeholder="Looking for a travel partner to Jaipur..."
                  placeholderTextColor={C.inkMuted}
                  value={title}
                  onChangeText={(t) => setTitle(t.slice(0, 80))}
                  onFocus={() => setTF(true)}
                  onBlur={() => setTF(false)}
                  maxLength={80}
                />
              </View>

              {/* Details */}
              <View style={s.group}>
                <View style={s.labelRow}>
                  <Text style={s.label}>SHARE THE DETAILS</Text>
                  <Text style={[s.charCount, { color: charCountColor(details.length, 500) }]}>{details.length}/500</Text>
                </View>
                <TextInput
                  style={[s.input, s.textArea, inputStyle(detailsFocused)]}
                  placeholder="Share more context — what you're looking for, what makes this interesting..."
                  placeholderTextColor={C.inkMuted}
                  multiline
                  textAlignVertical="top"
                  value={details}
                  onChangeText={(t) => setDetails(t.slice(0, 500))}
                  onFocus={() => setDF(true)}
                  onBlur={() => setDF(false)}
                  maxLength={500}
                />
              </View>

              {/* Image upload */}
              <View style={s.group}>
                <Text style={s.label}>ADD AN IMAGE <Text style={s.optional}>(Optional)</Text></Text>
                <Pressable style={[s.uploadZone, image && s.uploadFilled]} onPress={() => pickImage(setImage)}>
                  {image ? (
                    <>
                      <Image source={{ uri: image.uri }} style={s.uploadPreview} />
                      <Pressable style={s.removeBtn} onPress={() => setImage(null)}>
                        <MaterialIcons name="close" size={17} color={C.white} />
                      </Pressable>
                    </>
                  ) : (
                    <View style={s.uploadEmpty}>
                      <View style={s.uploadIconBg}>
                        <MaterialIcons name="add-a-photo" size={24} color={C.terra} />
                      </View>
                      <Text style={s.uploadMain}>Tap to add a photo</Text>
                      <Text style={s.uploadSub}>JPG or PNG · Max 2 MB</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Profile banner */}
              {showProfileBanner && (
                <View style={s.profileBanner}>
                  <MaterialIcons name="warning-amber" size={15} color={C.amber} />
                  <Text style={s.profileBannerTxt}>Complete your profile to post.</Text>
                  <Pressable onPress={() => { setProfileBanner(false); navigation.navigate("Account"); }}>
                    <Text style={s.profileBannerLink}>Finish →</Text>
                  </Pressable>
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={[s.submitBtn, { backgroundColor: activeCat.color }, isSubmitting && { opacity: 0.72 }]}
                onPress={handleSharePost}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={s.submitBtnTxt}>Share Post</Text>
                }
              </Pressable>
              <View style={{ height: 130 }} />
            </View>
          )
        )}

        {/* ══ MEETUP MODE ══ */}
        {mode === "Meetup" && (
          meetupSuccess ? (
            /* Meetup success */
            <Animated.View style={[s.successView, { opacity: successFade }]}>
              <Text style={s.successEmoji}>🎉</Text>
              <Text style={s.successHead}>Meetup created.</Text>
              <Text style={s.successSub}>Others can now discover and join it. You've been added to the group chat.</Text>
              <View style={s.successBtns}>
                <Pressable
                  style={s.successOutline}
                  onPress={() => { setMeetupOk(false); navigation.navigate("Home"); }}
                >
                  <Text style={[s.successOutlineTxt, { color: C.terra }]}>See Meetups</Text>
                </Pressable>
                <Pressable
                  style={[s.successFill, { backgroundColor: C.terra }]}
                  onPress={() => { successFade.setValue(0); setMeetupOk(false); }}
                >
                  <Text style={s.successFillTxt}>Create another</Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            /* Meetup form */
            <View style={s.form}>

              {/* Cover image */}
              <View style={s.group}>
                <Text style={s.label}>COVER IMAGE <Text style={s.optional}>(Optional)</Text></Text>
                <Pressable
                  style={[s.uploadZone, s.coverZone, meetupImage && s.uploadFilled]}
                  onPress={() => pickImage(setMImg)}
                >
                  {meetupImage ? (
                    <>
                      <Image source={{ uri: meetupImage.uri }} style={s.uploadPreview} />
                      <Pressable style={s.removeBtn} onPress={() => setMImg(null)}>
                        <MaterialIcons name="close" size={17} color={C.white} />
                      </Pressable>
                    </>
                  ) : (
                    <View style={s.uploadEmpty}>
                      <View style={s.uploadIconBg}>
                        <MaterialIcons name="add-a-photo" size={28} color={C.terra} />
                      </View>
                      <Text style={s.uploadMain}>Add a cover photo</Text>
                      <Text style={s.uploadSub}>A great photo makes people want to join</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* ── THE GATHERING ── */}
              <SectionLabel label="THE GATHERING" first />

              <View style={s.group}>
                <View style={s.labelRow}>
                  <Text style={s.label}>TITLE</Text>
                  <Text style={[s.charCount, { color: charCountColor(meetupTitle.length, 80) }]}>{meetupTitle.length}/80</Text>
                </View>
                <TextInput
                  style={[s.input, s.titleInput, inputStyle(mtFocused)]}
                  placeholder="Weekend chai and catch-up..."
                  placeholderTextColor={C.inkMuted}
                  value={meetupTitle}
                  onChangeText={(t) => setMT(t.slice(0, 80))}
                  onFocus={() => setMTF(true)}
                  onBlur={() => setMTF(false)}
                  maxLength={80}
                />
              </View>

              <View style={s.group}>
                <View style={s.labelRow}>
                  <Text style={s.label}>DESCRIPTION</Text>
                  <Text style={[s.charCount, { color: charCountColor(meetupDetails.length, 400) }]}>{meetupDetails.length}/400</Text>
                </View>
                <TextInput
                  style={[s.input, s.textArea, inputStyle(mdFocused)]}
                  placeholder="What's this meetup about? Who should come?"
                  placeholderTextColor={C.inkMuted}
                  multiline
                  textAlignVertical="top"
                  value={meetupDetails}
                  onChangeText={(t) => setMD(t.slice(0, 400))}
                  onFocus={() => setMDF(true)}
                  onBlur={() => setMDF(false)}
                  maxLength={400}
                />
              </View>

              {/* ── WHEN & WHO ── */}
              <SectionLabel label="WHEN & WHO" />

              {/* Date + Time row */}
              <View style={s.group}>
                <Text style={s.label}>DATE & TIME</Text>
                <View style={s.rowGap}>
                  <Pressable style={s.dateBtn} onPress={() => setShowDate(true)}>
                    <View style={s.dateTile}>
                      <Text style={s.dateTileNum}>{meetupDate.getDate()}</Text>
                      <Text style={s.dateTileMon}>
                        {meetupDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dateBtnSub}>DATE</Text>
                      <Text style={s.dateBtnVal}>{fmtDate(meetupDate)}</Text>
                    </View>
                    <MaterialIcons name="expand-more" size={18} color={C.inkMuted} />
                  </Pressable>

                  <Pressable style={s.dateBtn} onPress={() => setShowTime(true)}>
                    <View style={[s.dateTile, { backgroundColor: C.catHousingBg }]}>
                      <MaterialIcons name="schedule" size={20} color={C.catHousing} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dateBtnSub}>TIME</Text>
                      <Text style={s.dateBtnVal}>{fmtTime(meetupTime)}</Text>
                    </View>
                    <MaterialIcons name="expand-more" size={18} color={C.inkMuted} />
                  </Pressable>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={meetupDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(e, d) => { setShowDate(Platform.OS === "ios"); if (d) setMDate(d); }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={meetupTime}
                  mode="time"
                  onChange={(e, d) => { setShowTime(Platform.OS === "ios"); if (d) setMTime(d); }}
                />
              )}

              {/* Stepper */}
              <View style={s.group}>
                <Text style={s.label}>MAX MEMBERS</Text>
                <View style={s.stepperRow}>
                  <Pressable
                    style={[s.stepperBtnOuter, meetupMaxMembers <= 2 && s.stepperDisabled]}
                    onPress={() => { if (meetupMaxMembers > 2) { setMMM(p => p - 1); bumpStepper(); } }}
                    disabled={meetupMaxMembers <= 2}
                  >
                    <MaterialIcons name="remove" size={20} color={meetupMaxMembers <= 2 ? C.inkMuted : C.terra} />
                  </Pressable>
                  <Animated.Text style={[s.stepperVal, { transform: [{ scale: stepperScale }] }]}>
                    {meetupMaxMembers}
                  </Animated.Text>
                  <Pressable
                    style={[s.stepperBtnFill, meetupMaxMembers >= 50 && s.stepperDisabled]}
                    onPress={() => { if (meetupMaxMembers < 50) { setMMM(p => p + 1); bumpStepper(); } }}
                    disabled={meetupMaxMembers >= 50}
                  >
                    <MaterialIcons name="add" size={20} color={meetupMaxMembers >= 50 ? C.inkMuted : C.white} />
                  </Pressable>
                  <Text style={s.stepperNote}>people · min 2, max 50</Text>
                </View>
              </View>

              {/* Hometown */}
              <View style={s.group}>
                <Text style={s.label}>TARGET HOMETOWN</Text>
                <View style={[s.prefixWrap, inputStyle(hometownFocused)]}>
                  <MaterialIcons name="home" size={16} color={C.inkMuted} style={{ flexShrink: 0 }} />
                  <TextInput
                    style={s.prefixInput}
                    placeholder="Patna, Lucknow, Indore..."
                    placeholderTextColor={C.inkMuted}
                    value={meetupHometown}
                    onChangeText={setMH}
                    onFocus={() => setHF(true)}
                    onBlur={() => setHF(false)}
                  />
                </View>
                {user?.hometown ? <Text style={s.prefillNote}>Pre-filled from your profile</Text> : null}
              </View>

              {/* ── WHERE ── */}
              <SectionLabel label="WHERE" />

              <View style={s.group}>
                <Text style={s.label}>VENUE NAME</Text>
                <View style={[s.prefixWrap, inputStyle(venueFocused)]}>
                  <MaterialIcons name="location-on" size={16} color={C.inkMuted} style={{ flexShrink: 0 }} />
                  <TextInput
                    style={s.prefixInput}
                    placeholder="Chai Bar, Central Park, someone's place..."
                    placeholderTextColor={C.inkMuted}
                    value={meetupVenue}
                    onChangeText={setMV}
                    onFocus={() => setVF(true)}
                    onBlur={() => setVF(false)}
                  />
                </View>
              </View>

              <View style={s.group}>
                <Text style={s.label}>CITY / LOCATION</Text>
                <View style={[s.prefixWrap, inputStyle(locationFocused)]}>
                  <MaterialIcons name="place" size={16} color={C.inkMuted} style={{ flexShrink: 0 }} />
                  <TextInput
                    style={s.prefixInput}
                    placeholder="Bengaluru, Koramangala..."
                    placeholderTextColor={C.inkMuted}
                    value={meetupLocation}
                    onChangeText={setML}
                    onFocus={() => setLF(true)}
                    onBlur={() => setLF(false)}
                  />
                </View>
                {user?.location ? <Text style={s.prefillNote}>Pre-filled from your profile</Text> : null}
              </View>

              {/* Profile banner */}
              {showProfileBanner && (
                <View style={s.profileBanner}>
                  <MaterialIcons name="warning-amber" size={15} color={C.amber} />
                  <Text style={s.profileBannerTxt}>Complete your profile to post.</Text>
                  <Pressable onPress={() => { setProfileBanner(false); navigation.navigate("Account"); }}>
                    <Text style={s.profileBannerLink}>Finish →</Text>
                  </Pressable>
                </View>
              )}

              {/* Submit */}
              <Pressable
                style={[s.submitBtn, { backgroundColor: C.terra }, isSubmitting && { opacity: 0.72 }]}
                onPress={handleCreateMeetup}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={s.submitBtnTxt}>Create Meetup</Text>
                }
              </Pressable>
              <View style={{ height: 130 }} />
            </View>
          )
        )}
      </View>
    </ScreenShell>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.border, flexShrink: 0,
  },
  headerName: { fontSize: 14, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  headerCity:  { fontSize: 11, fontWeight: "400", color: C.inkMuted, marginTop: 1 },

  // ── Mode switcher ──
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: C.border,
  },
  modeCardActive:  { backgroundColor: C.terra, borderColor: C.terra },
  modeLabel:       { fontSize: 12, fontWeight: "800", color: C.inkMid, letterSpacing: -0.1 },
  modeLabelActive: { color: C.white },
  modeSub:         { fontSize: 9,  fontWeight: "500", color: C.inkMuted, marginTop: 1 },
  modeSubActive:   { color: "rgba(255,255,255,0.72)" },

  // ── Form card ──
  formCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    minHeight: SCREEN_H,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 8,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 20,
  },

  // ── Form primitives ──
  group:    { gap: 8 },
  rowGap:   { flexDirection: "row", gap: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:    { fontSize: 10, fontWeight: "900", color: C.inkMuted, letterSpacing: 1.4 },
  optional: { fontWeight: "600", letterSpacing: 0.5 },
  charCount:{ fontSize: 11, fontWeight: "600" },

  // ── Section label ──
  sectionWrap: { marginBottom: 4 },
  sectionText: { fontSize: 10, fontWeight: "900", color: C.inkMuted, letterSpacing: 1.5 },

  // ── Text inputs ──
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.ink,
    fontWeight: "500",
  },
  titleInput: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: "700",
    minHeight: 52,
  },
  textArea: {
    minHeight: 110,
    lineHeight: 22,
    paddingTop: 14,
    textAlignVertical: "top",
  },

  // ── Prefix inputs (icon + text) ──
  prefixWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  prefixInput: {
    flex: 1, fontSize: 14, fontWeight: "500", color: C.ink, padding: 0,
  },
  prefillNote: {
    fontSize: 10, color: C.inkMuted, fontWeight: "500", paddingLeft: 2, marginTop: 2,
  },

  // ── Category grid ──
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBlock: {
    width: (width - 48) / 2,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  catBlockTxt: { fontSize: 11, fontWeight: "700", flex: 1, lineHeight: 14 },

  // ── Upload zone ──
  uploadZone: {
    borderWidth: 1.5, borderStyle: "dashed", borderColor: C.border,
    borderRadius: 16, height: 112, overflow: "hidden",
    alignItems: "center", justifyContent: "center",
  },
  coverZone: { height: 164 },
  uploadFilled: { borderStyle: "solid" },
  uploadEmpty: { alignItems: "center", gap: 8, paddingHorizontal: 20 },
  uploadIconBg: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.terraLight,
    alignItems: "center", justifyContent: "center",
  },
  uploadMain: { fontSize: 13, fontWeight: "700", color: C.inkMid, textAlign: "center" },
  uploadSub:  { fontSize: 11, fontWeight: "500", color: C.inkMuted, textAlign: "center" },
  uploadPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  removeBtn: {
    position: "absolute", top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },

  // ── Date/time buttons ──
  dateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.inputBg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  dateTile: {
    width: 42, height: 42, borderRadius: 8,
    backgroundColor: C.terraLight,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dateTileNum: { fontSize: 15, fontWeight: "900", color: C.terra, lineHeight: 17 },
  dateTileMon: { fontSize: 7, fontWeight: "800", color: C.terra, letterSpacing: 0.8 },
  dateBtnSub: { fontSize: 8, fontWeight: "900", color: C.inkMuted, letterSpacing: 1.2 },
  dateBtnVal: { fontSize: 12, fontWeight: "700", color: C.ink, marginTop: 2 },

  // ── Stepper ──
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepperBtnOuter: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: C.terra,
  },
  stepperBtnFill: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.terra,
  },
  stepperDisabled: { borderColor: C.border, backgroundColor: C.border, opacity: 0.45 },
  stepperVal:  { fontSize: 26, fontWeight: "900", color: C.ink, minWidth: 38, textAlign: "center" },
  stepperNote: { flex: 1, fontSize: 11, color: C.inkMuted, fontWeight: "500" },

  // ── Profile banner ──
  profileBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.amberLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.amberBorder,
  },
  profileBannerTxt:  { flex: 1, fontSize: 12, fontWeight: "600", color: C.amber },
  profileBannerLink: { fontSize: 12, fontWeight: "800", color: C.amber },

  // ── Submit button ──
  submitBtn: {
    height: 54, borderRadius: 27,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.terra, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
  },
  submitBtnTxt: {
    fontSize: 14, fontWeight: "900", color: C.white,
    letterSpacing: 0.8, textTransform: "uppercase",
  },

  // ── Success view ──
  successView: {
    paddingTop: 56, paddingHorizontal: 28,
    paddingBottom: 32, alignItems: "center", gap: 14,
  },
  successCircle: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  successEmoji: { fontSize: 68, marginBottom: 4 },
  successHead: {
    fontFamily: SERIF, fontSize: 28, fontWeight: "700",
    color: C.ink, textAlign: "center", letterSpacing: -0.6,
  },
  successSub: {
    fontSize: 14, color: C.inkMid, textAlign: "center",
    lineHeight: 22, paddingHorizontal: 12,
  },
  successBtns: { flexDirection: "row", gap: 12, marginTop: 10, width: "100%" },
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
