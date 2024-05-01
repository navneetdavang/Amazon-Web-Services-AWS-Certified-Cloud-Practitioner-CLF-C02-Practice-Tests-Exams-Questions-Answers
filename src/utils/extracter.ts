import * as fs from 'fs';
import path from 'path';
import * as readline from 'readline';
import { QuestionItem } from './interfaces';
import { nanoid } from 'nanoid';

const READ_FILE_PATH = `${path.dirname(__dirname)}\\data\\README.md`;
const WRITE_FILE_PATH = 'questionAns.json';

const MatchPattern = {
	QUESTION: /^### /,
	OPTION: /^- \[/,
	ANSWER: /\[x\]/,
};

export const questionAnsExtractFromReadMeFile = async (): Promise<
	Record<string, QuestionItem>
> => {
	const readStream = fs.createReadStream(READ_FILE_PATH);

	readStream.on('open', () =>
		console.log(`Extracting QuestionAns from File: ${READ_FILE_PATH}`),
	);

	const rl = readline.createInterface({
		input: readStream,
		crlfDelay: Infinity,
	});

	const questionRecords: Record<string, QuestionItem> = {};

	let questionId = '';
	for await (const line of rl) {
		// Each line in input.txt will be successively available here as `line`.
		if (line === '') continue;

		// if there is question
		if (line.match(MatchPattern.QUESTION)) {
			const question = line.substring(3).trim();
			questionId = nanoid();

			const qid = `QID-${questionId}`;
			questionRecords[qid] = {
				qid,
				question,
			};
		} else if (line.match(MatchPattern.OPTION)) {
			const option = line.substring(5, line.length - 1).trim();
			const qid = `QID-${questionId}`;

			const optId = `OPT-${nanoid()}`;

			const { options, answers, ...rest } = questionRecords[qid];

			questionRecords[qid] = {
				...rest,
				options: [...(options || []), { optId, value: option }],
				answers: [
					...(answers || []),
					...(line.match(MatchPattern.ANSWER)
						? [{ optId, value: option }]
						: []),
				],
			};
		}
	}
	console.info('Question Statistics: ');
	console.log({
		totalQuestions: Object.keys(questionRecords).length,
		noOfQuestionsWithNoOptions: Object.values(questionRecords)
			.map(({ options }) => options)
			.filter((options) => !options?.length).length,
		noOfQuestionsWithNoAnswer: Object.values(questionRecords)
			.map(({ answers }) => answers)
			.filter((answers) => !answers?.length).length,
		qidOfQuestionsWithNoOptions: Object.values(questionRecords)
			.filter(({ options }) => !options?.length)
			.map(({ qid }) => qid),
		qidOfQuestionsWithNoAnswer: Object.values(questionRecords)
			.filter(({ answers }) => !answers?.length)
			.map(({ qid }) => qid),
	});

	return questionRecords;
};

export const writeQuestionAnsExtract = async (
	extract: Record<string, QuestionItem>,
) => {
	writeJsonFile<QuestionItem>(
		`${path.dirname(path.dirname(__dirname))}\\.out`,
		WRITE_FILE_PATH,
		Object.values(extract),
	);
};

export const writeJsonFile = <T>(
	dirPath: string,
	filePath: string,
	data: T | T[],
) => {
	if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath);

	fs.writeFileSync(`${dirPath}\\${filePath}`, JSON.stringify(data, null, 4));
	console.log(`File Geneated: ${dirPath}\\${filePath}`);
};
