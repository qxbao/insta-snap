export function useTimeFormat() {
  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const formatIntervalTime = (hours: number): string => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const hour = hours % 24;
    if (hour === 0) return `${days}d`;
    return `${days}d ${hour}h`;
  };

  return {
    formatRelativeTime,
    formatDate,
    formatIntervalTime
  };
}