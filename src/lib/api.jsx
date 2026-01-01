import { toast } from "sonner";

const BASE_URL = "http://localhost:8080";

export const apiFetch = async (endpoint, options = {}) => {
  // 1. Get token from localStorage
  const authData = JSON.parse(localStorage.getItem("chat_auth"));
  const token = authData?.token;

  // 2. Prepare headers
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // 🟢 3. CENTRALIZED 401 HANDLING
    if (response.status === 401) {
      toast.error("Session expired. Logging out...");
      localStorage.removeItem("chat_auth");
      
      // Redirect to login after a delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      
      return null;
    }

    return response;
  } catch (error) {
    console.error("API Fetch Error:", error);
    toast.error("Network error. Please check your connection.");
    throw error;
  }
};