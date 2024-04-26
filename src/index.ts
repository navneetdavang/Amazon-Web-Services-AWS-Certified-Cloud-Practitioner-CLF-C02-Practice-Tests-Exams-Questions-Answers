import {
	questionAnsExtractFromReadMeFile,
	writeQuestionAnsExtract,
} from './utils';

const main = async () => {
	const questionAnsExtract = await questionAnsExtractFromReadMeFile();
	writeQuestionAnsExtract(questionAnsExtract);
};

main().catch((error) => {
	console.log(`Error: ${error}`);
});
