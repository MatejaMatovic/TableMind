
/**
 * Get restaurant details
 * GET /api/restaurants/details?email=user@example.com
 */

import connectDB from '../../../lib/mongodb';
import Restaurant from '../../../models/Restaurant';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    await connectDB();

    const { email, id } = req.query;

    let restaurant;

    if (id) {
      restaurant = await Restaurant.findById(id);
    } else if (email) {
      restaurant = await Restaurant.findOne({ 
        ownerEmail: email.toLowerCase() 
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Email or ID is required',
      });
    }

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    return res.status(200).json({
      success: true,
      restaurant: restaurant.toObject(),
    });

  } catch (error) {
    console.error('Get restaurant details error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to get restaurant details',
      details: error.message,
    });
  }
}
