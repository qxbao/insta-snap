import { defineStore } from "pinia"
import type { Component } from "vue"
import { markRaw } from "vue"

interface ModalState {
  isOpen: boolean
  isLoading: boolean
  content: null | Component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>
  actionId: null | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionData: null | any
}

export const useModalStore = defineStore("modal", {
  state: (): ModalState => ({
    isOpen: false,
    isLoading: false,
    content: null as null | Component,
    props: {},
    actionId: null,
    actionData: null,
  }),
  actions: {
    openModal(
      content: Component,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: Record<string, any> = {},
      actionId: string | null = null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionData: any = null,
    ) {
      this.content = markRaw(content)
      this.props = props
      this.isOpen = true
      this.actionId = actionId
      this.actionData = actionData
    },
    closeModal() {
      this.isOpen = false
      this.isLoading = false
      this.content = null
      this.props = {}
      this.actionId = null
      this.actionData = null
    },
    setLoading(isLoading: boolean) {
      this.isLoading = isLoading
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submitAction(data: any) {
      this.actionData = { ...(this.actionData ?? {}), ...data }
    },
  },
})
