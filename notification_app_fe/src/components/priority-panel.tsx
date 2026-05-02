"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Alert,
  Box,
  Button,
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
import type { NotificationType, RankedNotification } from "@/src/types/notification";

const VIEWED_STORAGE_KEY = "campus-notifications.viewed";

type Props = {
  initialNotifications: RankedNotification[];
  compact?: boolean;
};

export function PriorityPanel({ initialNotifications, compact = false }: Props) {
  const [topN, setTopN] = useState("10");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "All">("All");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => readViewedIds());
  const [isPending, startTransition] = useTransition();
  const deferredTopN = useDeferredValue(topN);
  const deferredTypeFilter = useDeferredValue(typeFilter);

  useEffect(() => {
    void logClientEvent("info", "page", compact ? "priority preview" : "priority page");
  }, [compact]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      topN: deferredTopN,
      pages: compact ? "4" : "6",
    });

    if (deferredTypeFilter !== "All") {
      params.set("type", deferredTypeFilter);
    }

    startTransition(() => {
      void fetch(`/api/priority?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Priority request failed");
          }

          const data = (await response.json()) as { priorityNotifications: RankedNotification[] };
          setNotifications(data.priorityNotifications);
          return logClientEvent("info", "api", `priority sync ${data.priorityNotifications.length}`);
        })
        .catch(async () => {
          if (!controller.signal.aborted) {
            await logClientEvent("error", "api", "priority sync fail");
          }
        });
    });

    return () => controller.abort();
  }, [compact, deferredTopN, deferredTypeFilter]);

  const stats = useMemo(() => {
    const unseen = notifications.filter((item) => !viewedIds.has(item.ID)).length;
    const types = new Set(notifications.map((item) => item.Type));
    return {
      visible: notifications.length,
      unseen,
      categories: types.size,
    };
  }, [notifications, viewedIds]);

  function toggleViewed(id: string) {
    setViewedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      window.localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify([...next]));
      void logClientEvent("info", "state", next.has(id) ? "priority viewed" : "priority new");
      return next;
    });
  }

  return (
    <Stack spacing={3}>
      <Paper elevation={0} className="glass-panel" sx={{ p: 3, borderRadius: 6, transition: "all 0.3s ease" }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", lg: "center" } }}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
              Priority Inbox
            </Typography>
            <Typography color="text.secondary">
              Weighted by notification type and nudged by recency to keep urgent items first.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel id="topn-label">Top N</InputLabel>
              <Select
                labelId="topn-label"
                value={topN}
                label="Top N"
                onChange={(event) => {
                  setTopN(event.target.value);
                  void logClientEvent("info", "component", `topn ${event.target.value}`);
                }}
                sx={{ borderRadius: 3 }}
              >
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="15">15</MenuItem>
                <MenuItem value="20">20</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 170 }}>
              <InputLabel id="priority-type-label">Type Filter</InputLabel>
              <Select
                labelId="priority-type-label"
                value={typeFilter}
                label="Type Filter"
                onChange={(event) => {
                  const value = event.target.value as NotificationType | "All";
                  setTypeFilter(value);
                  void logClientEvent("info", "component", `priority type ${value.toLowerCase()}`);
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
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {[
          { label: "Visible", value: stats.visible, tone: "rgba(110, 198, 255, 0.12)", border: "rgba(110, 198, 255, 0.24)" },
          { label: "Still New", value: stats.unseen, tone: "rgba(244, 184, 96, 0.12)", border: "rgba(244, 184, 96, 0.24)" },
          { label: "Types Active", value: stats.categories, tone: "rgba(57, 198, 182, 0.12)", border: "rgba(57, 198, 182, 0.24)" },
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

      {compact ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
        >
          <Typography color="text.secondary">
            Tight shortlist for the fastest-moving updates.
          </Typography>
          <Button
            component={Link}
            href="/priority"
            endIcon={<TuneRoundedIcon />}
            variant="contained"
            sx={{ borderRadius: 999 }}
          >
            Open Full Priority Desk
          </Button>
        </Stack>
      ) : null}

      {isPending ? (
        <Alert severity="info" sx={{ borderRadius: 4 }}>
          Rebalancing the shortlist…
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {notifications.map((notification, index) => (
          <NotificationCard
            key={notification.ID}
            notification={notification}
            viewed={viewedIds.has(notification.ID)}
            onToggleViewed={toggleViewed}
            rank={index + 1}
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
