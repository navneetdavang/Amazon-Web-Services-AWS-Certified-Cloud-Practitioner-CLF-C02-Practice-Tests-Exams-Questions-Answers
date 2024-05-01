import 'dotenv/config';

import { OAuth2Client } from 'google-auth-library';
import { chunk } from 'lodash';
import pLimit from 'p-limit';

import { forms, forms_v1 } from '@googleapis/forms';

import { ChoiceType } from './utils/constants';
import {
	questionAnsExtractFromReadMeFile,
	writeQuestionAnsExtract,
} from './utils/extracter';
import { getAuthClient } from './utils/googleClient';
import { QuestionItem } from './utils/interfaces';

const generateQuestionItemPayload = (args: {
	data: QuestionItem[];
}): forms_v1.Schema$Item[] => {
	console.debug('Generating Quiz Paylod...');
	const { data } = args;

	return data.map(
		({
			question: title,
			answers: ans,
			options: opts,
		}): forms_v1.Schema$Item => {
			return {
				title,
				questionItem: {
					question: {
						required: false,
						grading: {
							pointValue: 2,
							correctAnswers: {
								answers: (ans || []).map(
									({ value }): forms_v1.Schema$CorrectAnswer => ({
										value,
									}),
								),
							},
						},
						choiceQuestion: {
							type:
								ans?.length && ans.length > 1
									? ChoiceType.CHECKBOX
									: ChoiceType.RADIO,
							shuffle: true,
							options: (opts || []).map(
								({ value }): forms_v1.Schema$Option => ({
									value,
								}),
							),
						},
					},
				},
			};
		},
	);
};

const createQuiz = async (
	auth: OAuth2Client,
	args: {
		quizTitle: string;
		quizDescription?: string;
		quizDocTitle?: string;
		questions: forms_v1.Schema$Item[];
	},
): Promise<{
	formId: string | null;
	responderUri: string | null;
}> => {
	const {
		quizTitle: title,
		quizDescription: description,
		quizDocTitle: documentTitle,
		questions: questionSet,
	} = args;

	console.debug(`Creating Google Form: ${title}...`);

	const gForms = forms({
		version: 'v1',
		auth,
	});

	try {
		const {
			data: { formId = 'No-formId', responderUri = 'No-URI' },
		} = await gForms.forms.create({
			requestBody: {
				info: {
					title,
					description,
					documentTitle,
				},
			},
		});

		console.debug(`Generated Google Form: ${title}:`, {
			formId,
			responderUri,
		});

		console.debug('Updating form settings to make it quiz...');

		await gForms.forms.batchUpdate({
			formId: formId ?? '',
			requestBody: {
				requests: [
					{
						updateSettings: {
							settings: {
								quizSettings: {
									isQuiz: true,
								},
							},
							updateMask: 'quizSettings.isQuiz',
						},
					},
				],
			},
		});

		console.debug('Updated form to a quiz');

		const limit = pLimit(5);

		console.debug('Adding questions into quiz...');

		const questionSetChunk = chunk(questionSet, 20);

		for (let setIndex = 0; setIndex < questionSetChunk.length; setIndex++) {
			const questionChunks = chunk(questionSetChunk[setIndex], 5);

			console.debug(`Processing the Question Set: ${title}-Set-${setIndex}...`);

			await Promise.all(
				questionChunks.map((questionItems, batchIdx) => {
					try {
						limit(async () => {
							await gForms.forms.batchUpdate({
								formId: formId ?? '',
								requestBody: {
									requests: questionItems.map((item, idx) => ({
										createItem: {
											item,
											location: {
												index: idx,
											},
										},
									})),
								},
							});
							await new Promise((r) => setTimeout(r, time * 1000));
						});

						console.log(
							`Processed batch: ${title}-Set-${setIndex}-Batch-${batchIdx}...`,
						);
					} catch (error) {
						console.error(
							`Error occurred while batchUpdate Batch[${title}-Set-${setIndex}-Batch-${batchIdx}], Error: `,
							error,
						);

						throw error;
					}
				}),
			);

			const time = 13.5;
			console.debug(`Waiting for ${time} seconds...`);
			await new Promise((r) => setTimeout(r, time * 1000));
		}

		console.debug('Questions added into quiz...');

		return { formId, responderUri };
	} catch (error) {
		console.error(
			`Error occurred while creating the Quiz[${title}], Error:`,
			error,
		);
		throw error;
	}
};

const main = async () => {
	const questionAnsExtract = await questionAnsExtractFromReadMeFile();
	writeQuestionAnsExtract(questionAnsExtract);

	const auth = await getAuthClient();

	const paylaod = generateQuestionItemPayload({
		data: Object.values(questionAnsExtract),
	});

	let counter = 0;
	const quizDetails: Record<
		string,
		{
			formId: string | null;
			responderUri: string | null;
		}
	> = {};
	for (const questionSet of chunk(paylaod, 50)) {
		const quiz = `AWS-CCP CLF-02 Mock Quiz-${++counter}`;
		const { formId, responderUri } = await createQuiz(auth, {
			quizTitle: quiz,
			quizDocTitle: quiz,
			questions: questionSet,
		});

		quizDetails[quiz] = {
			responderUri,
			formId,
		};
	}

	console.log('Generated Quiz:', { quizDetails });
};

main().catch((error) => {
	console.error(`Error: ${error.message}`);
});
