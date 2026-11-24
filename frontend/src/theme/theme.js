import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: { mode: "dark", primary: { main: "#D8B45A", light: "#F0D58B", dark: "#A98532", contrastText: "#090A0B" },
    background: { default: "#050607", paper: "#101214" }, text: { primary: "#F4F1E9", secondary: "#A6A6A2" },
    divider: "#303235", success: { main: "#5DAA83" }, error: { main: "#D66C65" } },
  typography: { fontFamily: "'DM Sans', Arial, sans-serif", h1: { fontFamily: "'Barlow Condensed', sans-serif" },
    h2: { fontFamily: "'Barlow Condensed', sans-serif" }, button: { textTransform: "none", fontWeight: 600 } },
  shape: { borderRadius: 8 },
  components: { MuiButton: { styleOverrides: { root: { minHeight: 48, borderRadius: 3, paddingInline: 22 },
    containedPrimary: { color: "#090A0B", "&:hover": { backgroundColor: "#F0D58B", transform: "translateY(-2px)" } } } } }
});