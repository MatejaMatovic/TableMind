
/**
 * Get waiter Schedules
 * GET /api/schedules/waiter?restaurantId=xxx&waiterId=xxx&date=xxx
 */

import connectDB from '../../lib/mongodb';
import Schedule from '../../models/Schedule';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    await connectDB();

    const { restaurantId, waiterId, date } = req.query;

    if (!restaurantId || !waiterId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID and waiter ID are required',
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    
    // Get Schedules for the specific date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const schedule = await Schedule.findOne({
      restaurantId,
      waiterId,
      isActive: true,
      startTime: { $lte: endOfDay },
      endTime: { $gte: startOfDay },
    });

    return res.status(200).json({
      success: true,
      schedule,
      date: targetDate,
    });

  } catch (error) {
    console.error('Get waiter Schedule error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get waiter schedule',
      details: error.message,
    });
  }
}
