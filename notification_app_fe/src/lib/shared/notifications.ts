import type { NotificationItem, NotificationType, RankedNotification } from "@/src/types/notification";

const TYPE_WEIGHTS: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

export function isNotificationType(value: string | null): value is NotificationType {
  return value === "Placement" || value === "Result" || value === "Event";
}

export function computePriorityNotifications(
  notifications: NotificationItem[],
  topN: number,
): RankedNotification[] {
  const heap = new MinHeap<RankedNotification>((left, right) => compareRankedNotifications(left, right));

  const sortedByRecency = notifications
    .slice()
    .sort((left, right) => Date.parse(right.Timestamp) - Date.parse(left.Timestamp));

  for (const [recencyRank, notification] of sortedByRecency.entries()) {
    const rankedNotification: RankedNotification = {
      ...notification,
      recencyRank,
      priorityScore: scoreNotification(notification, recencyRank),
    };

    if (heap.size() < topN) {
      heap.push(rankedNotification);
      continue;
    }

    const smallest = heap.peek();

    if (smallest && compareRankedNotifications(rankedNotification, smallest) > 0) {
      heap.replaceRoot(rankedNotification);
    }
  }

  return heap.toArray().sort((left, right) => compareRankedNotifications(right, left));
}

function scoreNotification(notification: NotificationItem, recencyRank: number): number {
  const typeWeight = TYPE_WEIGHTS[notification.Type];
  const recencyBonus = Math.max(0, 800 - recencyRank) / 100;
  return typeWeight * 100 + recencyBonus;
}

function compareRankedNotifications(left: RankedNotification, right: RankedNotification): number {
  if (left.priorityScore !== right.priorityScore) {
    return left.priorityScore - right.priorityScore;
  }

  return Date.parse(left.Timestamp) - Date.parse(right.Timestamp);
}

class MinHeap<T> {
  private readonly items: T[] = [];
  private readonly compare: (left: T, right: T) => number;

  constructor(compare: (left: T, right: T) => number) {
    this.compare = compare;
  }

  size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(value: T): void {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  replaceRoot(value: T): void {
    this.items[0] = value;
    this.bubbleDown(0);
  }

  toArray(): T[] {
    return [...this.items];
  }

  private bubbleUp(index: number): void {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.compare(this.items[currentIndex], this.items[parentIndex]) >= 0) {
        break;
      }

      this.swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    let currentIndex = index;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let smallestIndex = currentIndex;

      if (leftIndex < this.items.length && this.compare(this.items[leftIndex], this.items[smallestIndex]) < 0) {
        smallestIndex = leftIndex;
      }

      if (rightIndex < this.items.length && this.compare(this.items[rightIndex], this.items[smallestIndex]) < 0) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === currentIndex) {
        return;
      }

      this.swap(currentIndex, smallestIndex);
      currentIndex = smallestIndex;
    }
  }

  private swap(leftIndex: number, rightIndex: number): void {
    [this.items[leftIndex], this.items[rightIndex]] = [this.items[rightIndex], this.items[leftIndex]];
  }
}
