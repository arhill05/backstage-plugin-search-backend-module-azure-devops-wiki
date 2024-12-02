import { LoggerService } from "@backstage/backend-plugin-api"
import { WikiArticleCollatorOptions } from "./wiki-article-collator-options";
import { ScmIntegrations } from '@backstage/integration'; // prettier-ignore

export type WikiArticleCollatorFactoryOptions = {
  baseUrl?: string;
  token?: string;
  wikis?: WikiArticleCollatorOptions[];
  logger: LoggerService;
  integrations: ScmIntegrations;
};
