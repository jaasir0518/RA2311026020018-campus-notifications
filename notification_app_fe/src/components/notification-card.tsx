"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import NewReleasesRoundedIcon from "@mui/icons-material/NewReleasesRounded";
import {
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import type { NotificationItem, RankedNotification } from "@/src/types/notification";

type NotificationCardProps = {
  notification: NotificationItem | RankedNotification;
  viewed: boolean;
  onToggleViewed: (id: string) => void;
  rank?: number;
};

const typeColors = {
  Placement: "#f4b860",
  Result: "#6ec6ff",
  Event: "#39c6b6",
};

export function NotificationCard({
  notification,
  viewed,
  onToggleViewed,
  rank,
}: NotificationCardProps) {
  const isPriority = "priorityScore" in notification;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.4,
        borderRadius: 5,
        border: viewed ? "1px solid rgba(151, 186, 196, 0.12)" : "1px solid rgba(57, 198, 182, 0.34)",
        background: viewed
          ? "rgba(10, 24, 37, 0.76)"
          : "linear-gradient(135deg, rgba(16, 152, 168, 0.22), rgba(244, 184, 96, 0.12))",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: viewed ? "0 16px 36px rgba(0,0,0,0.2)" : "0 22px 44px rgba(8, 54, 59, 0.22)",
        transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: viewed ? "0 20px 40px rgba(0,0,0,0.24)" : "0 24px 50px rgba(8, 54, 59, 0.28)",
          borderColor: viewed ? "rgba(151, 186, 196, 0.22)" : "rgba(126, 225, 212, 0.46)",
        },
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1.2}
          sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            {typeof rank === "number" ? (
              <Chip
                size="small"
                label={`#${rank}`}
                sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "text.primary", fontWeight: 700 }}
              />
            ) : null}
            <Chip
              size="small"
              label={notification.Type}
              sx={{
                bgcolor: `${typeColors[notification.Type]}25`,
                color: typeColors[notification.Type],
                fontWeight: 700,
                border: `1px solid ${typeColors[notification.Type]}40`
              }}
            />
            <Chip
              size="small"
              icon={viewed ? <MarkEmailReadRoundedIcon /> : <NewReleasesRoundedIcon />}
              label={viewed ? "Viewed" : "New"}
              sx={{
                bgcolor: viewed ? "rgba(255,255,255,0.05)" : "rgba(57, 198, 182, 0.16)",
                color: viewed ? "text.secondary" : "#b5fff4",
                border: viewed ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(57, 198, 182, 0.3)",
              }}
            />
          </Stack>
          <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
            <AccessTimeRoundedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">
              {formatTimestamp(notification.Timestamp)}
            </Typography>
          </Stack>
        </Stack>
        <Stack spacing={0.7}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
            {notification.Message}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
            ID: {notification.ID}
          </Typography>
          {isPriority ? (
            <Typography variant="body2" sx={{ color: "secondary.light", fontWeight: 600 }}>
              Priority score: {notification.priorityScore.toFixed(2)}
            </Typography>
          ) : null}
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mt: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            {viewed ? "Already handled in your desk." : "Waiting in the active queue."}
          </Typography>
          <Button
            onClick={() => onToggleViewed(notification.ID)}
            variant={viewed ? "outlined" : "contained"}
            color={viewed ? "inherit" : "primary"}
            sx={{ 
              borderRadius: 999,
              borderColor: viewed ? "rgba(151, 186, 196, 0.24)" : undefined,
              color: viewed ? "text.primary" : undefined
            }}
          >
            {viewed ? "Mark As New" : "Mark Viewed"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
