"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";

const navigationItems = [
  { href: "/", label: "Live Feed" },
  { href: "/priority", label: "Priority Inbox" },
];

export function SiteShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Box sx={{ minHeight: "100vh", pb: 6 }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(6, 18, 28, 0.76)",
          color: "text.primary",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(151, 186, 196, 0.1)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.16)",
        }}
      >
        <Toolbar sx={{ minHeight: 84, justifyContent: "space-between", gap: 2 }}>
          <Stack spacing={0.2}>
            <Typography variant="overline" sx={{ letterSpacing: "0.28em", color: "secondary.light" }}>
              Campus Notifications
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                background: "linear-gradient(90deg, #f6fbfa, #7ee1d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Signal Desk
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
            {navigationItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                variant={pathname === item.href ? "contained" : "text"}
                color={pathname === item.href ? "primary" : "inherit"}
                sx={{
                  borderRadius: 999,
                  px: 2.4,
                  opacity: pathname === item.href ? 1 : 0.86,
                  color: pathname === item.href ? "#041018" : "text.primary",
                  backgroundColor: pathname === item.href ? undefined : "rgba(255,255,255,0.03)",
                  border: pathname === item.href ? undefined : "1px solid rgba(151, 186, 196, 0.12)",
                  "&:hover": {
                    opacity: 1,
                    backgroundColor: pathname === item.href ? undefined : "rgba(57, 198, 182, 0.08)",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ pt: { xs: 5, md: 7 } }}>
        <Stack
          spacing={2.4}
          className="rise-in"
          sx={{
            mb: 5,
            p: { xs: 3, md: 4.5 },
            borderRadius: 8,
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(10, 24, 37, 0.9) 0%, rgba(11, 31, 46, 0.82) 62%, rgba(19, 50, 55, 0.72) 100%)",
            border: "1px solid rgba(151, 186, 196, 0.14)",
            boxShadow: "0 30px 70px rgba(0, 0, 0, 0.26)",
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at top right, rgba(244, 184, 96, 0.16), transparent 24%), radial-gradient(circle at bottom left, rgba(57, 198, 182, 0.18), transparent 26%)",
              pointerEvents: "none",
            },
          }}
        >
          <Typography variant="overline" sx={{ color: "secondary.light", letterSpacing: "0.26em", position: "relative", zIndex: 1 }}>
            {eyebrow}
          </Typography>
          <Typography
            variant="h1"
            sx={{
              position: "relative",
              zIndex: 1,
              maxWidth: 820,
              fontSize: { xs: "2.9rem", md: "4.8rem" },
              lineHeight: 0.94,
              textShadow: "0 24px 40px rgba(0, 0, 0, 0.28)",
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h6"
            sx={{ maxWidth: 760, color: "text.secondary", lineHeight: 1.7, position: "relative", zIndex: 1 }}
          >
            {description}
          </Typography>
        </Stack>
        {children}
      </Container>
    </Box>
  );
}
