export const buildBaseUrl = (
  baseUrl: string,
  organization: string,
  project: string,
  wikiIdentifier: string
): string =>
  `${baseUrl}/${organization}/${project}/_apis/wiki/wikis/${wikiIdentifier}`;
