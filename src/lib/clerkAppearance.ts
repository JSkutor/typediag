/** Space Grey & Cobalt theme for Clerk auth UI */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#4dc6e8",
    colorBackground: "#1e2024",
    colorInputBackground: "#323640",
    colorInputText: "#8ca6b5",
    colorText: "#8ca6b5",
    colorTextOnPrimaryBackground: "#1e2024",
    fontFamily: "var(--font-outfit), system-ui, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: "#262930",
      border: "1px solid rgba(140, 166, 181, 0.08)",
      boxShadow: "0 12px 40px rgba(12, 14, 16, 0.45)",
    },
    headerTitle: { color: "#8ca6b5" },
    headerSubtitle: { color: "#5e697a" },
    formButtonPrimary: {
      backgroundColor: "#4dc6e8",
      "&:hover": {
        backgroundColor: "#6dd4f0",
      },
    },
  },
};
