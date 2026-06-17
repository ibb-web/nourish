const path = require('path')
require('dotenv').config({
	path: path.join(__dirname,'../.env')
});



const app = require('./app');
const { connectDB } = require('./config/db');
const { startNotificationScheduler } = require('./services/notificationSchedulerService');

const PORT = process.env.PORT || 5001;

const retryDBConnection = async () => {
	try {
		await connectDB();
		console.log('MongoDB connected');
	} catch (error) {
		console.error('MongoDB connection failed:', error.message);
		setTimeout(retryDBConnection, 15000);
	}
};

const startServer = async () => {
	try {
		app.listen(PORT, '0.0.0.0', () => {
			console.log(`Server running at http://localhost:${PORT}`);
		});

		startNotificationScheduler();

		retryDBConnection();
	} catch (error) {
		console.error('Server failed to start: ', error.message);
		process.exit(1);
	}
};

startServer(); 
