export const stripSpecialCharacters = (str: string): string => {
	str = str.replace(/[.,/\\#!$%?&*;:{}=\-_'"“”~()]/g, ' ');
	return str.replace(/\s{2,}/g, ' ');
};
