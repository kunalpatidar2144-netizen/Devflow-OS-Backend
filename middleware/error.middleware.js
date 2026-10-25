const errorHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;

  const status = err.status || err.statusCode || (err.name === "ValidationError" ? 400 : 500);
  let message = err.message || "Internal Server Error";
  if (err.code === "LIMIT_FILE_SIZE") message = "Each attachment must be 50 MB or smaller.";
  else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") message = "A note can have at most 10 attachments.";
  else if (err.name === "MulterError") message = err.message;
  else if (err.name === "SyntaxError" && Object.prototype.hasOwnProperty.call(err, "body")) message = "Request body contains invalid JSON.";
  else if (err.code === 11000) message = "A record with these details already exists.";

  if (status >= 500) console.error("API ERROR:", err.message || err);
  return res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal Server Error" : message });
};

export default errorHandler;
