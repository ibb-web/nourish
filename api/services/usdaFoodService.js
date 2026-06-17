const axios = require('axios');

const USDA_API_KEY = process.env.USDA_API_KEY;
// Accept either /fdc/v1 or /fdc/v1/food as env input, normalize to /fdc/v1.
const USDA_API_BASE_URL = process.env.USDA_API_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_CANONICAL_BASE_URL = USDA_API_BASE_URL.replace(/\/food\/?$/i, '');

const usdaClient = axios.create({
	baseURL: USDA_API_CANONICAL_BASE_URL,
	timeout: 15000,
});

function assertApiKey() {
	if (!USDA_API_KEY) {
		const error = new Error('USDA_API_KEY is not configured');
		error.status = 500;
		throw error;
	}
}

async function searchFoods(query, pageSize = 10) {
	assertApiKey();

	try {
		// USDA also supports POST /foods/search with a JSON request body.
		const response = await usdaClient.post(
			'/foods/search',
			{
				query,
				pageSize,
			},
			{
				params: {
					api_key: USDA_API_KEY,
				},
			},
		);

		return response.data && Array.isArray(response.data.foods) ? response.data.foods : [];
	} catch (error) {
		const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch USDA foods';
		const wrapped = new Error(message);
		wrapped.status = error.response?.status || 502;
		throw wrapped;
	}
}

async function getFoodByExternalId(externalId) {
	assertApiKey();

	try {
		const response = await usdaClient.get(`/food/${externalId}`, {
			params: { api_key: USDA_API_KEY },
		});
		return response.data;
	} catch (error) {
		const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to fetch USDA food';
		const wrapped = new Error(message);
		wrapped.status = error.response?.status || 502;
		throw wrapped;
	}
}

module.exports = {
	searchFoods,
	getFoodByExternalId,
};