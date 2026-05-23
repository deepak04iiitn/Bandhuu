import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { GetCity, GetCountries, GetState } from "react-country-state-city";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../store/AuthContext";
import { ScreenShell } from "./TabShared";
import { getMyActivitySummary } from "../../services/users/userService";
import { useSnackbar } from "../../store/SnackbarContext";

// ─── Design Tokens ── aligned with HomeTab visual language ───────────────────
const T = {
  // Home-inspired base
  bg:          "#f5f2ed",
  bgDeep:      "#ede9e2",

  // Surfaces
  surface:     "#ffffff",
  surfaceAlt:  "#f8f6f2",

  // Typography
  ink:         "#0a0a0a",
  inkMid:      "#3d3d3d",
  soft:        "#888888",
  mute:        "#a6a6a6",

  // Borders
  line:        "#e0dbd4",
  lineLight:   "#ece7e0",

  // Accent family from HomeTab
  blue:        "#004ac6",
  blueMid:     "#2b66cd",
  blueLight:   "#c7d8ff",
  bluePale:    "#eef2ff",
  blueGhost:   "#f3f6ff",
  blueDark:    "#003996",

  gold:        "#c9890a",
  goldDeep:    "#8f6207",
  goldPale:    "#fff4cf",
  goldGhost:   "#fff8e6",
  goldBorder:  "#f0da9e",

  // Utility
  white:       "#FFFFFF",
  coral:       "#C05A5A",
  coralPale:   "#FAEAEA",
  success:     "#3A8A60",
  successPale: "#E0F2E9",
};

const OTHER = { id: -1, name: "Other", isOther: true };

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Tiny helpers ──────────────────────────────────────────────────────────
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

// ─── Info Row ─────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[st.infoRow, !last && st.infoRowBorder]}>
      <View style={st.infoIcon}>
        <MaterialIcons name={icon} size={15} color={T.blue} />
      </View>
      <View style={st.infoBody}>
        <Text style={st.infoLabel}>{label}</Text>
        <Text style={st.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────
function Field({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.fieldWrap}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={T.mute}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[st.fieldInput, focused && st.fieldInputFocused]}
      />
    </View>
  );
}

