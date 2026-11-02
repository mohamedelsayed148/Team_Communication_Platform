import apiClient from "./client";

export async function testConnection() {
  try {
    const response = await apiClient.get("/health");

    console.log("API connected successfully:", response.data);
  } catch (error: any) {
    console.log(
      "API connection error:",
      error.response?.status || error.message,
    );
  }
}
