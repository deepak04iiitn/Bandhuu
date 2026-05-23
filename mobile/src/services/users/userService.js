import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.31.65:5000/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const searchUsers = async (query, page = 1, limit = 5) => {
  if (!query) return { users: [], hasMore: false };
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/users/search`, {
      headers,
      params: { q: query, page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching users:', error?.response?.data || error.message);
    return { users: [], hasMore: false };
  }
};

export const getUserProfile = async (username) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/users/${username}`, {
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error?.response?.data || error.message);
    return null;
  }
};

export const sendConnectionRequest = async (userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${API_BASE_URL}/users/${userId}/connection-request`,
      {},
      { headers }
    );
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to send connection request',
    };
  }
};

export const respondToConnectionRequest = async (userId, action) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${API_BASE_URL}/users/${userId}/connection-request/respond`,
      { action },
      { headers }
    );
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to respond to request',
    };
  }
};

export const getConnectionRequests = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/users/me/connection-requests`, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      incoming: [],
      count: 0,
      message: error?.response?.data?.message || 'Failed to fetch connection requests',
    };
  }
};

export const getUnreadNotificationsCount = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/notifications/unread-count`, { headers });
    return { success: true, count: response.data?.count || 0 };
  } catch (error) {
    return {
      success: false,
      count: 0,
      message: error?.response?.data?.message || 'Failed to fetch unread notifications count',
    };
  }
};

export const getMyConnections = async (q) => {
  try {
    const headers = await getAuthHeaders();
    const params = {};
    if (q?.trim()) params.q = q.trim();
    const response = await axios.get(`${API_BASE_URL}/users/me/connections`, { headers, params });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      connections: [],
      count: 0,
      message: error?.response?.data?.message || 'Failed to fetch connections',
    };
  }
};

export const removeConnection = async (userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE_URL}/users/${userId}/connections`, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to remove connection',
    };
  }
};

export const getMyPosts = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/users/me/posts`, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      posts: [],
      count: 0,
      message: error?.response?.data?.message || 'Failed to fetch your posts',
    };
  }
};

export const getMySavedPosts = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/users/me/saved-posts`, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      posts: [],
      count: 0,
      message: error?.response?.data?.message || 'Failed to fetch saved posts',
    };
  }
};

export const blockUser = async (userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_BASE_URL}/users/${userId}/block`, {}, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to block user',
    };
  }
};

export const unblockUser = async (userId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_BASE_URL}/users/${userId}/block`, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to unblock user',
    };
  }
};

export const reportUser = async (userId, reason, details = '') => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${API_BASE_URL}/users/${userId}/report`,
      { reason, details },
      { headers }
    );
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Failed to report user',
    };
  }
};

export const getMyActivitySummary = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}/users/me/activity-summary`, { headers });
    return { success: true, ...response.data };
  } catch (error) {
    return {
      success: false,
      connections: 0,
      posts: 0,
      savedPosts: 0,
      message: error?.response?.data?.message || 'Failed to fetch activity summary',
    };
  }
};