import { TimeSlot, ITimeSlot } from "../../models/timeSlot.model";
import { readJsonFile } from "./readJson";

export const seedTimeSlots = async (): Promise<void> => {
  console.log("Upserting time slots...");

  try {
    const timeSlotsData = await readJsonFile("timeslot.json");

    if (!timeSlotsData || timeSlotsData.length === 0) {
      console.log("No time slot data found in timeslots.json");
      return;
    }

    const operations = timeSlotsData.map((slot: ITimeSlot) => ({
      updateOne: {
        filter: { periodNumber: slot.periodNumber },
        update: { $set: slot },
        upsert: true,
      },
    }));

    const result = await TimeSlot.bulkWrite(operations);
    console.log(
      `Time slots seeding complete. New: ${result.upsertedCount}, Updated: ${result.modifiedCount}`
    );
  } catch (error: any) {
    console.error(`Error seeding time slots: ${error.message}`);
    throw error;
  }
};
