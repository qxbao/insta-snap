import { Day, Hour, MaxHour, MaxMinute, Minute } from "../constants/time"

export function useTimeFormat() {
  const formatRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return "Never"

    const now = Date.now()
    const diff = now - timestamp

    const minutes = Math.floor(diff / Minute)
    const hours = Math.floor(diff / Hour)
    const days = Math.floor(diff / Day)

    if (minutes < 1) return "Just now"
    if (minutes < MaxMinute) return `${minutes}m ago`
    if (hours < MaxHour) return `${hours}h ago`
    return `${days}d ago`
  }

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return "Never"
    return new Date(timestamp).toLocaleString()
  }

  const formatIntervalTime = (hours: number): string => {
    if (hours < MaxHour) return `${hours}h`
    const days = Math.floor(hours / MaxHour)
    const hour = hours % MaxHour
    if (hour === 0) return `${days}d`
    return `${days}d ${hour}h`
  }

  return {
    formatRelativeTime,
    formatDate,
    formatIntervalTime,
  }
}
