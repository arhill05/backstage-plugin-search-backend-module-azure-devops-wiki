import { LoggerService } from "@backstage/backend-plugin-api";
import { Config } from "@backstage/config";
import { Readable } from "stream";
import {
  DocumentCollatorFactory,
  IndexableDocument,
} from "@backstage/plugin-search-common";
import { WikiArticleCollatorFactoryOptions } from "./types/wiki-article-collator-factory-options";
import { AzureDevOpsWikiReader } from "./azure-devops-wiki-reader";
import { WikiPage } from "./types/wiki-page";
import { Constants } from "./constants";
import { WikiArticleCollatorOptions } from "./types/wiki-article-collator-options";
import { DefaultAzureDevOpsCredentialsProvider, ScmIntegrations } from '@backstage/integration'; // prettier-ignore

export class AzureDevOpsWikiArticleCollatorFactory
  implements DocumentCollatorFactory {
  private readonly baseUrl: string | undefined;
  private readonly logger: LoggerService;
  private readonly token: string | undefined;
  private readonly wikis: WikiArticleCollatorOptions[] | undefined;
  public readonly type: string = Constants.DocumentType;
  private readonly integrations: ScmIntegrations

  private constructor(options: WikiArticleCollatorFactoryOptions) {
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.logger = options.logger;
    this.wikis = options.wikis;
    this.integrations = options.integrations
  }

  static fromConfig(
    config: Config,
    options: WikiArticleCollatorFactoryOptions
  ) {
    const baseUrl = config.getOptionalString(
      `${Constants.ConfigSectionName}.baseUrl`
    );
    const token = config.getOptionalString(
      `${Constants.ConfigSectionName}.token`
    ) || '';
    const wikisConfig = config.getOptionalConfigArray(
      `${Constants.ConfigSectionName}.wikis`
    ) ?? [config.getConfig(`${Constants.ConfigSectionName}`)];

    const integrations = ScmIntegrations.fromConfig(config);

    const wikis = wikisConfig?.map((wikiConfig) => {
      return {
        organization: wikiConfig.getOptionalString("organization"),
        project: wikiConfig.getOptionalString("project"),
        wikiIdentifier: wikiConfig.getOptionalString("wikiIdentifier"),
        titleSuffix: wikiConfig.getOptionalString("titleSuffix"),
      };
    });

    return new AzureDevOpsWikiArticleCollatorFactory({
      ...options,
      baseUrl,
      token,
      wikis,
      integrations,
    });
  }

  async getCollator() {
    return Readable.from(this.execute());
  }

  async *execute(): AsyncGenerator<IndexableDocument> {
    if (this.validateNecessaryConfigurationOptions() === false) {
      return;
    }

    const articles: (IndexableDocument | null)[] =
      await this.readAllArticlesFromAllWikis();

    for (const article of articles) {
      if (article === null || article === undefined) {
        continue;
      }
      yield article;
    }

    this.logger.info("Done indexing Azure DevOps wiki documents");
  }

  private validateNecessaryConfigurationOptions(): boolean {
    if (this.wikis === undefined) {
      this.logger.error(`No wikis configured in your app-config.yaml`);
      return false;
    }
    if (
      [
        this.validateSingleConfigurationOptionExists(
          this.baseUrl,
          `${Constants.ConfigSectionName}.baseUrl`
        ),
        this.validateSingleConfigurationOptionExists(
          this.token,
          `${Constants.ConfigSectionName}.token`
        ),
        ...this.wikis.flatMap((wiki, index) => {
          return [
            this.validateSingleConfigurationOptionExists(
              wiki.organization,
              `${Constants.ConfigSectionName}.wikis[${index}].organization`
            ),
            this.validateSingleConfigurationOptionExists(
              wiki.project,
              `${Constants.ConfigSectionName}.wikis[${index}].project`
            ),
            this.validateSingleConfigurationOptionExists(
              wiki.wikiIdentifier,
              `${Constants.ConfigSectionName}.wikis[${index}].wikiIdentifier`
            ),
          ];
        }),
      ].some((result) => !result)
    ) {
      return false;
    }

    return true;
  }

  private async readAllArticlesFromAllWikis(): Promise<
    (IndexableDocument | null)[]
  > {
    const credentialProvider =
      DefaultAzureDevOpsCredentialsProvider.fromIntegrations(this.integrations);

    let wikisWithToken = [];
    const promises: Promise<(IndexableDocument | null)[]>[] = [];

    if (!this.token) {
      for (let wiki of this.wikis as WikiArticleCollatorOptions[]) {
        const credentialsData = await credentialProvider.getCredentials({
          url: `https://dev.azure.com/${wiki.organization}`
        })
        wiki.token = credentialsData?.token
        wikisWithToken.push(wiki);
      }

      wikisWithToken?.forEach((wiki) =>
        promises.push(this.readAllArticlesFromSingleWiki(wiki))
      );
    } else {
      this.wikis?.forEach((wiki) =>
        promises.push(this.readAllArticlesFromSingleWiki(wiki))
      );
    }

    const settledPromises = await Promise.allSettled(promises);
    const fulfilledPromises = settledPromises.filter(
      (p) => p.status === "fulfilled"
    ) as PromiseFulfilledResult<(IndexableDocument | null)[]>[];
    const articles = fulfilledPromises.flatMap((p) => p.value);
    return articles;
  }

  private async readAllArticlesFromSingleWiki(
    wiki: WikiArticleCollatorOptions
  ): Promise<(IndexableDocument | null)[]> {
    const token = wiki.token || this.token;
    const reader = new AzureDevOpsWikiReader(
      this.baseUrl as string,
      wiki.organization as string,
      wiki.project as string,
      token as string,
      wiki.wikiIdentifier as string,
      this.logger,
      wiki.titleSuffix
    );

    const listOfAllArticles = await reader.getListOfAllWikiPages();
    this.logger.info(
      `Indexing ${listOfAllArticles.length} Azure DevOps wiki documents`
    );

    const batchSize = 100;

    let settledPromises: PromiseSettledResult<WikiPage | undefined>[] = [];

    while (listOfAllArticles.length) {
      settledPromises.push(
        ...(await Promise.allSettled(
          listOfAllArticles
            .splice(0, batchSize)
            .map((article) => reader.readSingleWikiPage(article.id))
        ))
      );
    }

    const result = settledPromises
      .map((p) => {
        const article = p.status === "fulfilled" ? p.value : null;
        if (article === null || article === undefined) {
          return null;
        }
        const splitPath = article?.path?.split("/");
        const title = splitPath?.[splitPath.length - 1] ?? "Unknown Title";

        return {
          title: `${title}${reader.titleSuffix ?? ""}`,
          location: article?.remoteUrl ?? "",
          text: article?.content ?? "",
        };
      })
      .filter((article) => article !== null);

    return result;
  }

  private validateSingleConfigurationOptionExists(
    option: string | undefined,
    optionName: string
  ): boolean {
    if (option === undefined) {
      this.logger.error(`No ${optionName} configured in your app-config.yaml`);
      return false;
    }

    return true;
  }
}
