import { Logger } from "winston";
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

export class AzureDevOpsWikiArticleCollatorFactory
  implements DocumentCollatorFactory
{
  private readonly baseUrl: string | undefined;
  private readonly logger: Logger;
  private readonly token: string | undefined;
  private readonly wikiIdentifier: string | undefined;
  private readonly organization: string | undefined;
  private readonly project: string | undefined;
  private readonly titleSuffix: string | undefined;
  public readonly type: string = Constants.DocumentType;

  private constructor(options: WikiArticleCollatorFactoryOptions) {
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.logger = options.logger;
    this.wikiIdentifier = options.wikiIdentifier;
    this.organization = options.organization;
    this.project = options.project;
    this.titleSuffix = options.titleSuffix;
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
    );
    const wikiIdentifier = config.getOptionalString(
      `${Constants.ConfigSectionName}.wikiIdentifier`
    );
    const organization = config.getOptionalString(
      `${Constants.ConfigSectionName}.organization`
    );
    const project = config.getOptionalString(
      `${Constants.ConfigSectionName}.project`
    );
    const titleSuffix = config.getOptionalString(
      `${Constants.ConfigSectionName}.titleSuffix`
    );
    return new AzureDevOpsWikiArticleCollatorFactory({
      ...options,
      baseUrl,
      token,
      wikiIdentifier,
      organization,
      project,
      titleSuffix,
    });
  }

  async getCollator() {
    return Readable.from(this.execute());
  }

  async *execute(): AsyncGenerator<IndexableDocument> {
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
        this.validateSingleConfigurationOptionExists(
          this.wikiIdentifier,
          `${Constants.ConfigSectionName}.wikiIdentifier`
        ),
        this.validateSingleConfigurationOptionExists(
          this.organization,
          `${Constants.ConfigSectionName}.organization`
        ),
        this.validateSingleConfigurationOptionExists(
          this.project,
          `${Constants.ConfigSectionName}.project`
        ),
      ].some((result) => !result)
    ) {
      return;
    }

    const wikiReader = new AzureDevOpsWikiReader(
      this.baseUrl as string,
      this.organization as string,
      this.project as string,
      this.token as string,
      this.wikiIdentifier as string,
      this.logger
    );

    const listOfAllArticles = await wikiReader.getListOfAllWikiPages();
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
            .map((article) => wikiReader.readSingleWikiPage(article.id))
        ))
      );
    }

    const articles = settledPromises.map((p) =>
      p.status === "fulfilled" ? p.value : null
    );

    for (const article of articles) {
      if (article === null || article === undefined) {
        continue;
      }
      const splitPath = article?.path?.split("/");
      const title = splitPath?.[splitPath.length - 1] ?? "Unknown Title";
      yield {
        title: `${title}${this.titleSuffix ?? ""}`,
        location: article?.remoteUrl ?? "",
        text: article?.content ?? "",
      };
    }

    this.logger.info("Done indexing Azure DevOps wiki documents");
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
