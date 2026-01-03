// // src/lib/api.ts
import { toast } from "sonner";

export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> => {
  const authData = JSON.parse(localStorage.getItem("chat_auth") || "{}");
  const token = authData?.token;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type to JSON if we aren't sending FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`http://localhost:8080${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      toast.error("Session expired. Logging out...");
      localStorage.removeItem("chat_auth");
      
      // Redirect to login after a delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return null;
    }

    // 🟢 If the response is NOT ok, return null so the component knows it failed
    if (!response.ok) {
      return null;
    }

    // 🟢 If there is no content (204 No Content), return an empty object or true
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(error);
    return null;
  }
};
