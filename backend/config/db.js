const mongoose = require("mongoose");

let connectionPromise;

function safeDatabaseError(error) {
  let message = String(error?.message || "Database connection failed");

  message = message.replace(
    /mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi,
    "[database URI redacted]",
  );
  message = message.replace(
    /(password|passwd|pwd)=([^&\s]+)/gi,
    "$1=[redacted]",
  );

  return {
    name: error?.name || "Error",
    code: error?.code,
    message,
  };
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise && mongoose.connection.readyState === 2) {
    return connectionPromise;
  }

  mongoose.set("strictQuery", true);

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI)
    .then((instance) => {
      const connection = instance.connection;

      console.log(`MongoDB connected: ${connection.host}/${connection.name}`);

      return connection;
    })
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
}

connectDB.safeDatabaseError = safeDatabaseError;

module.exports = connectDB;
