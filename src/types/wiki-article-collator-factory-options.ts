import { Logger } from "winston";

export type WikiArticleCollatorFactoryOptions = {
  baseUrl?: string;
  token?: string;
  organization?: string;
  project?: string;
  wikiIdentifier?: string;
  titleSuffix?: string;
  logger: Logger;
};
