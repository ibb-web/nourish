const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const validateObjectId = require('./middleware/validateObjectId');

	
;

const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');
const progressRoutes = require('./routes/progressRoutes');
const groceryListRoutes = require('./routes/groceryListRoutes');
const contentRoutes = require('./routes/contentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const emailCampaignRoutes = require('./routes/emailCampaignRoutes');

const app = express();

// CORS: allow frontend origin from env or default to allow all in dev
let frontendOrigin = 'https://nourish-1.onrender.com';
if (frontendOrigin && frontendOrigin !== '*') {
	// normalize: remove trailing slash if present
	frontendOrigin = frontendOrigin.replace(/\/+$/, '');
}
const corsOptions = {
	origin: frontendOrigin,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// simple request logger
app.use((req, res, next) => {
	console.log(req.method, req.path);
	next();
});

// attach optional auth
app.use(auth);

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/meal-plans', mealPlanRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/grocery-lists', groceryListRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email-campaigns', emailCampaignRoutes);

app.get('/', (req, res) => res.status(200).json({ status: 'ok' }));

// API 404 handler
app.use('/api', notFound);

// global error handler
app.use(errorHandler);

module.exports = app;
