/**
 * Middleware to debug and fix frontend requests
 */
exports.frontendDebug = (req, res, next) => {
  // Log incoming requests from frontend
  console.log(`📱 Frontend Request: ${req.method} ${req.url}`);
  
  // Fix common frontend issues
  if (req.query.customerId === 'undefined') {
    delete req.query.customerId;
    console.log('   ⚠️  Fixed: Removed undefined customerId from query');
  }
  
  if (req.params.id === 'undefined') {
    req.params.id = null;
    console.log('   ⚠️  Fixed: Changed undefined param to null');
  }
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log('   Query params:', req.query);
  }
  
  // Log body for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    console.log('   Request body:', JSON.stringify(req.body, null, 2));
  }
  
  next();
};

/**
 * Response interceptor to ensure consistent API responses
 */
exports.apiResponseFormatter = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Ensure all responses have consistent structure
    const formattedData = {
      success: data.success !== undefined ? data.success : true,
      message: data.message || 'Request successful',
      data: data.data || data,
      timestamp: new Date().toISOString()
    };
    
    // Add pagination if present
    if (data.pagination) {
      formattedData.pagination = data.pagination;
    }
    
    return originalJson.call(this, formattedData);
  };
  
  next();
};