import { cleanEnv, str } from 'envalid';

export const Env = cleanEnv(process.env, {
	GCP_CLIENT_SCECRETS_JSON_FILENAME: str(),
});
