import apiClient from "../api/apiClient";

export const fetchNotifications = async (type) => {
  try {
    const params = {};
    if (type && type !== "all") params.type = type;
    const response = await apiClient.get("/notifications", { params });
    return {
      success: true,
      notifications: response.data?.notifications || [],
      count: response.data?.count || 0,
    };
  } catch (error) {
    return {
      success: false,
      notifications: [],
      count: 0,
      message: error.response?.data?.message || "Unable to fetch notifications",
    };
  }
};

export const getUnreadNotificationsCount = async () => {
  try {
    const response = await apiClient.get("/notifications/unread-count");
    return { success: true, count: response.data?.count || 0 };
  } catch (error) {
    return {
      success: false,
      count: 0,
      message: error.response?.data?.message || "Unable to fetch unread count",
    };
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const response = await apiClient.put("/notifications/read-all");
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Unable to mark notifications as read",
    };
  }
};