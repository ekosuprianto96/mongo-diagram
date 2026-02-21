import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    modal: {
      isOpen: false,
      kind: 'alert',
      title: 'Notice',
      message: '',
      confirmText: 'OK',
      cancelText: 'Cancel',
      inputValue: '',
      inputPlaceholder: '',
      inputRequired: false,
      resolve: null,
    },
    toasts: [],
  }),
  getters: {
    isPackageMode: () => import.meta.env.VITE_MG_DIAGRAM_MODE === 'packages'
  },
  actions: {
    showToast(message, type = 'info', duration = 2600) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.removeToast(id)
      }, duration)
    },
    removeToast(id) {
      this.toasts = this.toasts.filter((toast) => toast.id !== id)
    },
    closeModal() {
      this.modal.isOpen = false
      this.modal.resolve = null
    },
    resolveModal(result) {
      if (typeof this.modal.resolve === 'function') {
        this.modal.resolve(result)
      }
      this.closeModal()
    },
    openAlert({ title = 'Notice', message = '', confirmText = 'OK' } = {}) {
      return new Promise((resolve) => {
        this.modal = {
          ...this.modal,
          isOpen: true,
          kind: 'alert',
          title,
          message,
          confirmText,
          cancelText: 'Cancel',
          inputValue: '',
          inputPlaceholder: '',
          inputRequired: false,
          resolve,
        }
      })
    },
    openConfirm({ title = 'Confirm', message = '', confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
      return new Promise((resolve) => {
        this.modal = {
          ...this.modal,
          isOpen: true,
          kind: 'confirm',
          title,
          message,
          confirmText,
          cancelText,
          inputValue: '',
          inputPlaceholder: '',
          inputRequired: false,
          resolve,
        }
      })
    },
    openPrompt({
      title = 'Input Needed',
      message = '',
      confirmText = 'Save',
      cancelText = 'Cancel',
      placeholder = '',
      value = '',
      required = false,
    } = {}) {
      return new Promise((resolve) => {
        this.modal = {
          ...this.modal,
          isOpen: true,
          kind: 'prompt',
          title,
          message,
          confirmText,
          cancelText,
          inputValue: value,
          inputPlaceholder: placeholder,
          inputRequired: required,
          resolve,
        }
      })
    },
    setModalInputValue(value) {
      this.modal.inputValue = value
    },
  },
})
