import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import { Grid, Paper, Stack, Typography } from "@mui/material";

import { AllNotificationsPanel } from "@/src/components/all-notifications-panel";
import { PriorityPanel } from "@/src/components/priority-panel";
import { SiteShell } from "@/src/components/site-shell";
import { fetchNotificationsPage, fetchPriorityNotifications } from "@/src/lib/server/evaluation-service";

export async function DashboardPage() {
  const [feedResult, priorityNotifications] = await Promise.all([
    fetchNotificationsPage({ limit: 10, page: 1 }),
    fetchPriorityNotifications({ topN: 10, pages: 4 }),
  ]);

  return (
    <SiteShell
      eyebrow="Stage 2 / Frontend"
      title="A campus signal desk that keeps the noisiest feed readable."
      description="Track every live update, surface the most urgent unread notifications first, and keep visual clutter low on both desktop and mobile."
    >
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            icon: <NotificationsActiveRoundedIcon color="primary" />,
            title: "Live feed",
            description: "Page one of the protected API with type filtering and clear new/viewed state.",
            tone: "rgba(57, 198, 182, 0.12)",
          },
          {
            icon: <TrackChangesRoundedIcon color="secondary" />,
            title: "Priority shortlist",
            description: "Weighted shortlist that blends notification type importance with recency.",
            tone: "rgba(244, 184, 96, 0.12)",
          },
          {
            icon: <TipsAndUpdatesRoundedIcon sx={{ color: "#6ec6ff" }} />,
            title: "Fast triage",
            description: "Cleaner surfaces, stronger status contrast, and readable scanning on smaller screens.",
            tone: "rgba(110, 198, 255, 0.12)",
          },
        ].map((item) => (
          <Grid key={item.title} size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              className="hover-glow"
              sx={{
                p: 3,
                borderRadius: 6,
                backgroundColor: item.tone,
                border: "1px solid rgba(151, 186, 196, 0.14)",
                backdropFilter: "blur(16px)",
                transition: "all 0.3s ease",
              }}
            >
              <Stack spacing={1.2}>
                {item.icon}
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Typography color="text.secondary">{item.description}</Typography>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, xl: 7 }}>
          <AllNotificationsPanel initialNotifications={feedResult.notifications} />
        </Grid>
        <Grid size={{ xs: 12, xl: 5 }}>
          <PriorityPanel initialNotifications={priorityNotifications} compact />
        </Grid>
      </Grid>
    </SiteShell>
  );
}
