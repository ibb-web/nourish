const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
	if (isConnected || mongoose.connection.readyState === 1) {
		return mongoose.connection;
	}

	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error('DATABASE_URL is not defined in .env');
	}

	await mongoose.connect(databaseUrl, {
		serverSelectionTimeoutMS: 10000,
	});
	isConnected = true;

	return mongoose.connection;
};

module.exports = { connectDB };
