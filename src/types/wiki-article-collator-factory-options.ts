import { Logger } from "winston";
import { WikiArticleCollatorOptions } from "./wiki-article-collator-options";

export type WikiArticleCollatorFactoryOptions = {
  baseUrl?: string;
  token?: string;
  wikis?: WikiArticleCollatorOptions[];
  logger: Logger;
};
