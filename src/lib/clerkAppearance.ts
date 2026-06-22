/** Space Grey & Cobalt theme for Clerk auth UI */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#3861fb",
    colorBackground: "#2a2b2e",
    colorInputBackground: "#323336",
    colorInputText: "#e4e6eb",
    colorText: "#e4e6eb",
    colorTextSecondary: "#8d929b",
    colorDanger: "#ef5b5b",
    borderRadius: "8px",
    fontFamily: "var(--font-sans), Outfit, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: "#323336",
      border: "1px solid rgba(228, 230, 235, 0.08)",
      boxShadow: "0 8px 24px rgba(12, 14, 16, 0.35)",
    },
    formButtonPrimary: {
      backgroundColor: "#3861fb",
      "&:hover": {
        backgroundColor: "#5377fc",
      },
    },
  },
};
