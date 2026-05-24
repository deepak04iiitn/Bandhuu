import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert, Animated, Image, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, UIManager, View, Platform,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { GetCity, GetCountries, GetState } from "react-country-state-city";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../store/AuthContext";
import { ScreenShell } from "./TabShared";
import { getMyActivitySummary } from "../../services/users/userService";
import { useSnackbar } from "../../store/SnackbarContext";

// ─── TOKENS ────────────────────────────────────────────────────────────────────
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
  coral:       "#C05A5A",
  coralBg:     "#FAEAEA",
  amber:       "#B45309",
  amberLight:  "#FEF3C7",
  catHousing:  "#3B6CA8", catHousingBg:  "#EEF3FC",
  catTravel:   "#1A7A5E", catTravelBg:   "#E8F5F1",
  catHangouts: "#B83055", catHangoutsBg: "#FDEEF3",
  catHelp:     "#7040B8", catHelpBg:     "#F3EEFE",
  catGeneral:  "#D4820A", catGeneralBg:  "#FEF7E8",
};

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

const REQUIRED_FIELDS = [
  "fullName", "email", "gender", "bio",
  "organization", "studyOrPost",
  "hometownCountry", "hometownCity",
  "country", "city",
];

const FIELD_LABELS = {
  fullName:       "Full name",       email:          "Email",
  gender:         "Gender",          bio:            "Bio",
  organization:   "Organization",    studyOrPost:    "Role / Course",
  hometownCountry:"Hometown country",hometownCity:   "Hometown city",
  country:        "Current country", city:           "Current city",
};

const OTHER = { id: -1, name: "Other", isOther: true };

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental)
  UIManager.setLayoutAnimationEnabledExperimental(true);

// ─── PROGRESS RING ─────────────────────────────────────────────────────────────
function ProgressRing({ percent, size = 52, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (percent / 100) * circ;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={C.border} strokeWidth={stroke} fill="transparent" />
        <Circle
          cx={size/2} cy={size/2} r={r}
          stroke={C.terra} strokeWidth={stroke} fill="transparent"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dash}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 11, fontWeight: "900", color: C.terra }}>{percent}%</Text>
      </View>
    </View>
  );
}

