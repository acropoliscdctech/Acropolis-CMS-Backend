import mongoose, { Document, Schema } from "mongoose";

// Interface for type-checking
export interface ITimeSlot extends Document {
  periodNumber: number;
  startTime: string;
  endTime: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    periodNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const TimeSlot = mongoose.model<ITimeSlot>("TimeSlot", TimeSlotSchema);
