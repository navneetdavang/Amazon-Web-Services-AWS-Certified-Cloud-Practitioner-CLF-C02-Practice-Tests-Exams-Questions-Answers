export interface QuestionItem {
	qid: string;
	question?: string;
	options?: OptionItem[];
	answers?: OptionItem[];
}

export interface OptionItem {
	optId: string;
	value: string;
}
