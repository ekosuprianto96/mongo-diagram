<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useUiStore } from '../stores/uiStore'

const ui = useUiStore()

const confirmDisabled = computed(() => {
  return ui.modal.kind === 'prompt' && ui.modal.inputRequired && !String(ui.modal.inputValue || '').trim()
})

const onBackdropClick = () => {
  if (ui.modal.kind === 'alert') {
    ui.resolveModal(true)
  } else {
    ui.resolveModal(ui.modal.kind === 'prompt' ? null : false)
  }
}

const onConfirm = () => {
  if (ui.modal.kind === 'prompt') {
    ui.resolveModal(String(ui.modal.inputValue || '').trim())
    return
  }
  ui.resolveModal(true)
}

const onCancel = () => {
  ui.resolveModal(ui.modal.kind === 'prompt' ? null : false)
}
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[120]">
    <div class="absolute top-4 right-4 space-y-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="pointer-events-auto min-w-[260px] max-w-[360px] rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur"
          :class="toast.type === 'error'
            ? 'bg-red-900/40 border-red-700 text-red-200'
            : toast.type === 'success'
              ? 'bg-emerald-900/35 border-emerald-700 text-emerald-200'
              : 'bg-[#1e1e1e]/95 border-gray-700 text-gray-200'"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>

    <div v-if="ui.modal.isOpen" class="pointer-events-auto absolute inset-0 bg-black/50 flex items-center justify-center p-4" @click.self="onBackdropClick">
      <div class="w-full max-w-md rounded-xl border border-gray-700 bg-[#1e1e1e] text-gray-100 shadow-2xl">
        <div class="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h3 class="font-semibold">{{ ui.modal.title }}</h3>
          <button class="rounded p-1 text-gray-400 hover:bg-[#2a2a2a] hover:text-white" @click="onCancel">
            <X :size="16" />
          </button>
        </div>

        <div class="space-y-3 px-4 py-4">
          <p class="text-sm text-gray-300">{{ ui.modal.message }}</p>
          <input
            v-if="ui.modal.kind === 'prompt'"
            :value="ui.modal.inputValue"
            @input="(e) => ui.setModalInputValue(e.target.value)"
            :placeholder="ui.modal.inputPlaceholder"
            class="w-full rounded border border-gray-600 bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            type="text"
            @keydown.enter="!confirmDisabled && onConfirm()"
          />
        </div>

        <div class="flex justify-end gap-2 border-t border-gray-700 px-4 py-3">
          <button
            v-if="ui.modal.kind !== 'alert'"
            class="rounded border border-gray-600 bg-[#2d2d2d] px-3 py-1.5 text-sm text-gray-200 hover:bg-[#3a3a3a]"
            @click="onCancel"
          >
            {{ ui.modal.cancelText }}
          </button>
          <button
            class="rounded border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="confirmDisabled"
            @click="onConfirm"
          >
            {{ ui.modal.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
