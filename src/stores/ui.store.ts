import { defineStore } from "pinia"

export const useUIStore = defineStore("ui", {
  state: () => ({
    isNotifyVisible: false,
    notifyMessage: "",
    notifyType: "",
    loading: false,
    progress: {
      target: "",
      loaded: 0,
    },
  }),
  getters: {
    hasMessage: state => state.notifyMessage.length > 0,
  },
  actions: {
    showNotification(
      message: string,
      type: "success" | "error" | "info" = "info",
      duration = 3000,
    ) {
      this.notifyMessage = message
      this.notifyType = type
      this.isNotifyVisible = true

      if (duration > 0) {
        setTimeout(() => {
          this.hideNotification()
        }, duration)
      }
    },
    hideNotification() {
      this.isNotifyVisible = false
      this.notifyMessage = ""
    },
    setLoading(isLoading: boolean) {
      this.loading = isLoading
      if (!isLoading) {
        this.progress.loaded = 0
        this.progress.target = ""
      }
    },
    setLoadingProgress(progress: number, target: string) {
      this.loading = true
      this.progress.loaded = progress
      this.progress.target = target
    },
  },
})
