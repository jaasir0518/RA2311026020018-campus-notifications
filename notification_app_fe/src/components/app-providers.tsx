"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#39c6b6",
      light: "#7ee1d4",
      dark: "#1098a8",
    },
    secondary: {
      main: "#f4b860",
      light: "#ffd79a",
      dark: "#c88b2f",
    },
    info: {
      main: "#6ec6ff",
    },
    background: {
      default: "transparent",
      paper: "rgba(10, 24, 37, 0.78)",
    },
    text: {
      primary: "#f3f7f6",
      secondary: "#9eb0bb",
    },
    divider: "rgba(151, 186, 196, 0.14)",
  },
  shape: {
    borderRadius: 26,
  },
  typography: {
    fontFamily: "var(--font-body)",
    h1: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      letterSpacing: "-0.05em",
    },
    h2: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h3: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h4: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h5: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "var(--font-display)",
      fontWeight: 600,
    },
    button: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      textTransform: "none",
    },
    overline: {
      fontWeight: 700,
      letterSpacing: "0.18em",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(151, 186, 196, 0.14)",
          backgroundImage: "none",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.34)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "9999px",
          padding: "8px 24px",
          transition: "all 0.3s ease",
          "&.MuiButton-containedPrimary": {
            background: "linear-gradient(135deg, #39c6b6 0%, #1098a8 100%)",
            color: "#041018",
            boxShadow: "0 12px 24px rgba(16, 152, 168, 0.26)",
            "&:hover": {
              boxShadow: "0 16px 32px rgba(16, 152, 168, 0.28)",
              transform: "translateY(-1px)",
            },
          },
          "&.MuiButton-outlinedInherit": {
            borderColor: "rgba(151, 186, 196, 0.24)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: "rgba(8, 23, 35, 0.7)",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(126, 225, 212, 0.42)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#39c6b6",
          },
        },
        notchedOutline: {
          borderColor: "rgba(151, 186, 196, 0.18)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: "1px solid rgba(151, 186, 196, 0.16)",
        },
      },
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
