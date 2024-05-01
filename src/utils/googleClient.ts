import path from 'path';

import { authenticate } from '@google-cloud/local-auth';
import { OAuth2Client } from 'google-auth-library';

import { BASE_DIR, GoogleScope } from './constants';
import { Env } from './validateEnv';
import { existsSync } from 'fs';

const { GCP_CLIENT_SCECRETS_JSON_FILENAME } = Env;

export const getAuthClient = async (): Promise<OAuth2Client> => {
	const keyfilePath = path.join(
		BASE_DIR,
		'secrets',
		GCP_CLIENT_SCECRETS_JSON_FILENAME,
	);

	if (!existsSync(keyfilePath)) {
		throw new Error(
			`Google Client Key File does not exists on path: ${keyfilePath}`,
		);
	}

	try {
		console.debug('Getting Google Auth Client...');
		return await authenticate({
			keyfilePath,
			scopes: [GoogleScope.DRIVE],
		});
	} catch (error) {
		console.error(
			`Error occurred while getting the Google OAuth2 Client, Error: ${error}`,
		);
		throw error;
	}
};
