/**
 * Schedule Model
 * Manages waiter schedules and shifts
 */

import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required'],
    index: true,
  },
  waiterId: {
    type: String,
    required: [true, 'Waiter ID is required'],
    index: true,
  },
  waiterName: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    index: true,
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    index: true,
  },
  type: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'night', 'full-day', 'split'],
    default: 'full-day',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', ''],
    },
    daysOfWeek: [Number], // 0–6 (Sunday–Saturday)
    endDate: Date,
  },
  actualStartTime: Date,
  actualEndTime: Date,
  breakStart: Date,
  breakEnd: Date,
  notes: String,
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
  },
  createdBy: String,
  modifiedBy: String,
}, {
  timestamps: true,
});

// Compound indexes
ScheduleSchema.index({ restaurantId: 1, startTime: 1, endTime: 1 });
ScheduleSchema.index({ restaurantId: 1, waiterId: 1, startTime: 1 });
ScheduleSchema.index({ restaurantId: 1, isActive: 1 });

// Virtual for duration in hours
ScheduleSchema.virtual('durationHours').get(function() {
  if (this.startTime && this.endTime) {
    return (this.endTime - this.startTime) / (1000 * 60 * 60);
  }
  return 0;
});

// Method to check if schedule is currently active
ScheduleSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return (
    this.isActive &&
    this.startTime <= now &&
    this.endTime >= now &&
    this.status === 'in-progress'
  );
};

// Method to start shift
ScheduleSchema.methods.startShift = function() {
  this.status = 'in-progress';
  this.actualStartTime = new Date();
  return this.save();
};

// Method to end shift
ScheduleSchema.methods.endShift = function() {
  this.status = 'completed';
  this.actualEndTime = new Date();
  return this.save();
};

// Method to cancel schedule
ScheduleSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.isActive = false;
  return this.save();
};

// Static method to find active schedules
ScheduleSchema.statics.findActive = function(restaurantId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    restaurantId,
    isActive: true,
    startTime: { $lte: endOfDay },
    endTime: { $gte: startOfDay },
  }).sort({ startTime: 1 });
};

// Static method to find schedules for a waiter
ScheduleSchema.statics.findByWaiter = function(restaurantId, waiterId, startDate, endDate) {
  return this.find({
    restaurantId,
    waiterId,
    startTime: { $gte: startDate, $lte: endDate },
  }).sort({ startTime: 1 });
};

// Static method to check for conflicts
ScheduleSchema.statics.checkConflict = async function(restaurantId, waiterId, startTime, endTime, excludeId = null) {
  const query = {
    restaurantId,
    waiterId,
    isActive: true,
    $or: [
      // New schedule starts during existing schedule
      { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
      // New schedule ends during existing schedule
      { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
      // New schedule completely contains existing schedule
      { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
    ],
  };

  if (excludeId) query._id = { $ne: excludeId };

  const conflicts = await this.find(query);
  return conflicts.length > 0 ? conflicts : null;
};

// Static method to get waiter availability
ScheduleSchema.statics.getWaiterAvailability = async function(restaurantId, date = new Date()) {
  const schedules = await this.findActive(restaurantId, date);

  const availability = {};
  schedules.forEach(schedule => {
    if (!availability[schedule.waiterId]) {
      availability[schedule.waiterId] = {
        waiterName: schedule.waiterName,
        schedules: [],
        totalHours: 0,
      };
    }

    availability[schedule.waiterId].schedules.push({
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      type: schedule.type,
      status: schedule.status,
    });

    availability[schedule.waiterId].totalHours += schedule.durationHours;
  });

  return availability;
};

// ✅ Final export (default, bez connectDB importa)
export default mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
