"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import { NotificationCard } from "@/src/components/notification-card";
import { logClientEvent } from "@/src/lib/client/logger";
import type { NotificationItem, NotificationType } from "@/src/types/notification";

const VIEWED_STORAGE_KEY = "campus-notifications.viewed";

type Props = {
  initialNotifications: NotificationItem[];
};

export function AllNotificationsPanel({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "All">("All");
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => readViewedIds());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void logClientEvent("info", "page", "feed page open");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: "10",
      page: "1",
    });

    if (typeFilter !== "All") {
      params.set("type", typeFilter);
    }

    startTransition(() => {
      void fetch(`/api/notifications?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Feed request failed");
          }

          const data = (await response.json()) as { notifications: NotificationItem[] };
          setNotifications(data.notifications);
          return logClientEvent("info", "api", `feed sync ${data.notifications.length}`);
        })
        .catch(async () => {
          if (!controller.signal.aborted) {
            await logClientEvent("error", "api", "feed sync fail");
          }
        });
    });

    return () => controller.abort();
  }, [typeFilter]);

  const stats = useMemo(() => {
    const viewedCount = notifications.filter((item) => viewedIds.has(item.ID)).length;
    return {
      total: notifications.length,
      viewed: viewedCount,
      newCount: notifications.length - viewedCount,
    };
  }, [notifications, viewedIds]);

  function toggleViewed(id: string) {
    setViewedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
        void logClientEvent("info", "state", "mark new");
      } else {
        next.add(id);
        void logClientEvent("info", "state", "mark viewed");
      }

      window.localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="glass-panel" sx={{ p: 3, borderRadius: 6, transition: "all 0.3s ease" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" } }}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              All Notifications
            </Typography>
            <Typography color="text.secondary">
              Live campus activity with clear new versus viewed states.
            </Typography>
          </Box>
          <FormControl sx={{ minWidth: 190 }}>
            <InputLabel id="all-type-filter-label">Notification Type</InputLabel>
            <Select
              labelId="all-type-filter-label"
              value={typeFilter}
              label="Notification Type"
              onChange={(event) => {
                const value = event.target.value as NotificationType | "All";
                setTypeFilter(value);
                void logClientEvent("info", "component", `feed type ${value.toLowerCase()}`);
              }}
              sx={{ borderRadius: 3 }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Placement">Placement</MenuItem>
              <MenuItem value="Result">Result</MenuItem>
              <MenuItem value="Event">Event</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {[
          { label: "Loaded", value: stats.total, tone: "rgba(110, 198, 255, 0.12)", border: "rgba(110, 198, 255, 0.24)" },
          { label: "New", value: stats.newCount, tone: "rgba(244, 184, 96, 0.12)", border: "rgba(244, 184, 96, 0.24)" },
          { label: "Viewed", value: stats.viewed, tone: "rgba(57, 198, 182, 0.12)", border: "rgba(57, 198, 182, 0.24)" },
        ].map((item) => (
          <Paper
            key={item.label}
            elevation={0}
            className="glass-panel hover-glow"
            sx={{ flex: 1, p: 2.2, borderRadius: 5, backgroundColor: item.tone, borderColor: item.border, transition: "all 0.3s ease" }}
          >
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600, opacity: 0.8 }}>
              {item.label}
            </Typography>
            <Typography variant="h3" sx={{ mt: 0.4 }}>{item.value}</Typography>
          </Paper>
        ))}
      </Stack>

      {isPending ? (
        <Alert severity="info" sx={{ borderRadius: 4 }}>Refreshing the live feed…</Alert>
      ) : null}

      <Stack spacing={2}>
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.ID}
            notification={notification}
            viewed={viewedIds.has(notification.ID)}
            onToggleViewed={toggleViewed}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function readViewedIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  const saved = window.localStorage.getItem(VIEWED_STORAGE_KEY);

  if (!saved) {
    return new Set<string>();
  }

  try {
    return new Set(JSON.parse(saved) as string[]);
  } catch {
    window.localStorage.removeItem(VIEWED_STORAGE_KEY);
    return new Set<string>();
  }
}
