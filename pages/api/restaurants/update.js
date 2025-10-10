
/**
 * Update restaurant
 * POST /api/restaurants/update
 */

import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    await connectDB();

    const { restaurantId, ...updates } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID is required',
      });
    }

    // Find and update restaurant
    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        restaurant[key] = updates[key];
      }
    });

    // Mark modified for nested objects
    if (updates.tables) restaurant.markModified('tables');
    if (updates.waiters) restaurant.markModified('waiters');
    if (updates.settings) restaurant.markModified('settings');

    await restaurant.save();

    return res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      restaurant: restaurant.toObject(),
    });

  } catch (error) {
    console.error('Update restaurant error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to update restaurant',
      details: error.message,
    });
  }
}
