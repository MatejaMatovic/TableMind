/**
 * Schedules API
 * GET, POST, PUT, DELETE
 */

import mongoose from 'mongoose';
import connectDB from '../../lib/mongodb';
import Schedule from '../../models/Schedule';

export default async function handler(req, res) {
  await connectDB();

  try {
    if (req.method === 'GET') {
      const { restaurantId } = req.query;

      if (!restaurantId) {
        return res.status(400).json({ error: 'Restaurant ID is required' });
      }

      // ✅ Proveri da li je validan ObjectId
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        console.warn(`⚠️ Invalid restaurantId format: ${restaurantId}`);
        return res.status(400).json({ error: 'Invalid restaurant ID format' });
      }

      const schedules = await Schedule.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      return res.status(200).json({ schedules });
    }

    if (req.method === 'POST') {
      const scheduleData = req.body;

      if (
        !scheduleData.restaurantId ||
        !scheduleData.waiterId ||
        !scheduleData.startTime ||
        !scheduleData.endTime
      ) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // ✅ Ako je restaurantId nevalidan, zaustavi
      if (!mongoose.Types.ObjectId.isValid(scheduleData.restaurantId)) {
        return res.status(400).json({ error: 'Invalid restaurant ID format' });
      }

      const newSchedule = await Schedule.create({
        ...scheduleData,
        restaurantId: new mongoose.Types.ObjectId(scheduleData.restaurantId),
      });

      return res.status(201).json({ schedule: newSchedule });
    }

    if (req.method === 'PUT') {
      const { scheduleId } = req.query;
      const updateData = req.body;

      if (!scheduleId) {
        return res.status(400).json({ error: 'Schedule ID is required' });
      }

      if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
        return res.status(400).json({ error: 'Invalid schedule ID format' });
      }

      const updatedSchedule = await Schedule.findByIdAndUpdate(
        new mongoose.Types.ObjectId(scheduleId),
        updateData,
        { new: true }
      );

      if (!updatedSchedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      return res.status(200).json({ schedule: updatedSchedule });
    }

    if (req.method === 'DELETE') {
      const { scheduleId } = req.query;

      if (!scheduleId) {
        return res.status(400).json({ error: 'Schedule ID is required' });
      }

      if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
        return res.status(400).json({ error: 'Invalid schedule ID format' });
      }

      const deleted = await Schedule.findByIdAndDelete(
        new mongoose.Types.ObjectId(scheduleId)
      );

      if (!deleted) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in schedules API:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
