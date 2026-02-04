import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export function loadConfig() {
    const config = {
        baseUrl: requireEnv('API_BASE_URL'),
        personNumber: requireEnv('PERSON_NUMBER'),
        bearerToken: process.env.AUTH_BEARER_TOKEN || '',
        cookie: process.env.AUTH_COOKIE || '',
        userAgent: process.env.USER_AGENT || '',
        acceptLanguage: process.env.ACCEPT_LANGUAGE || '',
        origin: process.env.ORIGIN || '',
        referer: process.env.REFERER || '',
        secChUa: process.env.SEC_CH_UA || '',
        secChUaPlatform: process.env.SEC_CH_UA_PLATFORM || '',
        secChUaMobile: process.env.SEC_CH_UA_MOBILE || '',
        secGpc: process.env.SEC_GPC || '',
        extraHeadersRaw: process.env.EXTRA_HEADERS || ''
    };

    if (!config.bearerToken && !config.cookie) {
        throw new Error('Provide AUTH_BEARER_TOKEN or AUTH_COOKIE in .env');
    }

    if (config.extraHeadersRaw) {
        try {
            config.extraHeaders = JSON.parse(config.extraHeadersRaw);
        } catch (err) {
            throw new Error('EXTRA_HEADERS must be valid JSON if provided');
        }
    } else {
        config.extraHeaders = {};
    }

    return config;
}
