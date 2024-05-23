import { LoggerService } from "@backstage/backend-plugin-api"
import { WikiArticleCollatorOptions } from "./wiki-article-collator-options";

export type WikiArticleCollatorFactoryOptions = {
  baseUrl?: string;
  token?: string;
  wikis?: WikiArticleCollatorOptions[];
  logger: LoggerService;
};