// ─── SelectField ─────────────────────────────────────────────────────────
function SelectField({ label, value, placeholder, onPress, disabled }) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.fieldLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          st.fieldInput,
          st.fieldSelect,
          disabled && st.fieldDisabled,
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={[st.fieldSelectText, !value && { color: T.mute }]}>
          {value || placeholder}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={T.soft} />
      </Pressable>
    </View>
  );
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────
function Sheet({ visible, title, subtitle, onClose, children }) {
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
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Picker Modal ────────────────────────────────────────────────────────
function Picker({ visible, title, options, onClose, onSelect }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={st.pickerOverlay}>
        <View style={st.pickerBox}>
          <View style={st.sheetHeader}>
            <Text style={st.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={st.closeBtn}>
              <MaterialIcons name="close" size={16} color={T.soft} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((item, i) => (
              <Pressable
                key={`${item.id}-${i}`}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  st.pickRow,
                  pressed && { backgroundColor: T.blueGhost },
                ]}
              >
                {item.isOther ? (
                  <View style={st.otherBadge}>
                    <Text style={st.otherBadgeText}>Other</Text>
                  </View>
                ) : (
                  <Text style={st.pickText}>{item.name}</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────
function StatChip({ icon, label, color = T.bluePale, iconColor = T.blue, borderColor = T.line }) {
  return (
    <View style={[st.statChip, { backgroundColor: color, borderColor }]}>
      <MaterialIcons name={icon} size={13} color={iconColor} />
      <Text style={[st.statChipText, { color: iconColor }]}>{label}</Text>
    </View>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────
function ActionRow({ icon, label, sublabel, onPress, danger, last }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        st.actionRow,
        !last && st.actionRowBorder,
        pressed && { backgroundColor: danger ? T.coralPale : T.bgDeep },
      ]}
    >
      <View style={[st.actionIcon, danger && st.actionIconDanger]}>
        <MaterialIcons
          name={icon}
          size={17}
          color={danger ? T.coral : T.blue}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.actionLabel, danger && { color: T.coral }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={st.actionSublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <MaterialIcons
        name="chevron-right"
        size={18}
        color={danger ? T.coral : T.mute}
      />
    </Pressable>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────
function SectionCard({
  title,
  badge,
  children,
  style,
  collapsible = false,
  expanded = true,
  onToggle,
  preview,
}) {
  return (
    <View style={[st.sectionCard, style]}>
      <Pressable
        onPress={collapsible ? onToggle : undefined}
        disabled={!collapsible}
        style={({ pressed }) => [
          st.sectionHead,
          collapsible && st.sectionHeadPressable,
          collapsible && pressed && { opacity: 0.78 },
        ]}
      >
        <View style={st.sectionHeadLeft}>
          <Text style={st.sectionTitle}>{title}</Text>
          {badge ? (
            <View style={st.sectionBadge}>
              <Text style={st.sectionBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {collapsible ? (
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={22}
            color={T.soft}
          />
        ) : null}
      </Pressable>
      {collapsible && !expanded ? (
        <Text style={st.sectionPreviewText}>{preview || "Tap to view details"}</Text>
      ) : (
        children
      )}
    </View>
  );
}

// ─── Divider line ─────────────────────────────────────────────────────────
function Divider() {
  return <View style={st.divider} />;
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function AccountTab({ navigation }) {
  const { user, logout, updateProfile, updateProfileImage, deleteAccount } =
    useAuth();
  const { showSnackbar } = useSnackbar();

  const [editOpen, setEditOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState("edit");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState("country");

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [countryId, setCountryId] = useState(null);
  const [stateId, setStateId] = useState(null);
  const [countryOther, setCountryOther] = useState(false);
  const [stateOther, setStateOther] = useState(false);
  const [cityOther, setCityOther] = useState(false);

  const [hStates, setHStates] = useState([]);
  const [hCities, setHCities] = useState([]);
  const [hCountryId, setHCountryId] = useState(null);
  const [hStateId, setHStateId] = useState(null);
  const [hCountryOther, setHCountryOther] = useState(false);
  const [hStateOther, setHStateOther] = useState(false);
  const [hCityOther, setHCityOther] = useState(false);

  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState({
    fullName: "",
    email: "",
    occupationType: "student",
    gender: "Other",
    hometownCountry: "",
    hometownState: "",
    hometownCity: "",
    organization: "",
    studyOrPost: "",
    country: "",
    state: "",
    city: "",
    bio: "",
  });
  const [deletePwd, setDeletePwd] = useState("");
  const [deletePasswordVisible, setDeletePasswordVisible] = useState(false);
  const [activitySummary, setActivitySummary] = useState({
    connections: 0,
    posts: 0,
    savedPosts: 0,
  });
  const [expandedSections, setExpandedSections] = useState({
    personal: false,
    location: false,
    security: false,
  });

  useEffect(() => {
    GetCountries()
      .then((d) => setCountries(Array.isArray(d) ? d : []))
      .catch(() => setCountries([]));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadSummary = async () => {
        const result = await getMyActivitySummary();
        if (isMounted && result.success) {
          setActivitySummary({
            connections: result.connections || 0,
            posts: result.posts || 0,
            savedPosts: result.savedPosts || 0,
          });
        }
      };
      loadSummary();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const initials = useMemo(
    () =>
      (user?.fullName || user?.username || "CY")
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [user]
  );

  const pickerOptions =
    pickerType === "country" || pickerType === "hcountry"
      ? [...countries, OTHER]
      : pickerType === "state"
      ? countryOther || !countryId
        ? [OTHER]
        : [...states, OTHER]
      : pickerType === "city"
      ? stateOther || countryOther || !stateId
        ? [OTHER]
        : [...cities, OTHER]
      : pickerType === "hstate"
      ? hCountryOther || !hCountryId
        ? [OTHER]
        : [...hStates, OTHER]
      : hStateOther || hCountryOther || !hStateId
      ? [OTHER]
      : [...hCities, OTHER];

  const openEdit = async (mode = "edit") => {
    setSheetMode(mode);
    setEdit({
      fullName: user?.fullName || "",
      email: user?.email || "",
      occupationType: user?.occupationType || "student",
      gender: user?.gender || "Other",
      hometownCountry: user?.hometownCountry || "",
      hometownState: user?.hometownState || "",
      hometownCity: user?.hometownCity || "",
      organization: user?.organization || "",
      studyOrPost: user?.studyOrPost || "",
      country: user?.country || "",
      state: user?.state || "",
      city: user?.city || "",
      bio: user?.bio || "",
    });
    setCountryId(null); setStateId(null);
    setCountryOther(false); setStateOther(false); setCityOther(false);
    setHCountryId(null); setHStateId(null);
    setHCountryOther(false); setHStateOther(false); setHCityOther(false);

    const matchedCountry = countries.find((c) => c.name === user?.country);
    if (matchedCountry?.id) {
      setCountryId(matchedCountry.id);
      try {
        const ns = await GetState(matchedCountry.id);
        setStates(Array.isArray(ns) ? ns : []);
        const matchedState = ns?.find((s) => s.name === user?.state);
        if (matchedState?.id) {
          setStateId(matchedState.id);
          const nc = await GetCity(matchedCountry.id, matchedState.id);
          setCities(Array.isArray(nc) ? nc : []);
        }
      } catch { setStates([]); setCities([]); }
    } else if (user?.country) {
      setCountryOther(true);
      if (user?.state) setStateOther(true);
      if (user?.city) setCityOther(true);
    }

    const matchedHCountry = countries.find((c) => c.name === user?.hometownCountry);
    if (matchedHCountry?.id) {
      setHCountryId(matchedHCountry.id);
      try {
        const hns = await GetState(matchedHCountry.id);
        setHStates(Array.isArray(hns) ? hns : []);
        const matchedHState = hns?.find((s) => s.name === user?.hometownState);
        if (matchedHState?.id) {
          setHStateId(matchedHState.id);
          const hnc = await GetCity(matchedHCountry.id, matchedHState.id);
          setHCities(Array.isArray(hnc) ? hnc : []);
        }
      } catch { setHStates([]); setHCities([]); }
    } else if (user?.hometownCountry) {
      setHCountryOther(true);
      if (user?.hometownState) setHStateOther(true);
      if (user?.hometownCity) setHCityOther(true);
    }

    setEditOpen(true);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return showSnackbar("Allow photo access to update your profile picture.", "info");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const res = await updateProfileImage(result.assets[0]);
    if (!res.success) return showSnackbar(res.message || "Profile photo update failed.", "error");
    showSnackbar("Profile photo updated.", "success");
  };

  const openPicker = async (type) => {
    setPickerType(type);
    setPickerOpen(true);
    if (type === "state" && countryId && !countryOther)
      setStates(await GetState(countryId));
    if (type === "city" && countryId && stateId && !countryOther && !stateOther)
      setCities(await GetCity(countryId, stateId));
    if (type === "hstate" && hCountryId && !hCountryOther)
      setHStates(await GetState(hCountryId));
    if (type === "hcity" && hCountryId && hStateId && !hCountryOther && !hStateOther)
      setHCities(await GetCity(hCountryId, hStateId));
  };

  const onPick = (item) => {
    setPickerOpen(false);
    if (pickerType === "country") {
      setCountryId(item.isOther ? null : item.id); setStateId(null);
      setCountryOther(!!item.isOther); setStateOther(false); setCityOther(false);
      setStates([]); setCities([]);
      setEdit((p) => ({ ...p, country: item.isOther ? "" : item.name, state: "", city: "" }));
      return;
    }
    if (pickerType === "state") {
      setStateId(item.isOther ? null : item.id); setStateOther(!!item.isOther); setCityOther(false); setCities([]);
      setEdit((p) => ({ ...p, state: item.isOther ? "" : item.name, city: "" }));
      return;
    }
    if (pickerType === "city") {
      setCityOther(!!item.isOther);
      setEdit((p) => ({ ...p, city: item.isOther ? "" : item.name }));
      return;
    }
    if (pickerType === "hcountry") {
      setHCountryId(item.isOther ? null : item.id); setHStateId(null);
      setHCountryOther(!!item.isOther); setHStateOther(false); setHCityOther(false);
      setHStates([]); setHCities([]);
      setEdit((p) => ({ ...p, hometownCountry: item.isOther ? "" : item.name, hometownState: "", hometownCity: "" }));
      return;
    }
    if (pickerType === "hstate") {
      setHStateId(item.isOther ? null : item.id); setHStateOther(!!item.isOther); setHCityOther(false); setHCities([]);
      setEdit((p) => ({ ...p, hometownState: item.isOther ? "" : item.name, hometownCity: "" }));
      return;
    }
    if (pickerType === "hcity") {
      setHCityOther(!!item.isOther);
      setEdit((p) => ({ ...p, hometownCity: item.isOther ? "" : item.name }));
      return;
    }
  };

  const saveProfile = async () => {
    if (!edit.fullName.trim() || !edit.email.trim() || !edit.gender)
      return showSnackbar("Please complete Full Name, Email, and Gender.", "info");
    setBusy("profile");
    const res = await updateProfile({
      fullName: edit.fullName.trim(),
      email: edit.email.trim(),
      occupationType: edit.occupationType,
      gender: edit.gender,
      hometownCountry: edit.hometownCountry.trim(),
      hometownState: edit.hometownState.trim(),
      hometownCity: edit.hometownCity.trim(),
      organization: edit.organization.trim(),
      studyOrPost: edit.studyOrPost.trim(),
      country: edit.country.trim(),
      state: edit.state.trim(),
      city: edit.city.trim(),
      bio: edit.bio.trim(),
    });
    setBusy("");
    if (!res.success) return showSnackbar(res.message || "Profile update failed.", "error");
    setEditOpen(false);
    showSnackbar("Profile updated successfully.", "success");
  };

  const removeAccount = async () => {
    if (!deletePwd)
      return showSnackbar("Enter your password to continue.", "info");
    setBusy("delete");
    const res = await deleteAccount(deletePwd);
    setBusy("");
    if (!res.success) return showSnackbar(res.message || "Delete account failed.", "error");
    setDeleteOpen(false);
    setDeletePwd("");
    setDeletePasswordVisible(false);
    showSnackbar(
      res.permanentDeletionAt
        ? `Account deletion scheduled for ${new Date(res.permanentDeletionAt).toLocaleDateString()}.`
        : "Your account is scheduled for deletion.",
      "success",
      3600
    );
  };

  const occupationLabel =
    user?.occupationType === "working_professional" ? "Working Professional" : "Student";

  const isProfileComplete = user?.hometownCountry && user?.country && user?.organization && user?.bio;
  const hometownStr = [user?.hometownCity, user?.hometownState, user?.hometownCountry].filter(Boolean).join(", ") || "Not set";
  const locationStr = [user?.city, user?.state, user?.country].filter(Boolean).join(", ") || "Not set";
  const activityCounts = {
    connections: activitySummary.connections,
    posts: activitySummary.posts,
    saved: activitySummary.savedPosts,
  };
  const toggleSection = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScreenShell
      navigation={navigation}
      routeName="Account"
      noPadding
      background={T.bg}
      contentContainerStyle={st.screenContent}
    >
      {/* ── Hero Card ─────────────────────────────────────────────────── */}
      <View style={st.heroCard}>

        {/* Top row */}
        <View style={st.heroTopRow}>
          <View style={st.memberBadge}>
            <View style={st.memberDot} />
            <Text style={st.memberText}>Member</Text>
          </View>
          <Pressable
            onPress={() => openEdit(isProfileComplete ? "edit" : "complete")}
            style={({ pressed }) => [st.heroEditBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={st.heroEditText}>
              {isProfileComplete ? "Edit Profile" : "Complete Profile"}
            </Text>
          </Pressable>
        </View>

        {/* Avatar + name block */}
        <View style={st.heroCenter}>
          <Pressable onPress={pickPhoto} style={st.avatarOuter}>
            <View style={st.avatarRing}>
              {user?.profileImageUri ? (
                <Image source={{ uri: user.profileImageUri }} style={st.avatarImg} />
              ) : (
                <View style={st.avatarFallback}>
                  <Text style={st.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={st.cameraBtn}>
              <MaterialIcons name="photo-camera" size={11} color={T.white} />
            </View>
          </Pressable>

          <View style={st.heroNameBlock}>
            <Text style={st.heroName}>{user?.fullName || "Bandhuu Member"}</Text>
            <Text style={st.heroHandle}>@{user?.username || "bandhuu"}</Text>

            {/* Gold accent underline */}
            <View style={st.goldAccentLine} />
          </View>
        </View>

        {/* Chips */}
        <View style={st.chipRow}>
          <StatChip
            icon={user?.occupationType === "working_professional" ? "work" : "school"}
            label={occupationLabel}
            color={T.bluePale}
            iconColor={T.blueDark}
            borderColor={T.blueLight}
          />
          <StatChip
            icon="location-on"
            label={[user?.city, user?.state].filter(Boolean).join(", ") || "Location"}
            color={T.goldGhost}
            iconColor={T.goldDeep}
            borderColor={T.goldBorder}
          />
        </View>
      </View>

      {/* ── Personal Info ───────────────────────────────────────────────── */}
      <SectionCard
        title="Personal Information"
        badge="Individual"
        collapsible
        expanded={expandedSections.personal}
        onToggle={() => toggleSection("personal")}
        preview={`${user?.fullName || "No name"} · ${user?.email || "No email"}`}
      >
        <InfoRow icon="person" label="Full Name" value={user?.fullName} />
        <InfoRow icon="alternate-email" label="Username" value={user?.username ? `@${user.username}` : null} />
        <InfoRow icon="mail-outline" label="Email" value={user?.email} />
        <InfoRow icon="people-outline" label="Gender" value={user?.gender} />
        <InfoRow icon="business" label={occupationLabel} value={user?.organization ? `${user?.studyOrPost} at ${user?.organization}` : "Not set"} />
        <InfoRow icon="notes" label="Bio" value={user?.bio} last />
      </SectionCard>

      {/* ── Location Details ────────────────────────────────────────────── */}
      <SectionCard
        title="Location Details"
        badge="Proximity"
        collapsible
        expanded={expandedSections.location}
        onToggle={() => toggleSection("location")}
        preview={locationStr}
      >
        <InfoRow icon="home" label="Hometown" value={hometownStr} />
        <InfoRow icon="location-on" label="Current Location" value={locationStr} last />
      </SectionCard>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <SectionCard
        title="Security"
        badge="Protected"
        collapsible
        expanded={expandedSections.security}
        onToggle={() => toggleSection("security")}
        preview={user?.securityQuestion ? "Security question configured" : "Not configured"}
      >
        <InfoRow
          icon="help-outline"
          label="Security Question"
          value={user?.securityQuestion || "Not configured"}
        />
        <InfoRow
          icon="lock-outline"
          label="Security Answer"
          value={user?.hasSecurityAnswer ? "••••••••  (hidden for your safety)" : "Not configured"}
          last
        />
      </SectionCard>

      <SectionCard title="My Activity" badge="Manage">
        <View style={st.activityMenuWrap}>
          <Pressable
            onPress={() =>
              navigation.navigate("ActivityDetail", {
                type: "connections",
                title: "Connections",
                count: activityCounts.connections,
              })
            }
            style={({ pressed }) => [st.activityMenuRow, pressed && { opacity: 0.8 }]}
          >
            <View style={st.activityMenuLeft}>
              <View style={st.activityMenuIcon}>
                <MaterialIcons name="people-outline" size={16} color={T.blue} />
              </View>
              <View>
                <Text style={st.activityMenuTitle}>Connections</Text>
                <Text style={st.activityMenuSub}>View and manage your connections</Text>
              </View>
            </View>
            <View style={st.activityCountWrap}>
              <Text style={st.activityCountText}>{activityCounts.connections}</Text>
              <MaterialIcons name="chevron-right" size={18} color={T.mute} />
            </View>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate("ActivityDetail", {
                type: "posts",
                title: "Posts",
                count: activityCounts.posts,
              })
            }
            style={({ pressed }) => [st.activityMenuRow, st.activityMenuBorder, pressed && { opacity: 0.8 }]}
          >
            <View style={st.activityMenuLeft}>
              <View style={st.activityMenuIcon}>
                <MaterialIcons name="description" size={16} color={T.blue} />
              </View>
              <View>
                <Text style={st.activityMenuTitle}>Posts</Text>
                <Text style={st.activityMenuSub}>Posts + meetups in one place</Text>
              </View>
            </View>
            <View style={st.activityCountWrap}>
              <Text style={st.activityCountText}>{activityCounts.posts}</Text>
              <MaterialIcons name="chevron-right" size={18} color={T.mute} />
            </View>
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate("ActivityDetail", {
                type: "saved",
                title: "Saved Posts",
                count: activityCounts.saved,
              })
            }
            style={({ pressed }) => [st.activityMenuRow, st.activityMenuBorder, pressed && { opacity: 0.8 }]}
          >
            <View style={st.activityMenuLeft}>
              <View style={st.activityMenuIcon}>
                <MaterialIcons name="bookmark-border" size={16} color={T.blue} />
              </View>
              <View>
                <Text style={st.activityMenuTitle}>Saved Posts</Text>
                <Text style={st.activityMenuSub}>Your bookmarked posts collection</Text>
              </View>
            </View>
            <View style={st.activityCountWrap}>
              <Text style={st.activityCountText}>{activityCounts.saved}</Text>
              <MaterialIcons name="chevron-right" size={18} color={T.mute} />
            </View>
          </Pressable>
        </View>
      </SectionCard>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <SectionCard title="Account Actions">
        <ActionRow
          icon="edit"
          label="Edit Profile Details"
          sublabel="Update your existing information"
          onPress={() => openEdit("edit")}
        />
        {!isProfileComplete && (
          <ActionRow
            icon="playlist-add-check"
            label="Complete Profile"
            sublabel="Fill missing fields like Hometown"
            onPress={() => openEdit("complete")}
          />
        )}
        <ActionRow
          icon="logout"
          label="Sign Out"
          sublabel="You can always log back in"
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: logout },
            ])
          }
        />
        <ActionRow
          icon="delete-forever"
          label="Delete Account"
          sublabel="Permanently remove your data"
          onPress={() => setDeleteOpen(true)}
          danger
          last
        />
      </SectionCard>

      {/* ── App Info ──────────────────────────────────────────────────────── */}
      <View style={st.appInfo}>
        <Text style={st.appInfoText}>Bandhuu · v1.0.0</Text>
        <Text style={st.appInfoDot}>·</Text>
        <Text style={st.appInfoText}>Privacy Policy</Text>
        <Text style={st.appInfoDot}>·</Text>
        <Text style={st.appInfoText}>Terms</Text>
      </View>

      {/* ── Pickers & Modals ──────────────────────────────────────────────── */}
      <Picker
        visible={pickerOpen}
        title={
          pickerType === "country" || pickerType === "hcountry"
            ? "Select Country"
            : pickerType === "state" || pickerType === "hstate"
            ? "Select State / Province"
            : "Select City"
        }
        options={pickerOptions}
        onClose={() => setPickerOpen(false)}
        onSelect={onPick}
      />

      {/* ── Edit Sheet ────────────────────────────────────────────────────── */}
      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title={sheetMode === "edit" ? "Edit Profile" : "Complete Profile"}
        subtitle={
          sheetMode === "edit"
            ? "Updates are visible to your connections."
            : "Fill in your missing details."
        }
      >
        {sheetMode === "edit" && (
          <>
            <Field
              label="Full Name"
              value={edit.fullName}
              onChangeText={(v) => setEdit((p) => ({ ...p, fullName: v }))}
              placeholder="Your full name"
            />
            <Field
              label="Email Address"
              value={edit.email}
              onChangeText={(v) => setEdit((p) => ({ ...p, email: v }))}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}
        {(sheetMode === "edit" || (sheetMode === "complete" && !user?.bio)) && (
          <Field
            label="Bio"
            value={edit.bio}
            onChangeText={(v) => setEdit((p) => ({ ...p, bio: v }))}
            placeholder="Tell us a bit about yourself..."
            multiline
            numberOfLines={3}
            maxLength={200}
          />
        )}

        {((sheetMode === "complete" && !user?.gender) || sheetMode === "edit") && (
          <View style={st.fieldWrap}>
            <Text style={st.fieldLabel}>Gender</Text>
            <View style={st.toggleRow}>
              {["Male", "Female", "Other"].map((opt) => {
                const active = edit.gender === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setEdit((p) => ({ ...p, gender: opt }))}
                    style={[st.toggleBtn, active && st.toggleBtnActive]}
                  >
                    <Text style={[st.toggleText, active && st.toggleTextActive]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={st.fieldWrap}>
          <Text style={st.fieldLabel}>Occupation Type</Text>
          <View style={st.toggleRow}>
            {["student", "working_professional"].map((opt) => {
              const active = edit.occupationType === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setEdit((p) => ({ ...p, occupationType: opt }))}
                  style={[st.toggleBtn, active && st.toggleBtnActive]}
                >
                  <MaterialIcons
                    name={opt === "student" ? "school" : "work"}
                    size={14}
                    color={active ? T.white : T.soft}
                  />
                  <Text style={[st.toggleText, active && st.toggleTextActive]}>
                    {opt === "student" ? "Student" : "Professional"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {((sheetMode === "complete" && !user?.organization) || sheetMode === "edit") && (
          <Field
            label={edit.occupationType === "student" ? "School / College Name" : "Company / Organization"}
            value={edit.organization}
            onChangeText={(v) => setEdit((p) => ({ ...p, organization: v }))}
            placeholder="Organization"
          />
        )}

        {((sheetMode === "complete" && !user?.studyOrPost) || sheetMode === "edit") && (
          <Field
            label={edit.occupationType === "student" ? "Course / Studying For" : "Post / Role Name"}
            value={edit.studyOrPost}
            onChangeText={(v) => setEdit((p) => ({ ...p, studyOrPost: v }))}
            placeholder={edit.occupationType === "student" ? "e.g. B.Tech Computer Science" : "e.g. Software Engineer"}
          />
        )}

        {/* Hometown */}
        {((sheetMode === "complete" && !user?.hometownCountry) || sheetMode === "edit") && (
          <>
            <View style={st.sectionDividerRow}>
              <View style={st.sectionDividerLine} />
              <Text style={st.sectionDividerText}>Hometown</Text>
              <View style={st.sectionDividerLine} />
            </View>

            <SelectField label="Country" value={hCountryOther ? "Other" : edit.hometownCountry}
              placeholder="Select country" onPress={() => openPicker("hcountry")} />
            {hCountryOther && (
              <Field label="Enter Country" value={edit.hometownCountry}
                onChangeText={(v) => setEdit((p) => ({ ...p, hometownCountry: v }))} placeholder="Country name" />
            )}
            <SelectField label="State / Province" value={hStateOther ? "Other" : edit.hometownState}
              placeholder="Select state" onPress={() => openPicker("hstate")} disabled={!edit.hometownCountry} />
            {hStateOther && (
              <Field label="Enter State" value={edit.hometownState}
                onChangeText={(v) => setEdit((p) => ({ ...p, hometownState: v }))} placeholder="State name" />
            )}
            <SelectField label="City" value={hCityOther ? "Other" : edit.hometownCity}
              placeholder="Select city" onPress={() => openPicker("hcity")} disabled={!edit.hometownState} />
            {hCityOther && (
              <Field label="Enter City" value={edit.hometownCity}
                onChangeText={(v) => setEdit((p) => ({ ...p, hometownCity: v }))} placeholder="City name" />
            )}
          </>
        )}

        {/* Current Location */}
        {((sheetMode === "complete" && !user?.country) || sheetMode === "edit") && (
          <>
            <View style={st.sectionDividerRow}>
              <View style={st.sectionDividerLine} />
              <Text style={st.sectionDividerText}>Current Location</Text>
              <View style={st.sectionDividerLine} />
            </View>

            <SelectField label="Country" value={countryOther ? "Other" : edit.country}
              placeholder="Select country" onPress={() => openPicker("country")} />
            {countryOther && (
              <Field label="Enter Country" value={edit.country}
                onChangeText={(v) => setEdit((p) => ({ ...p, country: v }))} placeholder="Country name" />
            )}
            <SelectField label="State / Province" value={stateOther ? "Other" : edit.state}
              placeholder="Select state" onPress={() => openPicker("state")} disabled={!edit.country} />
            {stateOther && (
              <Field label="Enter State" value={edit.state}
                onChangeText={(v) => setEdit((p) => ({ ...p, state: v }))} placeholder="State name" />
            )}
            <SelectField label="City" value={cityOther ? "Other" : edit.city}
              placeholder="Select city" onPress={() => openPicker("city")} disabled={!edit.state} />
            {cityOther && (
              <Field label="Enter City" value={edit.city}
                onChangeText={(v) => setEdit((p) => ({ ...p, city: v }))} placeholder="City name" />
            )}
          </>
        )}

        <Pressable
          onPress={saveProfile}
          style={({ pressed }) => [st.primaryBtn, pressed && { opacity: 0.82 }]}
        >
          <Text style={st.primaryBtnText}>
            {busy === "profile" ? "Saving…" : "Save Changes"}
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color={T.white} />
        </Pressable>
      </Sheet>

      {/* ── Delete Sheet ──────────────────────────────────────────────────── */}
      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Account"
        subtitle="This is irreversible after the 15-day grace period."
      >
        <View style={st.dangerBox}>
          <MaterialIcons name="warning-amber" size={20} color={T.coral} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.dangerBoxTitle}>Proceed with caution</Text>
            <Text style={st.dangerBoxText}>
              You'll lose all your connections, posts, and data permanently after the hold period.
            </Text>
          </View>
        </View>

        <View style={st.fieldWrap}>
          <Text style={st.fieldLabel}>Confirm Password</Text>
          <View style={st.pwdRow}>
            <TextInput
              value={deletePwd}
              onChangeText={setDeletePwd}
              placeholder="Enter your password"
              placeholderTextColor={T.mute}
              secureTextEntry={!deletePasswordVisible}
              style={st.pwdInput}
            />
            <Pressable onPress={() => setDeletePasswordVisible((v) => !v)} style={st.eyeBtn}>
              <MaterialIcons
                name={deletePasswordVisible ? "visibility-off" : "visibility"}
                size={18}
                color={T.mute}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={removeAccount}
          style={({ pressed }) => [st.dangerBtn, pressed && { opacity: 0.82 }]}
        >
          <MaterialIcons name="delete-forever" size={17} color={T.white} />
          <Text style={st.dangerBtnText}>
            {busy === "delete" ? "Processing…" : "Delete My Account"}
          </Text>
        </Pressable>
      </Sheet>
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 0,
    paddingBottom: 140,
    gap: 16,
    backgroundColor: T.bg,
  },
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
    borderBottomWidth: 2,
    borderBottomColor: T.ink,
    marginBottom: 4,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: T.coral,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.coral,
  },
  liveLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: T.coral,
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontSize: 46,
    fontWeight: "900",
    color: T.ink,
    lineHeight: 52,
    letterSpacing: -1.8,
  },
  heroTitleLight: {
    fontWeight: "300",
    fontStyle: "italic",
    fontSize: 38,
    letterSpacing: -1,
  },

  // ── Hero Card ──────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.line,
    paddingTop: 0,
    paddingBottom: 22,
    paddingHorizontal: 20,
    gap: 14,
    overflow: "hidden",
    marginHorizontal: 20,
    shadowColor: T.ink,
    shadowOffset: { width: 3, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: T.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 4,
  },

  // Member badge (gold)
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.goldGhost,
    borderWidth: 1.2,
    borderColor: T.goldBorder,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  memberDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.gold,
  },
  memberText: {
    fontSize: 10,
    fontWeight: "900",
    color: T.goldDeep,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Edit button (blue)
  heroEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: T.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroEditText: { fontSize: 11, fontWeight: "900", color: T.white, letterSpacing: 1 },

  // Avatar + name horizontal layout
  heroCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingVertical: 4,
  },
  avatarOuter: { position: "relative" },
  avatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 3,
    backgroundColor: T.bluePale,
    borderWidth: 2.5,
    borderColor: T.blue,
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 38 },
  avatarFallback: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: T.blueGhost,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "900",
    color: T.blue,
    letterSpacing: -0.5,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.gold,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: T.surface,
  },

  heroNameBlock: { flex: 1 },
  heroName: {
    fontSize: 22,
    fontWeight: "900",
    color: T.ink,
    letterSpacing: -0.4,
  },
  heroHandle: {
    fontSize: 13,
    color: T.soft,
    marginTop: 3,
    fontWeight: "500",
  },
  goldAccentLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.gold,
    marginTop: 8,
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  statChipText: { fontSize: 11, fontWeight: "700" },

  // ── Section Card ────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: T.line,
    overflow: "hidden",
    marginHorizontal: 20,
    shadowColor: T.ink,
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHead: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.lineLight,
    backgroundColor: T.surfaceAlt,
  },
  sectionHeadPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: T.ink,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionBadge: {
    backgroundColor: T.goldGhost,
    borderWidth: 1,
    borderColor: T.goldBorder,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: T.goldDeep,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionPreviewText: {
    fontSize: 13,
    color: T.soft,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontWeight: "600",
  },

  // ── Info Row ────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.lineLight,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: T.bluePale,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    borderWidth: 1,
    borderColor: T.blueLight,
  },
  infoBody: { flex: 1 },
  infoLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: T.mute,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: T.ink,
    lineHeight: 21,
  },

  // ── Action Row ──────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 13,
  },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: T.lineLight },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.bluePale,
    borderWidth: 1,
    borderColor: T.blueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconDanger: {
    backgroundColor: T.coralPale,
    borderColor: "#FCCDD3",
  },
  actionLabel: { fontSize: 14, fontWeight: "700", color: T.ink },
  actionSublabel: { fontSize: 12, color: T.mute, marginTop: 1 },
  activityMenuWrap: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  activityMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  activityMenuBorder: {
    borderTopWidth: 1,
    borderTopColor: T.lineLight,
  },
  activityMenuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  activityMenuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bluePale,
    borderWidth: 1,
    borderColor: T.blueLight,
  },
  activityMenuTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: T.ink,
  },
  activityMenuSub: {
    marginTop: 2,
    fontSize: 11,
    color: T.soft,
    fontWeight: "600",
  },
  activityCountWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityCountText: {
    fontSize: 18,
    fontWeight: "900",
    color: T.ink,
    letterSpacing: -0.3,
  },

  // ── App Info ────────────────────────────────────────────────────────────
  appInfo: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    paddingBottom: 24,
    marginHorizontal: 20,
  },
  appInfoText: { fontSize: 11, color: T.mute },
  appInfoDot: { fontSize: 11, color: T.line },

  // ── Backdrop ────────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30,20,10,0.45)",
  },

  // ── Sheet ───────────────────────────────────────────────────────────────
  sheetOuter: { flex: 1, justifyContent: "flex-end" },
  sheetInner: {
    maxHeight: "90%",
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
    backgroundColor: T.blueGhost,
    borderWidth: 1,
    borderColor: T.bluePale,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section divider inside sheet
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.line,
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.soft,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },

  // ── Picker ──────────────────────────────────────────────────────────────
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(30,20,10,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  pickerBox: {
    maxHeight: "70%",
    backgroundColor: T.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: T.line,
  },
  pickRow: {
    paddingVertical: 13,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: T.lineLight,
    borderRadius: 8,
  },
  pickText: { fontSize: 15, color: T.ink, fontWeight: "500" },
  otherBadge: {
    alignSelf: "flex-start",
    backgroundColor: T.bluePale,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.blueLight,
  },
  otherBadgeText: { fontSize: 13, fontWeight: "800", color: T.blue },

  // ── Field ───────────────────────────────────────────────────────────────
  fieldWrap: { marginBottom: 16 },
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
    fontSize: 15,
    color: T.ink,
    fontWeight: "500",
    textAlignVertical: "top",
  },
  fieldInputFocused: {
    borderColor: T.blue,
    backgroundColor: T.blueGhost,
  },
  fieldSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  fieldSelectText: { fontSize: 15, color: T.ink, fontWeight: "500", flex: 1 },
  fieldDisabled: { opacity: 0.4 },

  // ── Toggle ──────────────────────────────────────────────────────────────
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.line,
    backgroundColor: T.surfaceAlt,
  },
  toggleBtnActive: {
    backgroundColor: T.blue,
    borderColor: T.blue,
  },
  toggleText: { fontSize: 13, fontWeight: "700", color: T.soft },
  toggleTextActive: { color: T.white },

  // ── Primary Button (solid, no gradient) ─────────────────────────────────
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

  // ── Danger Box ──────────────────────────────────────────────────────────
  dangerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: T.coralPale,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0CCCC",
    padding: 14,
    marginBottom: 20,
    gap: 4,
  },
  dangerBoxTitle: { fontSize: 14, fontWeight: "800", color: T.coral, marginBottom: 4 },
  dangerBoxText: { fontSize: 13, lineHeight: 19, color: "#8B3333" },

  // ── Password Row ────────────────────────────────────────────────────────
  pwdRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1.5,
    borderColor: T.line,
    paddingLeft: 14,
    paddingRight: 8,
  },
  pwdInput: {
    flex: 1,
    fontSize: 15,
    color: T.ink,
    fontWeight: "500",
    paddingVertical: 14,
  },
  eyeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Danger Button ───────────────────────────────────────────────────────
  dangerBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: T.coral,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: T.coral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: T.white,
    letterSpacing: 0.2,
  },

  divider: {
    height: 1,
    backgroundColor: T.lineLight,
    marginHorizontal: 18,
  },
});