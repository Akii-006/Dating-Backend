// responseUtil.js

export const sendSuccess = (
  res,
  data = {},
  message = "Request successful",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, error = "Server error", statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: error.message || error,
  });
};
