const axios = require('axios');
const { sleep } = require('../utils/sleep');

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_API_BASE_URL = (process.env.SPOONACULAR_API_BASE_URL || 'https://api.spoonacular.com/recipes/').replace(/\/+$/, '');

const spoonacularClient = axios.create({
	baseURL: SPOONACULAR_API_BASE_URL,
	timeout: 15000,
});

// Simple in-memory rate limiter state per-service
const rateState = {
	timestamps: [], // epoch ms
	maxRequestsPerMinute: 60,
};

function assertApiKey() {
	if (!SPOONACULAR_API_KEY) {
		const error = new Error('SPOONACULAR_API_KEY is not configured');
		error.status = 500;
		throw error;
	}
}

function ensureRateLimit() {
	const now = Date.now();
	const windowStart = now - 60 * 1000;
	// prune
	rateState.timestamps = rateState.timestamps.filter((t) => t >= windowStart);
	if (rateState.timestamps.length >= rateState.maxRequestsPerMinute) {
		const err = new Error('External API rate limit exceeded (local guard)');
		err.status = 429;
		throw err;
	}
	rateState.timestamps.push(now);
}

async function callWithRetries(fn, args = [], maxRetries = 2) {
	let attempt = 0;
	let backoff = 500;
	while (attempt <= maxRetries) {
		try {
			ensureRateLimit();
			return await fn(...args);
		} catch (err) {
			attempt += 1;
			const status = err.response?.status || err.status;
			// for 429 or 5xx, retry with backoff
			if (attempt > maxRetries || (status && status >= 400 && status < 500 && status !== 429)) {
				const wrapped = new Error(err.response?.data?.message || err.message || 'Spoonacular request failed');
				wrapped.status = status || 502;
				throw wrapped;
			}
			// exponential backoff
			await sleep(backoff);
			backoff *= 2;
		}
	}
}

async function searchRecipes(params = {}) {
	assertApiKey();
	try {
		const fn = async () => {
			const response = await spoonacularClient.get('/complexSearch', {
				params: {
					apiKey: SPOONACULAR_API_KEY,
					addRecipeInformation: true,
					addRecipeNutrition: true,
					number: 20,
					...params,
				},
			});
			return Array.isArray(response.data?.results) ? response.data.results : [];
		};
		return await callWithRetries(fn, []);
	} catch (error) {
		const wrapped = new Error(error.message || 'Failed to fetch Spoonacular recipes');
		wrapped.status = error.status || 502;
		throw wrapped;
	}
}

async function getRecipeInformation(externalId) {
	assertApiKey();
	try {
		const fn = async () => {
			const response = await spoonacularClient.get(`/${externalId}/information`, {
				params: {
					apiKey: SPOONACULAR_API_KEY,
					includeNutrition: true,
				},
			});
			return response.data;
		};
		return await callWithRetries(fn, []);
	} catch (error) {
		const wrapped = new Error(error.message || 'Failed to fetch Spoonacular recipe');
		wrapped.status = error.status || 502;
		throw wrapped;
	}
}

async function getRandomRecipe() {
	assertApiKey();
	try {
		const fn = async () => {
			const response = await spoonacularClient.get('/random', {
				params: {
					apiKey: SPOONACULAR_API_KEY,
					number: 1,
				},
			});
			// Spoonacular returns { recipes: [ ... ] }
			return Array.isArray(response.data?.recipes) && response.data.recipes.length ? response.data.recipes[0] : null;
		};
		return await callWithRetries(fn, []);
	} catch (error) {
		const wrapped = new Error(error.message || 'Failed to fetch random Spoonacular recipe');
		wrapped.status = error.status || 502;
		throw wrapped;
	}
}

module.exports = {
	searchRecipes,
	getRecipeInformation,
	getRandomRecipe,
};