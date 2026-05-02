import { Grid, Paper, Stack, Typography } from "@mui/material";

import { PriorityPanel } from "@/src/components/priority-panel";
import { SiteShell } from "@/src/components/site-shell";
import { fetchPriorityNotifications } from "@/src/lib/server/evaluation-service";

export async function PriorityPage() {
  const priorityNotifications = await fetchPriorityNotifications({
    topN: 10,
    pages: 6,
  });

  return (
    <SiteShell
      eyebrow="Priority Mode"
      title="A filtered inbox built for moments when every minute matters."
      description="Use the dedicated priority page to expand the shortlist, slice by notification type, and review high-signal updates without losing the broader feed."
    >
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Paper 
            elevation={0} 
            className="glass-panel hover-glow"
            sx={{
              p: 3,
              borderRadius: 6,
              background:
                "linear-gradient(135deg, rgba(10, 24, 37, 0.88) 0%, rgba(19, 42, 47, 0.76) 100%)",
              border: "1px solid rgba(151, 186, 196, 0.14)",
              backdropFilter: "blur(16px)",
              transition: "all 0.3s ease",
            }}
          >
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Why this page exists
              </Typography>
              <Typography color="text.secondary">
                Stage 2 asks for priority notifications on a separate page, with an adjustable top limit and type filter. This space is optimized for exactly that workflow.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      <PriorityPanel initialNotifications={priorityNotifications} />
    </SiteShell>
  );
}
