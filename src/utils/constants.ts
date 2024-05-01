import path from 'path';

export const BASE_DIR = path.dirname(__dirname);

export const GoogleScope = {
	DRIVE: 'https://www.googleapis.com/auth/drive',
};

export enum ChoiceType {
	RADIO = 'RADIO',
	CHECKBOX = 'CHECKBOX',
	DROP_DOWN = 'DROP_DOWN',
}
