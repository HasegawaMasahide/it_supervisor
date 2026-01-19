<template>
  <div class="time-slot-picker">
    <h4>時間を選択</h4>
    <!-- ISSUE: Props drilling - 親から多くのpropsを受け取る -->
    <div class="slot-grid">
      <button
        v-for="slot in slots"
        :key="slot.time"
        class="slot-button"
        :class="{ selected: isSelected(slot), disabled: slot.disabled }"
        :disabled="slot.disabled"
        @click="selectSlot(slot)"
      >
        {{ slot.time }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TimeSlotPicker',
  // ISSUE: 過剰なprops（Props drilling）
  props: {
    date: String,
    selectedSlot: Object,
    staffId: Number,
    serviceId: Number,
    duration: Number,
    workingHours: Object,
    breakTimes: Array,
    existingBookings: Array,
    minAdvanceTime: Number,
    maxAdvanceTime: Number,
    slotInterval: Number
  },
  computed: {
    slots() {
      // ISSUE: computedで重い計算
      const slots = [];
      const startHour = this.workingHours?.start || 9;
      const endHour = this.workingHours?.end || 18;
      const interval = this.slotInterval || 30;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let min = 0; min < 60; min += interval) {
          const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          const disabled = this.isSlotDisabled(time);
          slots.push({ time, disabled });
        }
      }
      return slots;
    }
  },
  methods: {
    isSelected(slot) {
      return this.selectedSlot?.time === slot.time;
    },
    isSlotDisabled(time) {
      // 既存の予約をチェック
      if (this.existingBookings) {
        return this.existingBookings.some(b => b.time === time);
      }
      return false;
    },
    selectSlot(slot) {
      if (!slot.disabled) {
        this.$emit('select', slot);
      }
    }
  }
};
</script>

<style scoped>
.time-slot-picker {
  margin: 20px 0;
}
.slot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.slot-button {
  padding: 10px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}
.slot-button:hover:not(.disabled) {
  background: #e8f5e9;
}
.slot-button.selected {
  background: #42b983;
  color: white;
  border-color: #42b983;
}
.slot-button.disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}
</style>
