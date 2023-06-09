export const convertStringToBase64 = (stringToConvert: string): string =>
  Buffer.from(stringToConvert).toString('base64');
