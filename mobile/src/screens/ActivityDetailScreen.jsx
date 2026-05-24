import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Animated, Image, LayoutAnimation, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput,
  UIManager, View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { ScreenShell } from "../components/tabs/TabShared";
import {
  getMyConnections, getMyPosts, getMySavedPosts,
  removeConnection, blockUser, reportUser,
} from "../services/users/userService";
import { deletePost, toggleSave, updatePost } from "../services/posts/postService";
import { deleteMeetup, updateMeetup } from "../services/meetups/meetupService";
import { getServerBaseUrl } from "../services/chat/chatService";
import { useAuth } from "../store/AuthContext";
import { useSnackbar } from "../store/SnackbarContext";
import UserActionsMenu from "../components/common/UserActionsMenu";
import ReportSheet from "../components/common/ReportSheet";
import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental)
  UIManager.setLayoutAnimationEnabledExperimental(true);

// ─── TOKENS ────────────────────────────────────────────────────────────────────
const C = {
  bg:          "#F5F0EB",
  surface:     "#FEFCFA",
  inputBg:     "#F2EDE6",
  terra:       "#C84B0C",
  terraLight:  "#FDF0EA",
  green:       "#1A6B4A",
  ink:         "#1C1410",
  inkMid:      "#5C4F47",
  inkMuted:    "#9C8D84",
  border:      "#E8E0D8",
  divider:     "#F0EAE3",
  white:       "#FFFFFF",
  coral:       "#C05A5A",
  coralBg:     "#FAEAEA",
  catHousing:  "#3B6CA8", catHousingBg: "#EEF3FC",
  catTravel:   "#1A7A5E", catTravelBg:  "#E8F5F1",
  catHangouts: "#B83055", catHangoutsBg:"#FDEEF3",
  catHelp:     "#7040B8", catHelpBg:    "#F3EEFE",
  catGeneral:  "#D4820A", catGeneralBg: "#FEF7E8",
};
const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const DEFAULT_MEETUP_IMG = { uri: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80" };
const POST_CATEGORIES = ["General","Flatmate / Housing","Travelmate","Trip","Hangouts","Help / Questions"];

const PALETTE = [
  {bg:"#FDF0EA",text:"#C84B0C"},{bg:"#EEF3FC",text:"#3B6CA8"},
  {bg:"#E8F5F1",text:"#1A7A5E"},{bg:"#FDEEF3",text:"#B83055"},{bg:"#F3EEFE",text:"#7040B8"},
];
const getPalette = (n) => PALETTE[(n?.charCodeAt(0)??0)%PALETTE.length];

const getCatMeta = (cat) => {
  if (!cat) return {color:C.catGeneral,bg:C.catGeneralBg};
  const l=cat.toLowerCase();
  if (l.includes("housing")||l.includes("flatmate")) return {color:C.catHousing,bg:C.catHousingBg};
  if (l.includes("travel")||l.includes("trip"))      return {color:C.catTravel,bg:C.catTravelBg};
  if (l.includes("hangout"))                         return {color:C.catHangouts,bg:C.catHangoutsBg};
  if (l.includes("help")||l.includes("question"))    return {color:C.catHelp,bg:C.catHelpBg};
  return {color:C.catGeneral,bg:C.catGeneralBg};
};

const fmtRel=(d)=>{if(!d)return"just now";const m=Math.floor((Date.now()-new Date(d))/60000),h=Math.floor(m/60),day=Math.floor(h/24);if(m<60)return`${Math.max(1,m)}m ago`;if(h<24)return`${h}h ago`;return`${day}d ago`;};
const fmtMTime=(t)=>{if(!t)return"";const[h,m]=t.split(":").map(Number);if(isNaN(h))return t;return`${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;};
const fmtDateD=(d)=>new Date(d).toLocaleDateString("en-US",{day:"numeric",month:"short",year:"numeric"});
const fmtTimeD=(d)=>{const dt=new Date(d),h=dt.getHours(),m=dt.getMinutes();return`${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;};

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Ava({uri,name,size=44}){
  const pal=getPalette(name);
  const init=(name||"B").split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  const c={width:size,height:size,borderRadius:size/2,overflow:"hidden",flexShrink:0};
  if(uri)return<Image source={{uri}} style={c}/>;
  return<View style={[c,{backgroundColor:pal.bg,alignItems:"center",justifyContent:"center"}]}><Text style={{fontSize:size*0.35,fontWeight:"900",color:pal.text}}>{init}</Text></View>;
}

// ─── EDIT SHEET ───────────────────────────────────────────────────────────────
function EditSheet({visible,onClose,title,subtitle,children}){
  const anim=useMemo(()=>new Animated.Value(0),[]);
  useEffect(()=>{Animated.timing(anim,{toValue:visible?1:0,duration:220,useNativeDriver:true}).start();},[visible,anim]);
  return(
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop,{opacity:anim}]}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/></Animated.View>
      <View style={s.sheetOuter}>
        <View style={s.sheetInner}>
          <View style={s.sheetHandle}/>
          <View style={s.sheetHead}>
            <View style={{flex:1}}><Text style={s.sheetTitle}>{title}</Text>{subtitle?<Text style={s.sheetSub}>{subtitle}</Text>:null}</View>
            <Pressable onPress={onClose} style={s.sheetClose} hitSlop={8}><MaterialIcons name="close" size={16} color={C.inkMuted}/></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:40}}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({label,...props}){
  const[focused,setFocused]=useState(false);
  return(
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor={C.inkMuted} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={[s.fieldInput,focused&&s.fieldFocused,props.style]}/>
    </View>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({item,user,expanded,onToggle,onEdit,onDelete,onUnsave,saved}){
  const cat=getCatMeta(item.category);
  const author=(item.user&&typeof item.user==="object")?item.user:user;
  return(
    <View style={s.postCard}>
      <View style={s.postTop}>
        <View style={s.postAuthorRow}>
          <Ava uri={author?.profileImageUri} name={author?.fullName} size={34}/>
          <View><Text style={s.postAuthorName}>{author?.fullName||"You"}</Text><Text style={s.postTime}>{fmtRel(item.createdAt)}</Text></View>
        </View>
        <Text style={[s.postCatLbl,{color:cat.color}]}>{(item.category||"GENERAL").toUpperCase()}</Text>
      </View>
      <Text style={s.postTitle}>{item.title}</Text>
      <Text style={s.postBody} numberOfLines={expanded?undefined:3}>{item.details}</Text>
      {item.details?.length>100&&<Pressable onPress={onToggle} hitSlop={10}><Text style={s.readMore}>{expanded?"Show less":"Read more"}</Text></Pressable>}
      {item.imageUri&&<View style={s.postImgWrap}><Image source={{uri:item.imageUri}} style={s.postImg}/></View>}
      <View style={s.postStats}>
        {[{icon:"thumb-up-off-alt",n:item.likes?.length||0},{icon:"thumb-down-off-alt",n:item.dislikes?.length||0},{icon:"chat-bubble-outline",n:item.comments||0}].map(({icon,n})=>(
          <View key={icon} style={s.statItem}><MaterialIcons name={icon} size={14} color={C.inkMuted}/><Text style={s.statCount}>{n}</Text></View>
        ))}
      </View>
      <View style={s.cardActions}>
        {saved?(
          <Pressable style={s.btnEdit} onPress={onUnsave}>
            <MaterialIcons name="bookmark-remove" size={14} color={C.terra}/><Text style={s.btnEditTxt}>Remove from saved</Text>
          </Pressable>
        ):(
          <>
            <Pressable style={s.btnEdit} onPress={onEdit}><MaterialIcons name="edit" size={14} color={C.terra}/><Text style={s.btnEditTxt}>Edit</Text></Pressable>
            <Pressable style={s.btnDel} onPress={onDelete}><MaterialIcons name="delete-outline" size={14} color={C.coral}/><Text style={s.btnDelTxt}>Delete</Text></Pressable>
          </>
        )}
      </View>
    </View>
  );
}

// ─── MEETUP CARD ──────────────────────────────────────────────────────────────
function MeetupCard({item,expanded,onToggle,onEdit,onDelete}){
  const serverBase=getServerBaseUrl();
  const imgSrc=item.imageUri?{uri:item.imageUri.startsWith("http")?item.imageUri:`${serverBase}${item.imageUri}`}:DEFAULT_MEETUP_IMG;
  const spotsLeft=(item.maxMembers||0)-(item.members?.length||0);
  const day=new Date(item.date).getDate();
  const mon=new Date(item.date).toLocaleDateString("en-US",{month:"short"}).toUpperCase();
  return(
    <View style={s.meetCard}>
      <View style={s.meetImgWrap}>
        <Image source={imgSrc} style={s.meetImg}/>
        <View style={s.dateTile}><Text style={s.dateTileDay}>{day}</Text><Text style={s.dateTileMon}>{mon}</Text></View>
        <View style={s.spotsBadge}><Text style={s.spotsTxt}>{spotsLeft>0?`${spotsLeft} left`:"Full"}</Text></View>
      </View>
      <View style={s.meetBody}>
        <View style={s.meetTopRow}>
          <Text style={s.meetTime}>{fmtMTime(item.time)}</Text>
          {item.hometown&&<View style={s.hTag}><View style={s.hDot}/><Text style={s.hTxt}>For {item.hometown} folks</Text></View>}
        </View>
        <Text style={s.meetTitle} numberOfLines={2}>{item.title}</Text>
        {item.details&&(
          <><Text style={s.meetDesc} numberOfLines={expanded?undefined:2}>{item.details}</Text>
          {item.details.length>80&&<Pressable onPress={onToggle} hitSlop={8}><Text style={s.readMore}>{expanded?"Show less":"Read more"}</Text></Pressable>}</>
        )}
        {(item.venue||item.meetupLocation||item.location)&&(
          <View style={s.locPill}><MaterialIcons name="location-on" size={12} color={C.catHousing}/><Text style={s.locTxt} numberOfLines={1}>{[item.venue,item.meetupLocation||item.location].filter(Boolean).join(", ")}</Text></View>
        )}
        <View style={s.meetFooter}>
          <View style={s.meetMembRow}><MaterialIcons name="group" size={13} color={C.inkMuted}/><Text style={s.meetMembTxt}>{item.members?.length||0}/{item.maxMembers}</Text></View>
          <View style={[s.statusBadge,item.status==="completed"&&s.statusDone,item.status==="cancelled"&&s.statusCancel]}>
            <Text style={[s.statusTxt,item.status==="completed"&&{color:C.green},item.status==="cancelled"&&{color:C.coral}]}>{(item.status||"upcoming").toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.cardActions}>
          <Pressable style={s.btnEdit} onPress={onEdit}><MaterialIcons name="edit" size={14} color={C.terra}/><Text style={s.btnEditTxt}>Edit</Text></Pressable>
          <Pressable style={s.btnDel} onPress={onDelete}><MaterialIcons name="delete-outline" size={14} color={C.coral}/><Text style={s.btnDelTxt}>Delete</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── EMPTY ────────────────────────────────────────────────────────────────────
function Empty({emoji,head,sub}){
  return(
    <View style={s.emptyWrap}>
      <Text style={s.emptyEmoji}>{emoji}</Text>
      <Text style={s.emptyHead}>{head}</Text>
      <Text style={s.emptySub}>{sub}</Text>
    </View>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ActivityDetailScreen({navigation,route}){
  const{user}=useAuth();
  const{showSnackbar}=useSnackbar();
  const initialTab=route?.params?.type||"connections";

  const[activeTab,setActiveTab]=useState(initialTab);
  const[connections,setConnections]=useState([]);
  const[posts,setPosts]=useState([]);
  const[savedPosts,setSavedPosts]=useState([]);
  const[isLoading,setIsLoading]=useState(true);
  const[postsSubTab,setPostsSubTab]=useState("posts");
  const[connSearch,setConnSearch]=useState("");
  const[searchFocused,setSearchFocused]=useState(false);
  const[expandedPosts,setExpandedPosts]=useState({});
  const[expandedMeetups,setExpandedMeetups]=useState({});
  const[deleteConfirm,setDeleteConfirm]=useState(null);
  const[deleteBusy,setDeleteBusy]=useState(false);
  const[editOpen,setEditOpen]=useState(false);
  const[editBusy,setEditBusy]=useState(false);
  const[editingItem,setEditingItem]=useState(null);
  const[editForm,setEditForm]=useState({title:"",details:"",category:"General"});
  const[meetupForm,setMeetupForm]=useState({title:"",details:"",maxMembers:"",hometown:"",meetupLocation:"",venue:"",date:new Date(),time:new Date()});
  const[showDatePicker,setShowDatePicker]=useState(false);
  const[showTimePicker,setShowTimePicker]=useState(false);
  const[connMenuTarget,setConnMenuTarget]=useState(null);
  const[connReportTarget,setConnReportTarget]=useState(null);
  const[reportBusy,setReportBusy]=useState(false);
  const connDebounceRef=useRef(null);
  const connSearchIsInit=useRef(true);

  // ── tab switch with LayoutAnimation ──────────────────────────────────────
  const switchTab=(tab)=>{
    if(tab===activeTab)return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  useEffect(()=>{
    setIsLoading(true);
    Promise.all([getMyConnections(),getMyPosts(),getMySavedPosts()]).then(([cR,pR,sR])=>{
      if(cR.success)setConnections(cR.connections||[]);
      if(pR.success)setPosts(pR.posts||[]);
      if(sR.success)setSavedPosts(sR.posts||[]);
      setIsLoading(false);
    });
  },[]);

  useEffect(()=>{
    if(connSearchIsInit.current){connSearchIsInit.current=false;return;}
    if(connDebounceRef.current)clearTimeout(connDebounceRef.current);
    connDebounceRef.current=setTimeout(async()=>{const r=await getMyConnections(connSearch.trim()||undefined);if(r.success)setConnections(r.connections||[]);},connSearch.trim()?350:0);
    return()=>clearTimeout(connDebounceRef.current);
  },[connSearch]);

  const myPosts=useMemo(()=>posts.filter(x=>x.kind!=="Meetup"),[posts]);
  const myMeetups=useMemo(()=>posts.filter(x=>x.kind==="Meetup"),[posts]);
  const activePosts=postsSubTab==="meetups"?myMeetups:myPosts;

  const counts={connections:connections.length,posts:posts.length,saved:savedPosts.length};

  // ── actions ─────────────────────────────────────────────────────────────
  const onRemove=async(id)=>{const r=await removeConnection(id);if(!r.success){showSnackbar(r.message||"Error","error");return;}setConnections(p=>p.filter(x=>x._id!==id));showSnackbar("Connection removed.","success");};
  const handleBlock=(item)=>Alert.alert("Block User",`Block ${item.fullName}?`,[{text:"Cancel",style:"cancel"},{text:"Block",style:"destructive",onPress:async()=>{const r=await blockUser(item._id);if(r.success){setConnections(p=>p.filter(x=>x._id!==item._id));showSnackbar("Blocked.","success");}else showSnackbar(r.message||"Failed","error");}}]);
  const handleReport=async(reason,details)=>{if(!connReportTarget)return;setReportBusy(true);const r=await reportUser(connReportTarget._id,reason,details);setReportBusy(false);if(r.success){setConnReportTarget(null);showSnackbar("Reported.","success");}else showSnackbar(r.message||"Failed","error");};
  const onUnsave=async(id)=>{const r=await toggleSave(id);if(!r.success){showSnackbar(r.message||"Error","error");return;}setSavedPosts(p=>p.filter(x=>x._id!==id));showSnackbar("Removed.","success");};
  const openEdit=(item)=>{setEditingItem(item);if(item.kind==="Meetup"){const td=new Date();if(item.time){const[h,m]=item.time.split(":").map(Number);if(!isNaN(h)){td.setHours(h);td.setMinutes(m||0);}}setMeetupForm({title:item.title||"",details:item.details||"",maxMembers:String(item.maxMembers||""),hometown:item.hometown||"",meetupLocation:item.meetupLocation||item.location||"",venue:item.venue||"",date:item.date?new Date(item.date):new Date(),time:td});}else{setEditForm({title:item.title||"",details:item.details||"",category:item.category||"General"});}setEditOpen(true);};
  const onSaveEdit=async()=>{if(!editingItem)return;const isMeet=editingItem.kind==="Meetup";if(isMeet){if(!meetupForm.title.trim()||!meetupForm.details.trim()){showSnackbar("Title and details required.","info");return;}setEditBusy(true);const h=meetupForm.time.getHours(),m=meetupForm.time.getMinutes();const payload={title:meetupForm.title.trim(),details:meetupForm.details.trim(),maxMembers:Number(meetupForm.maxMembers)||10,hometown:meetupForm.hometown.trim(),meetupLocation:meetupForm.meetupLocation.trim(),venue:meetupForm.venue.trim(),date:meetupForm.date.toISOString(),time:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`};const r=await updateMeetup(editingItem._id,payload);setEditBusy(false);if(!r.success){showSnackbar(r.message||"Failed","error");return;}setPosts(p=>p.map(x=>x._id===editingItem._id?{...x,...payload}:x));}else{if(!editForm.title.trim()||!editForm.details.trim()){showSnackbar("Title and details required.","info");return;}setEditBusy(true);const payload={title:editForm.title.trim(),details:editForm.details.trim(),category:editForm.category};const r=await updatePost(editingItem._id,payload);setEditBusy(false);if(!r.success){showSnackbar(r.message||"Failed","error");return;}setPosts(p=>p.map(x=>x._id===editingItem._id?{...x,...payload}:x));}setEditOpen(false);setEditingItem(null);showSnackbar("Updated.","success");};
  const confirmDelete=async()=>{if(!deleteConfirm)return;setDeleteBusy(true);const r=deleteConfirm.kind==="Meetup"?await deleteMeetup(deleteConfirm._id):await deletePost(deleteConfirm._id);setDeleteBusy(false);if(!r.success){showSnackbar(r.message||"Failed","error");return;}setPosts(p=>p.filter(x=>x._id!==deleteConfirm._id));setDeleteConfirm(null);showSnackbar("Deleted.","success");};
  const tExp=(id)=>{LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);setExpandedPosts(p=>({...p,[id]:!p[id]}));};
  const tExpM=(id)=>{LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);setExpandedMeetups(p=>({...p,[id]:!p[id]}));};

  const isMeetupEdit=editingItem?.kind==="Meetup";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScreenShell
      navigation={navigation}
      routeName="Account"
      noPadding
      noPaddingBottom
      background={C.bg}
      contentContainerStyle={s.screenContent}
      stickyHeaderIndices={[0]}
    >
      {/* ══ CHILD 0: Sticky selector ══ */}
      <View style={s.selectorWrap}>
        <Text style={s.selectorEyebrow}>MY ACTIVITY</Text>
        <View style={s.selectorRow}>
          {[
            {key:"connections",label:"Connections",icon:"people-outline"},
            {key:"posts",      label:"Posts",      icon:"article"       },
            {key:"saved",      label:"Saved",      icon:"bookmark-border"},
          ].map(item=>{
            const active=activeTab===item.key;
            return (
              <Pressable
                key={item.key}
                style={({pressed})=>[s.selectorCard, active&&s.selectorCardActive, pressed&&!active&&{opacity:0.75}]}
                onPress={()=>switchTab(item.key)}
              >
                <MaterialIcons name={item.icon} size={20} color={active?C.white:C.inkMuted}/>
                <Text style={[s.selectorCount, active&&s.selectorCountActive]}>
                  {isLoading?"—":counts[item.key]}
                </Text>
                <Text style={[s.selectorLabel, active&&s.selectorLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ══ CHILD 1: Section content ══ */}
      <View style={s.contentWrap}>

        {/* ── CONNECTIONS ── */}
        {activeTab==="connections"&&(
          <View>
            <View style={s.searchWrap}>
              <View style={[s.searchBox,searchFocused&&s.searchBoxFocused]}>
                <MaterialIcons name="search" size={16} color={searchFocused?C.terra:C.inkMuted}/>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search connections…"
                  placeholderTextColor={C.inkMuted}
                  value={connSearch}
                  onChangeText={setConnSearch}
                  onFocus={()=>setSearchFocused(true)}
                  onBlur={()=>setSearchFocused(false)}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {connSearch.length>0&&<Pressable onPress={()=>setConnSearch("")} hitSlop={8}><MaterialIcons name="close" size={14} color={C.inkMuted}/></Pressable>}
              </View>
            </View>

            {isLoading?(
              <Empty emoji="⏳" head="Loading…" sub="Fetching your connections."/>
            ):connections.length===0?(
              <Empty emoji="🤝" head="No connections yet." sub="Connect with people from your hometown to get started."/>
            ):(
              <View style={s.connFeed}>
                {connections.map((item,idx)=>(
                  <Pressable
                    key={item._id}
                    style={({pressed})=>[s.connRow,idx<connections.length-1&&s.connBorder,pressed&&{backgroundColor:C.inputBg}]}
                    onPress={()=>navigation.navigate("UserProfile",{username:item.username})}
                    activeOpacity={0.8}
                  >
                    <Ava uri={item.profileImageUri} name={item.fullName}/>
                    <View style={{flex:1}}>
                      <Text style={s.connName}>{item.fullName}</Text>
                      <Text style={s.connHandle}>@{item.username}</Text>
                      {(item.hometownCity||item.city)&&(
                        <View style={s.connJourney}>
                          {item.hometownCity?<><View style={s.jDot}/><Text style={s.jFrom}>{item.hometownCity}</Text></>:null}
                          {item.hometownCity&&item.city?<MaterialIcons name="east" size={10} color={C.inkMuted}/>:null}
                          {item.city?<Text style={s.jTo}>{item.city}</Text>:null}
                        </View>
                      )}
                    </View>
                    <Pressable onPress={(e)=>{e.stopPropagation?.();setConnMenuTarget(item);}} style={s.moreBtn} hitSlop={6}>
                      <MaterialIcons name="more-vert" size={18} color={C.inkMuted}/>
                    </Pressable>
                    <Pressable onPress={(e)=>{e.stopPropagation?.();onRemove(item._id);}} style={s.removeBtn}>
                      <Text style={s.removeBtnTxt}>Remove</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── POSTS ── */}
        {activeTab==="posts"&&(
          <View>
            {/* Posts | Meetups pill toggle */}
            <View style={s.postsToggleWrap}>
              <View style={s.postsToggle}>
                {[
                  {key:"posts",  label:`Posts`,   count:myPosts.length  },
                  {key:"meetups",label:`Meetups`,  count:myMeetups.length},
                ].map(tab=>{
                  const active=postsSubTab===tab.key;
                  return(
                    <Pressable
                      key={tab.key}
                      onPress={()=>{LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);setPostsSubTab(tab.key);}}
                      style={[s.postsToggleBtn, active&&s.postsToggleBtnActive]}
                    >
                      <Text style={[s.postsToggleTxt, active&&s.postsToggleTxtActive]}>{tab.label}</Text>
                      <View style={[s.postsToggleBadge, active&&s.postsToggleBadgeActive]}>
                        <Text style={[s.postsToggleBadgeTxt, active&&s.postsToggleBadgeTxtActive]}>{tab.count}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {isLoading?(
              <Empty emoji="⏳" head="Loading…" sub="Fetching your posts."/>
            ):activePosts.length===0?(
              <Empty emoji={postsSubTab==="meetups"?"🗓":"✍️"} head={postsSubTab==="meetups"?"No meetups yet.":"No posts yet."} sub={`Your ${postsSubTab} will appear here once you create them.`}/>
            ):(
              <View style={s.postsFeed}>
                {postsSubTab==="meetups"
                  ?activePosts.map(item=><MeetupCard key={item._id} item={item} expanded={!!expandedMeetups[item._id]} onToggle={()=>tExpM(item._id)} onEdit={()=>openEdit(item)} onDelete={()=>setDeleteConfirm(item)}/>)
                  :activePosts.map(item=><PostCard key={item._id} item={item} user={user} expanded={!!expandedPosts[item._id]} onToggle={()=>tExp(item._id)} onEdit={()=>openEdit(item)} onDelete={()=>setDeleteConfirm(item)}/>)
                }
              </View>
            )}
          </View>
        )}

        {/* ── SAVED ── */}
        {activeTab==="saved"&&(
          isLoading?(
            <Empty emoji="⏳" head="Loading…" sub="Fetching saved posts."/>
          ):savedPosts.length===0?(
            <Empty emoji="🔖" head="Nothing saved yet." sub="Bookmark posts from the feed to save them here."/>
          ):(
            <View style={s.postsFeed}>
              {savedPosts.map(item=>(
                <PostCard key={item._id} item={item} user={user} expanded={!!expandedPosts[item._id]} onToggle={()=>tExp(item._id)} saved onUnsave={()=>onUnsave(item._id)}/>
              ))}
            </View>
          )
        )}

      </View>

      {/* ── Edit Sheet ── */}
      <EditSheet visible={editOpen} title={isMeetupEdit?"Edit Meetup":"Edit Post"} subtitle="Update and save." onClose={()=>{if(editBusy)return;setEditOpen(false);setEditingItem(null);}}>
        {isMeetupEdit?(
          <>
            <Field label="Title" value={meetupForm.title} onChangeText={v=>setMeetupForm(p=>({...p,title:v}))} placeholder="Meetup title…"/>
            <Field label="Description" value={meetupForm.details} onChangeText={v=>setMeetupForm(p=>({...p,details:v}))} placeholder="What's this meetup about?" multiline style={{minHeight:90}}/>
            <Field label="Max Members" value={meetupForm.maxMembers} onChangeText={v=>setMeetupForm(p=>({...p,maxMembers:v}))} placeholder="e.g. 10" keyboardType="number-pad"/>
            <Field label="Target Hometown" value={meetupForm.hometown} onChangeText={v=>setMeetupForm(p=>({...p,hometown:v}))} placeholder="e.g. Patna"/>
            <Field label="Location" value={meetupForm.meetupLocation} onChangeText={v=>setMeetupForm(p=>({...p,meetupLocation:v}))} placeholder="City, State"/>
            <Field label="Venue" value={meetupForm.venue} onChangeText={v=>setMeetupForm(p=>({...p,venue:v}))} placeholder="Venue name"/>
            <View style={s.pickerRow}>
              <View style={[s.fieldWrap,{flex:1}]}>
                <Text style={s.fieldLabel}>DATE</Text>
                <Pressable style={s.pickerBtn} onPress={()=>setShowDatePicker(true)}><MaterialIcons name="event" size={14} color={C.terra}/><Text style={s.pickerBtnTxt}>{fmtDateD(meetupForm.date)}</Text></Pressable>
              </View>
              <View style={[s.fieldWrap,{flex:1}]}>
                <Text style={s.fieldLabel}>TIME</Text>
                <Pressable style={s.pickerBtn} onPress={()=>setShowTimePicker(true)}><MaterialIcons name="schedule" size={14} color={C.terra}/><Text style={s.pickerBtnTxt}>{fmtTimeD(meetupForm.time)}</Text></Pressable>
              </View>
            </View>
            {showDatePicker&&<DateTimePicker value={meetupForm.date} mode="date" minimumDate={new Date()} onChange={(e,d)=>{setShowDatePicker(Platform.OS==="ios");if(d)setMeetupForm(p=>({...p,date:d}));}}/>}
            {showTimePicker&&<DateTimePicker value={meetupForm.time} mode="time" onChange={(e,d)=>{setShowTimePicker(Platform.OS==="ios");if(d)setMeetupForm(p=>({...p,time:d}));}}/>}
          </>
        ):(
          <>
            <Field label="Title" value={editForm.title} onChangeText={v=>setEditForm(p=>({...p,title:v}))} placeholder="Post title"/>
            <Field label="Details" value={editForm.details} onChangeText={v=>setEditForm(p=>({...p,details:v}))} placeholder="Write more details…" multiline style={{minHeight:100}}/>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Category</Text>
              <View style={s.catGrid}>
                {POST_CATEGORIES.map(cat=>{const active=editForm.category===cat;const meta=getCatMeta(cat);return<Pressable key={cat} onPress={()=>setEditForm(p=>({...p,category:cat}))} style={[s.catChip,active&&{backgroundColor:meta.color,borderColor:meta.color}]}><Text style={[s.catChipTxt,{color:active?C.white:meta.color}]}>{cat.split(" / ")[0]}</Text></Pressable>;})}
              </View>
            </View>
          </>
        )}
        <Pressable onPress={onSaveEdit} disabled={editBusy} style={({pressed})=>[s.saveBtn,(pressed||editBusy)&&{opacity:0.82}]}>
          <Text style={s.saveBtnTxt}>{editBusy?"Saving…":"Save Changes"}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={C.white}/>
        </Pressable>
      </EditSheet>

      {/* ── Delete confirm ── */}
      <Modal visible={!!deleteConfirm} transparent animationType="fade" onRequestClose={()=>!deleteBusy&&setDeleteConfirm(null)}>
        <Pressable style={s.confirmOverlay} onPress={()=>!deleteBusy&&setDeleteConfirm(null)}>
          <Pressable style={s.confirmCard} onPress={()=>{}}>
            <View style={s.confirmIconWrap}><MaterialIcons name={deleteConfirm?.kind==="Meetup"?"event-busy":"delete-forever"} size={28} color={C.coral}/></View>
            <Text style={s.confirmTitle}>Delete {deleteConfirm?.kind==="Meetup"?"Meetup":"Post"}?</Text>
            <Text style={s.confirmBody}>This will permanently remove it. This action cannot be undone.</Text>
            <View style={s.confirmPreview}>
              <Text style={s.confirmPrevTitle} numberOfLines={1}>{deleteConfirm?.title}</Text>
              <Text style={s.confirmPrevMeta}>{deleteConfirm?.kind==="Meetup"?"Meetup":deleteConfirm?.category||"Post"}</Text>
            </View>
            <View style={s.confirmBtns}>
              <Pressable style={s.confirmCancel} onPress={()=>setDeleteConfirm(null)} disabled={deleteBusy}><Text style={s.confirmCancelTxt}>Cancel</Text></Pressable>
              <Pressable style={[s.confirmDelete,deleteBusy&&{opacity:0.75}]} onPress={confirmDelete} disabled={deleteBusy}>
                <MaterialIcons name="delete-outline" size={15} color={C.white}/><Text style={s.confirmDeleteTxt}>{deleteBusy?"Deleting…":"Delete"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <UserActionsMenu visible={!!connMenuTarget} onClose={()=>setConnMenuTarget(null)} onBlock={()=>connMenuTarget&&handleBlock(connMenuTarget)} onReport={()=>{setConnReportTarget(connMenuTarget);setConnMenuTarget(null);}}/>
      <ReportSheet visible={!!connReportTarget} onClose={()=>setConnReportTarget(null)} onSubmit={handleReport} userName={connReportTarget?.fullName} busy={reportBusy}/>
    </ScreenShell>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s=StyleSheet.create({
  screenContent:{ paddingHorizontal:0,paddingBottom:120,backgroundColor:C.bg },
  contentWrap:  { paddingBottom:80 },

  // ── Section selector (the key new element) ──
  selectorWrap: {
    backgroundColor:C.surface,
    paddingHorizontal:20,
    paddingTop:20,
    paddingBottom:22,
    borderBottomWidth:1,
    borderBottomColor:C.border,
  },
  selectorEyebrow:{ fontSize:10,fontWeight:"800",color:C.inkMuted,letterSpacing:1.8,marginBottom:6 },
  selectorRow:    { flexDirection:"row",gap:10 },
  selectorCard: {
    flex:1,
    backgroundColor:C.inputBg,
    borderRadius:16,
    paddingVertical:16,
    alignItems:"center",
    gap:6,
    borderWidth:1.5,
    borderColor:C.border,
  },
  selectorCardActive:{
    backgroundColor:C.terra,
    borderColor:C.terra,
    shadowColor:C.terra,
    shadowOffset:{width:0,height:4},
    shadowOpacity:0.28,
    shadowRadius:10,
    elevation:5,
  },
  selectorCount:      { fontSize:26,fontWeight:"900",color:C.inkMid,letterSpacing:-0.5 },
  selectorCountActive:{ color:C.white },
  selectorLabel:      { fontSize:10,fontWeight:"700",color:C.inkMuted,textAlign:"center" },
  selectorLabelActive:{ color:"rgba(255,255,255,0.82)",fontWeight:"700" },

  // ── Search ──
  searchWrap:   { paddingHorizontal:20,paddingVertical:12,backgroundColor:C.surface,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.border },
  searchBox:    { flexDirection:"row",alignItems:"center",gap:8,backgroundColor:C.inputBg,borderRadius:12,borderWidth:1,borderColor:C.border,paddingHorizontal:12,height:42 },
  searchBoxFocused:{ borderColor:C.terra,backgroundColor:C.surface },
  searchInput:  { flex:1,fontSize:14,fontWeight:"500",color:C.ink,padding:0 },

  // ── Posts toggle ──
  postsToggleWrap:{ paddingHorizontal:20,paddingVertical:12,backgroundColor:C.surface,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.border },
  postsToggle:    { flexDirection:"row",backgroundColor:C.inputBg,borderRadius:14,padding:4,gap:4 },
  postsToggleBtn: { flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,paddingVertical:10,borderRadius:11 },
  postsToggleBtnActive:{ backgroundColor:C.surface,shadowColor:C.ink,shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:4,elevation:2 },
  postsToggleTxt:      { fontSize:13,fontWeight:"700",color:C.inkMuted },
  postsToggleTxtActive:{ color:C.ink,fontWeight:"800" },
  postsToggleBadge:    { backgroundColor:C.border,minWidth:18,height:18,borderRadius:9,alignItems:"center",justifyContent:"center",paddingHorizontal:4 },
  postsToggleBadgeActive:{ backgroundColor:C.terraLight },
  postsToggleBadgeTxt:   { fontSize:9,fontWeight:"900",color:C.inkMuted },
  postsToggleBadgeTxtActive:{ color:C.terra },

  // ── Connections ──
  connFeed:    { backgroundColor:C.surface },
  connRow:     { flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:20,paddingVertical:14,backgroundColor:C.surface },
  connBorder:  { borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.divider },
  connName:    { fontSize:14,fontWeight:"700",color:C.ink,letterSpacing:-0.1 },
  connHandle:  { fontSize:11,color:C.inkMuted,fontWeight:"500",marginTop:1 },
  connJourney: { flexDirection:"row",alignItems:"center",gap:4,marginTop:3 },
  jDot:{ width:5,height:5,borderRadius:3,backgroundColor:C.terra },
  jFrom:{ fontSize:11,fontWeight:"600",color:C.terra },
  jTo:  { fontSize:11,fontWeight:"500",color:C.inkMuted },
  moreBtn:     { width:30,height:30,borderRadius:9,backgroundColor:C.inputBg,alignItems:"center",justifyContent:"center",marginRight:2 },
  removeBtn:   { borderWidth:1.5,borderColor:C.coral+"80",backgroundColor:C.coralBg,borderRadius:20,paddingHorizontal:12,paddingVertical:7 },
  removeBtnTxt:{ fontSize:11,fontWeight:"800",color:C.coral },

  // ── Posts feed ──
  postsFeed:{ padding:16,gap:12,paddingBottom:20 },

  // ── Post card ──
  postCard:     { backgroundColor:C.surface,borderRadius:16,padding:16,borderWidth:1,borderColor:C.border,shadowColor:C.ink,shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:8,elevation:2 },
  postTop:      { flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10 },
  postAuthorRow:{ flexDirection:"row",alignItems:"center",gap:10 },
  postAuthorName:{ fontSize:13,fontWeight:"700",color:C.ink },
  postTime:     { fontSize:10,color:C.inkMuted,marginTop:1 },
  postCatLbl:   { fontSize:9,fontWeight:"900",letterSpacing:1.2 },
  postTitle:    { fontFamily:SERIF,fontSize:18,fontWeight:"700",color:C.ink,lineHeight:25,letterSpacing:-0.4,marginBottom:7 },
  postBody:     { fontSize:14,lineHeight:22,color:C.inkMid,marginBottom:6 },
  readMore:     { fontSize:12,fontWeight:"700",color:C.terra,marginBottom:10 },
  postImgWrap:  { width:"100%",aspectRatio:16/9,borderRadius:12,overflow:"hidden",marginTop:10 },
  postImg:      { width:"100%",height:"100%" },
  postStats:    { flexDirection:"row",gap:18,paddingTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.divider,marginTop:10 },
  statItem:     { flexDirection:"row",alignItems:"center",gap:4 },
  statCount:    { fontSize:12,fontWeight:"600",color:C.inkMuted },
  cardActions:  { flexDirection:"row",gap:10,paddingTop:10,marginTop:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.divider },
  btnEdit:      { flexDirection:"row",alignItems:"center",gap:5,borderWidth:1.5,borderColor:C.terra,backgroundColor:C.terraLight,borderRadius:20,paddingHorizontal:14,paddingVertical:8 },
  btnEditTxt:   { fontSize:12,fontWeight:"800",color:C.terra },
  btnDel:       { flexDirection:"row",alignItems:"center",gap:5,borderWidth:1.5,borderColor:C.coral+"80",backgroundColor:C.coralBg,borderRadius:20,paddingHorizontal:14,paddingVertical:8 },
  btnDelTxt:    { fontSize:12,fontWeight:"800",color:C.coral },

  // ── Meetup card ──
  meetCard:    { backgroundColor:C.surface,borderRadius:16,overflow:"hidden",borderWidth:1,borderColor:C.border,shadowColor:C.ink,shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8,elevation:3 },
  meetImgWrap: { height:165,position:"relative" },
  meetImg:     { width:"100%",height:"100%" },
  dateTile:    { position:"absolute",top:12,left:12,backgroundColor:"rgba(255,255,255,0.92)",borderRadius:8,paddingHorizontal:10,paddingVertical:6,alignItems:"center",minWidth:44 },
  dateTileDay: { fontSize:18,fontWeight:"900",color:C.terra,lineHeight:20 },
  dateTileMon: { fontSize:8,fontWeight:"800",color:C.inkMid,letterSpacing:1 },
  spotsBadge:  { position:"absolute",bottom:10,right:10,backgroundColor:"rgba(255,255,255,0.92)",paddingHorizontal:9,paddingVertical:5,borderRadius:8 },
  spotsTxt:    { fontSize:11,fontWeight:"800",color:C.ink },
  meetBody:    { padding:14 },
  meetTopRow:  { flexDirection:"row",alignItems:"center",gap:8,marginBottom:5 },
  meetTime:    { fontSize:10,fontWeight:"800",color:C.inkMuted,letterSpacing:1.2,textTransform:"uppercase" },
  hTag:        { flexDirection:"row",alignItems:"center",gap:4,backgroundColor:C.terraLight,paddingHorizontal:8,paddingVertical:3,borderRadius:10 },
  hDot:        { width:5,height:5,borderRadius:3,backgroundColor:C.terra },
  hTxt:        { fontSize:10,fontWeight:"700",color:C.terra },
  meetTitle:   { fontFamily:SERIF,fontSize:16,fontWeight:"700",color:C.ink,lineHeight:22,marginBottom:5,letterSpacing:-0.3 },
  meetDesc:    { fontSize:13,color:C.inkMuted,lineHeight:19 },
  locPill:     { flexDirection:"row",alignItems:"center",gap:4,alignSelf:"flex-start",backgroundColor:C.catHousingBg,paddingHorizontal:9,paddingVertical:5,borderRadius:8,marginTop:8,marginBottom:10 },
  locTxt:      { fontSize:12,fontWeight:"600",color:C.catHousing },
  meetFooter:  { flexDirection:"row",justifyContent:"space-between",alignItems:"center" },
  meetMembRow: { flexDirection:"row",alignItems:"center",gap:4 },
  meetMembTxt: { fontSize:12,fontWeight:"700",color:C.inkMuted },
  statusBadge: { paddingVertical:5,paddingHorizontal:10,borderRadius:8,backgroundColor:C.catHousingBg },
  statusTxt:   { fontSize:9,fontWeight:"900",color:C.catHousing,letterSpacing:1 },
  statusDone:  { backgroundColor:"#E8F5EE" },
  statusCancel:{ backgroundColor:C.coralBg },

  // ── Empty ──
  emptyWrap: { alignItems:"center",paddingVertical:56,paddingHorizontal:32,gap:10 },
  emptyEmoji:{ fontSize:48,marginBottom:4 },
  emptyHead: { fontFamily:SERIF,fontSize:18,fontWeight:"700",color:C.ink,textAlign:"center" },
  emptySub:  { fontSize:13,color:C.inkMuted,textAlign:"center",lineHeight:20 },

  // ── Sheet ──
  backdrop:   { ...StyleSheet.absoluteFillObject,backgroundColor:"rgba(28,20,16,0.5)" },
  sheetOuter: { flex:1,justifyContent:"flex-end" },
  sheetInner: { maxHeight:"90%",backgroundColor:C.surface,borderTopLeftRadius:28,borderTopRightRadius:28,paddingHorizontal:20,paddingTop:12,shadowColor:C.ink,shadowOffset:{width:0,height:-4},shadowOpacity:0.08,shadowRadius:16,elevation:16 },
  sheetHandle:{ width:36,height:4,borderRadius:2,backgroundColor:C.border,alignSelf:"center",marginBottom:18 },
  sheetHead:  { flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20 },
  sheetTitle: { fontFamily:SERIF,fontSize:20,fontWeight:"700",color:C.ink,letterSpacing:-0.3 },
  sheetSub:   { fontSize:12,color:C.inkMuted,marginTop:4,lineHeight:18 },
  sheetClose: { width:30,height:30,borderRadius:15,backgroundColor:C.inputBg,alignItems:"center",justifyContent:"center" },
  fieldWrap:   { marginBottom:14 },
  fieldLabel:  { fontSize:9,fontWeight:"900",color:C.inkMuted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8 },
  fieldInput:  { minHeight:50,borderRadius:12,backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:C.ink,fontWeight:"500",textAlignVertical:"top" },
  fieldFocused:{ borderColor:C.terra,backgroundColor:C.surface },
  pickerRow:   { flexDirection:"row",gap:12 },
  pickerBtn:   { flexDirection:"row",alignItems:"center",gap:8,minHeight:48,borderRadius:12,backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,paddingHorizontal:14 },
  pickerBtnTxt:{ fontSize:13,color:C.ink,fontWeight:"600" },
  catGrid:     { flexDirection:"row",flexWrap:"wrap",gap:8 },
  catChip:     { paddingHorizontal:12,paddingVertical:8,borderRadius:20,borderWidth:1.5,borderColor:C.border,backgroundColor:C.surface },
  catChipTxt:  { fontSize:11,fontWeight:"700" },
  saveBtn:     { minHeight:52,borderRadius:26,backgroundColor:C.terra,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginTop:8,shadowColor:C.terra,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:10,elevation:4 },
  saveBtnTxt:  { fontSize:15,fontWeight:"800",color:C.white,letterSpacing:0.3 },

  // ── Delete confirm ──
  confirmOverlay:  { flex:1,backgroundColor:"rgba(28,20,16,0.55)",justifyContent:"center",alignItems:"center",padding:28 },
  confirmCard:     { width:"100%",backgroundColor:C.surface,borderRadius:24,padding:28,alignItems:"center",shadowColor:"#000",shadowOffset:{width:0,height:12},shadowOpacity:0.18,shadowRadius:24,elevation:16,borderWidth:1,borderColor:C.border },
  confirmIconWrap: { width:64,height:64,borderRadius:32,backgroundColor:C.coralBg,alignItems:"center",justifyContent:"center",marginBottom:18,borderWidth:1.5,borderColor:C.coral+"40" },
  confirmTitle:    { fontFamily:SERIF,fontSize:20,fontWeight:"700",color:C.ink,marginBottom:8,textAlign:"center" },
  confirmBody:     { fontSize:13,lineHeight:20,color:C.inkMuted,textAlign:"center",marginBottom:18 },
  confirmPreview:  { width:"100%",flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,marginBottom:22 },
  confirmPrevTitle:{ fontSize:13,fontWeight:"700",color:C.ink,flex:1,marginRight:10 },
  confirmPrevMeta: { fontSize:9,fontWeight:"900",color:C.inkMuted,letterSpacing:0.8,textTransform:"uppercase" },
  confirmBtns:     { flexDirection:"row",gap:10,width:"100%" },
  confirmCancel:   { flex:1,height:50,borderRadius:14,backgroundColor:C.inputBg,borderWidth:1.5,borderColor:C.border,alignItems:"center",justifyContent:"center" },
  confirmCancelTxt:{ fontSize:14,fontWeight:"800",color:C.ink },
  confirmDelete:   { flex:1,height:50,borderRadius:14,backgroundColor:C.coral,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:6,shadowColor:C.coral,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8,elevation:4 },
  confirmDeleteTxt:{ fontSize:14,fontWeight:"800",color:C.white },
});