// ─── NAV ROW ───────────────────────────────────────────────────────────────────
function NavRow({ iconName, iconColor, iconBg, label, preview, onPress, isLast, danger }) {
  return (
    <Pressable
      style={({ pressed }) => [
        s.navRow,
        !isLast && s.navRowBorder,
        pressed && { backgroundColor: danger ? "#FDF5F5" : C.inputBg },
      ]}
      onPress={onPress}
    >
      <View style={[s.navIconWrap, { backgroundColor: iconBg }]}>
        <MaterialIcons name={iconName} size={17} color={iconColor} />
      </View>
      <View style={s.navContent}>
        <Text style={[s.navLabel, danger && { color: C.coral }]}>{label}</Text>
        {preview ? (
          <Text style={[s.navPreview, danger && { color: C.coral + "99" }]} numberOfLines={1}>
            {preview}
          </Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={18} color={danger ? C.coral : C.inkMuted} />
    </Pressable>
  );
}

// ─── GROUP LABEL ──────────────────────────────────────────────────────────────
function GroupLabel({ text }) {
  return <Text style={s.groupLabel}>{text}</Text>;
}

// ─── SHEET (bottom sheet modal) ───────────────────────────────────────────────
function Sheet({ visible, title, subtitle, onClose, children }) {
  const anim = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={s.sheetOuter}>
        <View style={s.sheetInner}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={s.sheetSub}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={s.sheetCloseBtn} hitSlop={8}>
              <MaterialIcons name="close" size={17} color={C.inkMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={C.inkMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[s.fieldInput, focused && s.fieldInputFocused, props.style]}
      />
    </View>
  );
}

// ─── SELECT FIELD ─────────────────────────────────────────────────────────────
function SelectField({ label, value, placeholder, onPress, disabled }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          s.fieldInput, s.fieldSelect,
          disabled && { opacity: 0.4 },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={[s.fieldSelectTxt, !value && { color: C.inkMuted }]}>{value || placeholder}</Text>
        <MaterialIcons name="expand-more" size={18} color={C.inkMuted} />
      </Pressable>
    </View>
  );
}

// ─── PICKER MODAL ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.pickerOverlay}>
        <View style={s.pickerBox}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={s.sheetCloseBtn} hitSlop={8}>
              <MaterialIcons name="close" size={17} color={C.inkMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((item, i) => (
              <Pressable
                key={`${item.id}-${i}`}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [s.pickRow, pressed && { backgroundColor: C.terraLight }]}
              >
                {item.isOther
                  ? <View style={s.otherBadge}><Text style={s.otherBadgeTxt}>Other / Not Listed</Text></View>
                  : <Text style={s.pickTxt}>{item.name}</Text>
                }
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── TOGGLE ROW ───────────────────────────────────────────────────────────────
function ToggleRow({ options, value, onChange }) {
  return (
    <View style={s.toggleRow}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[s.toggleBtn, active && s.toggleBtnActive]}
          >
            {opt.icon ? <MaterialIcons name={opt.icon} size={14} color={active ? C.white : C.inkMuted} /> : null}
            <Text style={[s.toggleBtnTxt, active && s.toggleBtnTxtActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── SECTION DIVIDER (inside sheet) ──────────────────────────────────────────
function SheetDivider({ label }) {
  return (
    <View style={s.sheetDivRow}>
      <View style={s.sheetDivLine} />
      <Text style={s.sheetDivTxt}>{label}</Text>
      <View style={s.sheetDivLine} />
    </View>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AccountTab({ navigation }) {
  const { user, logout, updateProfile, updateProfileImage, deleteAccount } = useAuth();
  const { showSnackbar } = useSnackbar();

  // ── sheet state ───────────────────────────────────────────────────────────
  const [editSheet, setEditSheet] = useState(null); // "personal" | "work" | "location" | null
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState("country");

  // ── location cascade state ────────────────────────────────────────────────
  const [countries, setCountries]   = useState([]);
  const [states, setStates]         = useState([]);
  const [cities, setCities]         = useState([]);
  const [countryId, setCountryId]   = useState(null);
  const [stateId, setStateId]       = useState(null);
  const [countryOther, setCountryOther] = useState(false);
  const [stateOther, setStateOther]     = useState(false);
  const [cityOther, setCityOther]       = useState(false);

  const [hStates, setHStates]   = useState([]);
  const [hCities, setHCities]   = useState([]);
  const [hCountryId, setHCountryId] = useState(null);
  const [hStateId, setHStateId]     = useState(null);
  const [hCountryOther, setHCountryOther] = useState(false);
  const [hStateOther, setHStateOther]     = useState(false);
  const [hCityOther, setHCityOther]       = useState(false);

  // ── edit + delete state ───────────────────────────────────────────────────
  const [busy, setBusy]       = useState("");
  const [edit, setEdit]       = useState({
    fullName: "", email: "", occupationType: "student", gender: "Other",
    hometownCountry: "", hometownState: "", hometownCity: "",
    organization: "", studyOrPost: "",
    country: "", state: "", city: "", bio: "",
  });
  const [deletePwd, setDeletePwd] = useState("");
  const [deletePwdVisible, setDeletePwdVisible] = useState(false);

  const [activitySummary, setActivitySummary] = useState({ connections: 0, posts: 0, savedPosts: 0 });

  // ── load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    GetCountries().then(d => setCountries(Array.isArray(d) ? d : [])).catch(() => setCountries([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getMyActivitySummary().then(r => {
        if (mounted && r.success) setActivitySummary({ connections: r.connections || 0, posts: r.posts || 0, savedPosts: r.savedPosts || 0 });
      });
      return () => { mounted = false; };
    }, [])
  );

  // ── derived ───────────────────────────────────────────────────────────────
  const initials = useMemo(
    () => (user?.fullName || user?.username || "B").split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase(),
    [user]
  );

  const isProfileComplete = !!(user?.hometownCountry && user?.country && user?.organization && user?.bio);
  const completedCount    = REQUIRED_FIELDS.filter(k => !!user?.[k]?.trim()).length;
  const completionPct     = Math.round((completedCount / REQUIRED_FIELDS.length) * 100);
  const missingFields     = REQUIRED_FIELDS.filter(k => !user?.[k]?.trim());

  const hometown   = user?.hometownCity || "";
  const currentCity = user?.city || user?.location?.split(",")[0]?.trim() || "";
  const occupationDetail = user?.studyOrPost && user?.organization
    ? `${user.studyOrPost} at ${user.organization}`
    : user?.studyOrPost || user?.organization || null;

  const occupationPreview = occupationDetail || (user?.occupationType === "student" ? "Student" : "Working Professional");
  const locationPreview   = hometown && currentCity ? `${hometown} → ${currentCity}` : hometown || currentCity || "Not set";

  // ── picker ────────────────────────────────────────────────────────────────
  const pickerOptions =
    pickerType === "country" || pickerType === "hcountry" ? [...countries, OTHER]
    : pickerType === "state"  ? (countryOther  || !countryId  ? [OTHER] : [...states,  OTHER])
    : pickerType === "city"   ? (stateOther    || countryOther  || !stateId  ? [OTHER] : [...cities, OTHER])
    : pickerType === "hstate" ? (hCountryOther || !hCountryId ? [OTHER] : [...hStates, OTHER])
    : (hStateOther || hCountryOther || !hStateId ? [OTHER] : [...hCities, OTHER]);

  const pickerTitle =
    pickerType === "country" || pickerType === "hcountry" ? "Select Country"
    : pickerType === "state"  || pickerType === "hstate"  ? "Select State / Province"
    : "Select City";

  // ── open edit sheet ───────────────────────────────────────────────────────
  const openEditSheet = async (type) => {
    setEdit({
      fullName:       user?.fullName       || "",
      email:          user?.email          || "",
      bio:            user?.bio            || "",
      gender:         user?.gender         || "Other",
      occupationType: user?.occupationType || "student",
      organization:   user?.organization   || "",
      studyOrPost:    user?.studyOrPost    || "",
      hometownCountry:user?.hometownCountry|| "",
      hometownState:  user?.hometownState  || "",
      hometownCity:   user?.hometownCity   || "",
      country:        user?.country        || "",
      state:          user?.state          || "",
      city:           user?.city           || "",
    });

    // Pre-load location cascade for the location sheet
    if (type === "location") {
      setCountryId(null); setStateId(null);
      setCountryOther(false); setStateOther(false); setCityOther(false);
      setHCountryId(null); setHStateId(null);
      setHCountryOther(false); setHStateOther(false); setHCityOther(false);

      const mc = countries.find(c => c.name === user?.country);
      if (mc?.id) {
        setCountryId(mc.id);
        try {
          const ns = await GetState(mc.id); setStates(Array.isArray(ns) ? ns : []);
          const ms = ns?.find(s => s.name === user?.state);
          if (ms?.id) { setStateId(ms.id); const nc = await GetCity(mc.id, ms.id); setCities(Array.isArray(nc) ? nc : []); }
        } catch { setStates([]); setCities([]); }
      } else if (user?.country) { setCountryOther(true); if (user?.state) setStateOther(true); if (user?.city) setCityOther(true); }

      const mhc = countries.find(c => c.name === user?.hometownCountry);
      if (mhc?.id) {
        setHCountryId(mhc.id);
        try {
          const hns = await GetState(mhc.id); setHStates(Array.isArray(hns) ? hns : []);
          const mhs = hns?.find(s => s.name === user?.hometownState);
          if (mhs?.id) { setHStateId(mhs.id); const hnc = await GetCity(mhc.id, mhs.id); setHCities(Array.isArray(hnc) ? hnc : []); }
        } catch { setHStates([]); setHCities([]); }
      } else if (user?.hometownCountry) { setHCountryOther(true); if (user?.hometownState) setHStateOther(true); if (user?.hometownCity) setHCityOther(true); }
    }

    setEditSheet(type);
  };

  const openPicker = async (type) => {
    setPickerType(type);
    setPickerOpen(true);
    if (type === "state"  && countryId  && !countryOther)               setStates(await GetState(countryId));
    if (type === "city"   && countryId  && stateId  && !countryOther && !stateOther) setCities(await GetCity(countryId, stateId));
    if (type === "hstate" && hCountryId && !hCountryOther)              setHStates(await GetState(hCountryId));
    if (type === "hcity"  && hCountryId && hStateId && !hCountryOther && !hStateOther) setHCities(await GetCity(hCountryId, hStateId));
  };

  const onPick = (item) => {
    setPickerOpen(false);
    if (pickerType === "country") {
      setCountryId(item.isOther ? null : item.id); setStateId(null);
      setCountryOther(!!item.isOther); setStateOther(false); setCityOther(false);
      setStates([]); setCities([]);
      setEdit(p => ({ ...p, country: item.isOther ? "" : item.name, state: "", city: "" })); return;
    }
    if (pickerType === "state") {
      setStateId(item.isOther ? null : item.id); setStateOther(!!item.isOther); setCityOther(false); setCities([]);
      setEdit(p => ({ ...p, state: item.isOther ? "" : item.name, city: "" })); return;
    }
    if (pickerType === "city") {
      setCityOther(!!item.isOther);
      setEdit(p => ({ ...p, city: item.isOther ? "" : item.name })); return;
    }
    if (pickerType === "hcountry") {
      setHCountryId(item.isOther ? null : item.id); setHStateId(null);
      setHCountryOther(!!item.isOther); setHStateOther(false); setHCityOther(false);
      setHStates([]); setHCities([]);
      setEdit(p => ({ ...p, hometownCountry: item.isOther ? "" : item.name, hometownState: "", hometownCity: "" })); return;
    }
    if (pickerType === "hstate") {
      setHStateId(item.isOther ? null : item.id); setHStateOther(!!item.isOther); setHCityOther(false); setHCities([]);
      setEdit(p => ({ ...p, hometownState: item.isOther ? "" : item.name, hometownCity: "" })); return;
    }
    if (pickerType === "hcity") {
      setHCityOther(!!item.isOther);
      setEdit(p => ({ ...p, hometownCity: item.isOther ? "" : item.name })); return;
    }
  };

  // ── save profile ──────────────────────────────────────────────────────────
  const saveSheet = async () => {
    if (!edit.fullName.trim())  return showSnackbar("Full name is required.", "info");
    if (!edit.email.trim())     return showSnackbar("Email is required.", "info");
    setBusy("save");
    const res = await updateProfile({
      fullName:       edit.fullName.trim(),
      email:          edit.email.trim(),
      bio:            edit.bio.trim(),
      gender:         edit.gender,
      occupationType: edit.occupationType,
      organization:   edit.organization.trim(),
      studyOrPost:    edit.studyOrPost.trim(),
      hometownCountry:edit.hometownCountry.trim(),
      hometownState:  edit.hometownState.trim(),
      hometownCity:   edit.hometownCity.trim(),
      country:        edit.country.trim(),
      state:          edit.state.trim(),
      city:           edit.city.trim(),
    });
    setBusy("");
    if (!res.success) return showSnackbar(res.message || "Update failed.", "error");
    setEditSheet(null);
    showSnackbar("Profile updated.", "success");
  };

  // ── photo picker ──────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return showSnackbar("Allow photo access to update your picture.", "info");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const res = await updateProfileImage(result.assets[0]);
    if (!res.success) return showSnackbar(res.message || "Photo update failed.", "error");
    showSnackbar("Profile photo updated.", "success");
  };

  // ── delete account ────────────────────────────────────────────────────────
  const removeAccount = async () => {
    if (!deletePwd) return showSnackbar("Enter your password to continue.", "info");
    setBusy("delete");
    const res = await deleteAccount(deletePwd);
    setBusy("");
    if (!res.success) return showSnackbar(res.message || "Delete failed.", "error");
    setDeleteOpen(false); setDeletePwd(""); setDeletePwdVisible(false);
    showSnackbar(res.permanentDeletionAt
      ? `Account deletion scheduled for ${new Date(res.permanentDeletionAt).toLocaleDateString()}.`
      : "Your account is scheduled for deletion.", "success", 3600);
  };

  const handleSignOut = () =>
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);

  // ── nav helpers ───────────────────────────────────────────────────────────
  const navActivity = (type, title, count) =>
    navigation.navigate("ActivityDetail", { type, title, count });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      navigation={navigation}
      routeName="Account"
      noPadding
      background={C.bg}
      contentContainerStyle={s.screenContent}
    >
      {/* ── Profile Header ── */}
      <View style={s.header}>
        <View style={s.headerRow}>
          {/* Avatar */}
          <Pressable onPress={pickPhoto} style={s.avatarWrap}>
            <View style={s.avatarRing}>
              {user?.profileImageUri
                ? <Image source={{ uri: user.profileImageUri }} style={s.avatarImg} />
                : <View style={[s.avatarFallback]}>
                    <Text style={s.avatarInitials}>{initials}</Text>
                  </View>
              }
            </View>
            <View style={s.cameraBtn}>
              <MaterialIcons name="photo-camera" size={12} color={C.white} />
            </View>
          </Pressable>

          {/* Name + identity */}
          <View style={{ flex: 1 }}>
            <Text style={s.profileName} numberOfLines={1}>
              {user?.fullName || "Bandhuu Member"}
            </Text>
            <Text style={s.profileHandle}>@{user?.username || "username"}</Text>

            {(hometown || currentCity) ? (
              <View style={s.journeyRow}>
                {hometown ? <><View style={s.journeyDot} /><Text style={s.journeyFrom}>{hometown}</Text></> : null}
                {hometown && currentCity ? <MaterialIcons name="east" size={11} color={C.inkMuted} /> : null}
                {currentCity ? <Text style={s.journeyTo}>{currentCity}</Text> : null}
              </View>
            ) : null}

            {occupationDetail ? (
              <View style={s.occChip}>
                <MaterialIcons name={user?.occupationType === "student" ? "school" : "work-outline"} size={10} color={C.catHousing} />
                <Text style={s.occChipTxt} numberOfLines={1}>{occupationDetail}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Bio */}
        {user?.bio ? <Text style={s.bio} numberOfLines={2}>{user.bio}</Text> : null}

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [s.editBtn, !isProfileComplete && s.editBtnFill, pressed && { opacity: 0.8 }]}
          onPress={() => openEditSheet("personal")}
        >
          <Text style={[s.editBtnTxt, !isProfileComplete && { color: C.white }]}>
            {isProfileComplete ? "Edit Profile" : "Complete Profile"}
          </Text>
          <MaterialIcons name="arrow-forward" size={14} color={isProfileComplete ? C.terra : C.white} />
        </Pressable>
      </View>

      {/* ── Stats bar ── */}
      <View style={s.statsBar}>
        {[
          { label: "Connections", count: activitySummary.connections, type: "connections", title: "Connections" },
          { label: "Posts",       count: activitySummary.posts,       type: "posts",       title: "Posts"       },
          { label: "Saved",       count: activitySummary.savedPosts,  type: "saved",       title: "Saved Posts" },
        ].map((stat, i) => (
          <React.Fragment key={stat.type}>
            {i > 0 && <View style={s.statDiv} />}
            <Pressable
              style={({ pressed }) => [s.statCol, pressed && { backgroundColor: C.terraLight }]}
              onPress={() => navActivity(stat.type, stat.title, stat.count)}
            >
              <Text style={s.statNum}>{stat.count}</Text>
              <Text style={s.statLbl}>{stat.label}</Text>
              <Text style={s.statArrow}>›</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>

      {/* ── Profile completeness card ── */}
      {!isProfileComplete && (
        <Pressable style={s.completenessCard} onPress={() => openEditSheet("personal")}>
          <ProgressRing percent={completionPct} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.completenessTitle}>
              Your profile is <Text style={{ color: C.terra }}>{completionPct}% complete</Text>
            </Text>
            <Text style={s.completenessMissing} numberOfLines={2}>
              Missing: {missingFields.slice(0, 3).map(k => FIELD_LABELS[k]).join(", ")}
              {missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ""}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={C.terra} />
        </Pressable>
      )}

      {/* ── My Profile ── */}
      <GroupLabel text="MY PROFILE" />
      <View style={s.navCard}>
        <NavRow
          iconName="person-outline" iconColor={C.catHousing} iconBg={C.catHousingBg}
          label="Personal Info"
          preview={[user?.fullName, user?.email].filter(Boolean).join(" · ") || "Tap to edit"}
          onPress={() => openEditSheet("personal")}
        />
        <NavRow
          iconName={user?.occupationType === "student" ? "school" : "work-outline"}
          iconColor={C.catTravel} iconBg={C.catTravelBg}
          label="Work & Education"
          preview={occupationPreview}
          onPress={() => openEditSheet("work")}
        />
        <NavRow
          iconName="location-on" iconColor={C.catHangouts} iconBg={C.catHangoutsBg}
          label="Location"
          preview={locationPreview}
          onPress={() => openEditSheet("location")}
          isLast
        />
      </View>

      {/* ── App & Support ── */}
      <GroupLabel text="APP & SUPPORT" />
      <View style={s.navCard}>
        <NavRow
          iconName="notifications-none" iconColor={C.catHelp} iconBg={C.catHelpBg}
          label="Notifications" preview="Manage your alerts"
          onPress={() => showSnackbar("Notification settings coming soon.", "info")}
        />
        <NavRow
          iconName="help-outline" iconColor={C.catGeneral} iconBg={C.catGeneralBg}
          label="Help & Support" preview="Get in touch with us"
          onPress={() => showSnackbar("help@bandhuu.app", "info")}
        />
        <NavRow
          iconName="info-outline" iconColor={C.inkMuted} iconBg={C.inputBg}
          label="About Bandhuu" preview="Version 1.0.0"
          onPress={() => {}}
          isLast
        />
      </View>

      {/* ── Account ── */}
      <GroupLabel text="ACCOUNT" />
      <View style={s.navCard}>
        <NavRow
          iconName="logout" iconColor={C.inkMid} iconBg={C.inputBg}
          label="Sign Out" preview="You can always sign back in"
          onPress={handleSignOut}
        />
        <NavRow
          iconName="delete-forever" iconColor={C.coral} iconBg={C.coralBg}
          label="Delete Account" preview="Permanently remove your data"
          onPress={() => setDeleteOpen(true)}
          danger isLast
        />
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        {["Bandhuu · v1.0.0", "Privacy Policy", "Terms"].map((txt, i) => (
          <React.Fragment key={txt}>
            {i > 0 && <Text style={s.footerDot}>·</Text>}
            <Text style={s.footerTxt}>{txt}</Text>
          </React.Fragment>
        ))}
      </View>

      {/* ══════════════════════════════════════════════════════════════
          SHEET: Personal Info
      ══════════════════════════════════════════════════════════════ */}
      <Sheet
        visible={editSheet === "personal"}
        onClose={() => setEditSheet(null)}
        title="Personal Info"
        subtitle="This information is visible to your connections."
      >
        <Field label="Full Name" value={edit.fullName} onChangeText={v => setEdit(p => ({ ...p, fullName: v }))} placeholder="Your full name" />
        <Field label="Email Address" value={edit.email} onChangeText={v => setEdit(p => ({ ...p, email: v }))} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field
          label="Bio"
          value={edit.bio}
          onChangeText={v => setEdit(p => ({ ...p, bio: v }))}
          placeholder="Tell us a bit about yourself…"
          multiline numberOfLines={3} maxLength={200}
          style={{ minHeight: 90 }}
        />
        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>Gender</Text>
          <ToggleRow
            value={edit.gender}
            onChange={v => setEdit(p => ({ ...p, gender: v }))}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }]}
          />
        </View>
        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.82 }]}
          onPress={saveSheet}
        >
          <Text style={s.saveBtnTxt}>{busy === "save" ? "Saving…" : "Save Changes"}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={C.white} />
        </Pressable>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════
          SHEET: Work & Education
      ══════════════════════════════════════════════════════════════ */}
      <Sheet
        visible={editSheet === "work"}
        onClose={() => setEditSheet(null)}
        title="Work & Education"
        subtitle="Shown on your public profile."
      >
        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>I am a…</Text>
          <ToggleRow
            value={edit.occupationType}
            onChange={v => setEdit(p => ({ ...p, occupationType: v }))}
            options={[
              { value: "student", label: "Student", icon: "school" },
              { value: "working_professional", label: "Professional", icon: "work" },
            ]}
          />
        </View>
        <Field
          label={edit.occupationType === "student" ? "School / College" : "Company / Organization"}
          value={edit.organization}
          onChangeText={v => setEdit(p => ({ ...p, organization: v }))}
          placeholder={edit.occupationType === "student" ? "e.g. IIIT Hyderabad" : "e.g. Infosys"}
        />
        <Field
          label={edit.occupationType === "student" ? "Course / Studying For" : "Your Post / Role"}
          value={edit.studyOrPost}
          onChangeText={v => setEdit(p => ({ ...p, studyOrPost: v }))}
          placeholder={edit.occupationType === "student" ? "e.g. B.Tech Computer Science" : "e.g. Software Engineer"}
        />
        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.82 }]}
          onPress={saveSheet}
        >
          <Text style={s.saveBtnTxt}>{busy === "save" ? "Saving…" : "Save Changes"}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={C.white} />
        </Pressable>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════
          SHEET: Location
      ══════════════════════════════════════════════════════════════ */}
      <Sheet
        visible={editSheet === "location"}
        onClose={() => setEditSheet(null)}
        title="Location"
        subtitle="Hometown helps us find your people. Current city shows where you are now."
      >
        <SheetDivider label="Hometown" />
        <SelectField label="Country" value={hCountryOther ? "Other" : edit.hometownCountry} placeholder="Select country" onPress={() => openPicker("hcountry")} />
        {hCountryOther && <Field label="Enter Country" value={edit.hometownCountry} onChangeText={v => setEdit(p => ({ ...p, hometownCountry: v }))} placeholder="Country name" />}
        <SelectField label="State / Province" value={hStateOther ? "Other" : edit.hometownState} placeholder="Select state" onPress={() => openPicker("hstate")} disabled={!edit.hometownCountry} />
        {hStateOther && <Field label="Enter State" value={edit.hometownState} onChangeText={v => setEdit(p => ({ ...p, hometownState: v }))} placeholder="State name" />}
        <SelectField label="City" value={hCityOther ? "Other" : edit.hometownCity} placeholder="Select city" onPress={() => openPicker("hcity")} disabled={!edit.hometownState} />
        {hCityOther && <Field label="Enter City" value={edit.hometownCity} onChangeText={v => setEdit(p => ({ ...p, hometownCity: v }))} placeholder="City name" />}

        <SheetDivider label="Currently In" />
        <SelectField label="Country" value={countryOther ? "Other" : edit.country} placeholder="Select country" onPress={() => openPicker("country")} />
        {countryOther && <Field label="Enter Country" value={edit.country} onChangeText={v => setEdit(p => ({ ...p, country: v }))} placeholder="Country name" />}
        <SelectField label="State / Province" value={stateOther ? "Other" : edit.state} placeholder="Select state" onPress={() => openPicker("state")} disabled={!edit.country} />
        {stateOther && <Field label="Enter State" value={edit.state} onChangeText={v => setEdit(p => ({ ...p, state: v }))} placeholder="State name" />}
        <SelectField label="City" value={cityOther ? "Other" : edit.city} placeholder="Select city" onPress={() => openPicker("city")} disabled={!edit.state} />
        {cityOther && <Field label="Enter City" value={edit.city} onChangeText={v => setEdit(p => ({ ...p, city: v }))} placeholder="City name" />}

        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.82 }]}
          onPress={saveSheet}
        >
          <Text style={s.saveBtnTxt}>{busy === "save" ? "Saving…" : "Save Changes"}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={C.white} />
        </Pressable>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════
          SHEET: Delete Account
      ══════════════════════════════════════════════════════════════ */}
      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Account"
        subtitle="This is irreversible after the 15-day grace period."
      >
        <View style={s.dangerBox}>
          <MaterialIcons name="warning-amber" size={20} color={C.coral} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.dangerBoxTitle}>Proceed with caution</Text>
            <Text style={s.dangerBoxTxt}>You'll lose all connections, posts, and data permanently after the grace period.</Text>
          </View>
        </View>
        <View style={s.fieldWrap}>
          <Text style={s.fieldLabel}>Confirm Password</Text>
          <View style={s.pwdRow}>
            <TextInput
              value={deletePwd} onChangeText={setDeletePwd}
              placeholder="Enter your password" placeholderTextColor={C.inkMuted}
              secureTextEntry={!deletePwdVisible}
              style={s.pwdInput}
            />
            <Pressable onPress={() => setDeletePwdVisible(v => !v)} style={s.eyeBtn}>
              <MaterialIcons name={deletePwdVisible ? "visibility-off" : "visibility"} size={18} color={C.inkMuted} />
            </Pressable>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [s.dangerBtn, pressed && { opacity: 0.82 }]}
          onPress={removeAccount}
        >
          <MaterialIcons name="delete-forever" size={17} color={C.white} />
          <Text style={s.dangerBtnTxt}>{busy === "delete" ? "Processing…" : "Delete My Account"}</Text>
        </Pressable>
      </Sheet>

      {/* Country / State / City picker */}
      <PickerModal
        visible={pickerOpen}
        title={pickerTitle}
        options={pickerOptions}
        onClose={() => setPickerOpen(false)}
        onSelect={onPick}
      />
    </ScreenShell>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screenContent: { paddingHorizontal: 0, paddingBottom: 140, backgroundColor: C.bg },

  // ── Profile header ──
  header: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },

  // avatar
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2.5, borderColor: C.terra,
    overflow: "hidden",
  },
  avatarImg:     { width: "100%", height: "100%" },
  avatarFallback:{ flex: 1, backgroundColor: C.terraLight, alignItems: "center", justifyContent: "center" },
  avatarInitials:{ fontSize: 28, fontWeight: "900", color: C.terra },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.terra, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: C.surface,
  },

  // identity
  profileName: { fontFamily: SERIF, fontSize: 21, fontWeight: "700", color: C.ink, letterSpacing: -0.4, marginBottom: 2 },
  profileHandle:{ fontSize: 12, fontWeight: "600", color: C.inkMuted, marginBottom: 5 },
  journeyRow:   { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 5 },
  journeyDot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: C.terra },
  journeyFrom:  { fontSize: 12, fontWeight: "700", color: C.terra },
  journeyTo:    { fontSize: 12, fontWeight: "500", color: C.inkMuted },
  occChip:      {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.catHousingBg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, alignSelf: "flex-start",
  },
  occChipTxt:   { fontSize: 10, fontWeight: "600", color: C.catHousing },

  bio: { fontSize: 13, color: C.inkMid, lineHeight: 20, fontStyle: "italic" },

  editBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 22,
    borderWidth: 1.5, borderColor: C.terra,
  },
  editBtnFill: { backgroundColor: C.terra },
  editBtnTxt: { fontSize: 13, fontWeight: "800", color: C.terra, letterSpacing: 0.2 },

  // ── Stats bar ──
  statsBar: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  statCol:    { flex: 1, alignItems: "center", gap: 4, paddingVertical: 18, borderRadius: 0 },
  statDiv:    { width: 1, backgroundColor: C.divider, marginVertical: 8 },
  statNum:    { fontSize: 26, fontWeight: "900", color: C.terra, letterSpacing: -0.5 },
  statLbl:   { fontSize: 9, fontWeight: "800", color: C.inkMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  statArrow: { fontSize: 13, fontWeight: "900", color: C.terra, lineHeight: 14, marginTop: 1 },

  // ── Completeness card ──
  completenessCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.terraLight,
    marginHorizontal: 20, marginTop: 20,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.terra + "30",
  },
  completenessTitle:   { fontSize: 13, fontWeight: "700", color: C.ink, lineHeight: 19 },
  completenessMissing: { fontSize: 11, color: C.inkMuted, fontWeight: "500", lineHeight: 16 },

  // ── Group label ──
  groupLabel: {
    fontSize: 10, fontWeight: "800", color: C.inkMuted,
    letterSpacing: 1.5, marginTop: 24, marginBottom: 8,
    paddingHorizontal: 20,
  },

  // ── Nav card ──
  navCard: {
    backgroundColor: C.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  navRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface,
  },
  navRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  navIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  navContent: { flex: 1, gap: 2 },
  navLabel:   { fontSize: 14, fontWeight: "700", color: C.ink },
  navPreview: { fontSize: 11, fontWeight: "500", color: C.inkMuted },

  // ── Footer ──
  footer: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 6, paddingVertical: 20, paddingHorizontal: 20,
  },
  footerTxt: { fontSize: 11, color: C.inkMuted },
  footerDot: { fontSize: 11, color: C.border },

  // ── Backdrop + Sheet ──
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(28,20,16,0.5)" },
  sheetOuter: { flex: 1, justifyContent: "flex-end" },
  sheetInner: {
    maxHeight: "92%",
    backgroundColor: C.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: C.ink, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 16,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 18 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  sheetTitle:  { fontSize: 20, fontWeight: "800", color: C.ink, letterSpacing: -0.3, fontFamily: SERIF },
  sheetSub:    { fontSize: 12, color: C.inkMuted, marginTop: 4, lineHeight: 18, maxWidth: 270 },
  sheetCloseBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.inputBg, alignItems: "center", justifyContent: "center",
  },
  sheetDivRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 12 },
  sheetDivLine:{ flex: 1, height: 1, backgroundColor: C.border },
  sheetDivTxt: { fontSize: 10, fontWeight: "800", color: C.inkMuted, textTransform: "uppercase", letterSpacing: 1.2 },

  // ── Field ──
  fieldWrap: { marginBottom: 16 },
  fieldLabel:{ fontSize: 9, fontWeight: "900", color: C.inkMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 },
  fieldInput: {
    minHeight: 50, borderRadius: 12,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.ink, fontWeight: "500", textAlignVertical: "top",
  },
  fieldInputFocused: { borderColor: C.terra, backgroundColor: C.white },
  fieldSelect:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 10 },
  fieldSelectTxt: { fontSize: 14, color: C.ink, fontWeight: "500", flex: 1 },

  // ── Toggle ──
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.inputBg,
  },
  toggleBtnActive: { backgroundColor: C.terra, borderColor: C.terra },
  toggleBtnTxt:    { fontSize: 12, fontWeight: "700", color: C.inkMuted },
  toggleBtnTxtActive: { color: C.white },

  // ── Save button ──
  saveBtn: {
    minHeight: 52, borderRadius: 26, backgroundColor: C.terra,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 8,
    shadowColor: C.terra, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: "800", color: C.white, letterSpacing: 0.3 },

  // ── Picker ──
  pickerOverlay: { flex: 1, backgroundColor: "rgba(28,20,16,0.5)", justifyContent: "center", padding: 20 },
  pickerBox: {
    maxHeight: "70%", backgroundColor: C.surface,
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: C.border,
  },
  pickRow: {
    paddingVertical: 13, paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider, borderRadius: 8,
  },
  pickTxt:      { fontSize: 15, color: C.ink, fontWeight: "500" },
  otherBadge:   { alignSelf: "flex-start", backgroundColor: C.terraLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.terra + "40" },
  otherBadgeTxt:{ fontSize: 13, fontWeight: "700", color: C.terra },

  // ── Danger ──
  dangerBox: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: C.coralBg, borderRadius: 14,
    borderWidth: 1, borderColor: "#F0CCCC",
    padding: 14, marginBottom: 20, gap: 4,
  },
  dangerBoxTitle: { fontSize: 14, fontWeight: "800", color: C.coral, marginBottom: 4 },
  dangerBoxTxt:   { fontSize: 13, lineHeight: 19, color: "#8B3333" },
  pwdRow: {
    flexDirection: "row", alignItems: "center", minHeight: 50,
    borderRadius: 12, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    paddingLeft: 14, paddingRight: 8,
  },
  pwdInput:  { flex: 1, fontSize: 14, color: C.ink, fontWeight: "500", paddingVertical: 14 },
  eyeBtn:    { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dangerBtn: {
    minHeight: 52, borderRadius: 14, backgroundColor: C.coral,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 8,
    shadowColor: C.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  dangerBtnTxt: { fontSize: 15, fontWeight: "800", color: C.white },
});
