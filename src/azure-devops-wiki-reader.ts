import { Logger } from "winston";
import { WikiPageDetail } from "./types/wiki-page-detail";
import { WikiPage } from "./types/wiki-page";
import { AxiosInstance } from "axios";
import { getAxiosClient } from "./utils/axios-client";
import { buildBaseUrl } from "./utils/build-base-url";

export class AzureDevOpsWikiReader {
  private readonly logger: Logger;
  private readonly axiosClient: AxiosInstance;
  private readonly organization: string;
  private readonly project: string;
  private readonly wikiIdentifier: string;
  public titleSuffix?: string;
  constructor(
    baseUrl: string,
    organization: string,
    project: string,
    token: string,
    wikiIdentifier: string,
    logger: Logger,
    titleSuffix?: string
  ) {
    this.logger = logger;
    this.titleSuffix = titleSuffix;
    this.organization = organization;
    this.project = project;
    this.wikiIdentifier = wikiIdentifier;

    this.axiosClient = getAxiosClient(
      buildBaseUrl(baseUrl, organization, project, wikiIdentifier),
      token
    );
  }

  getListOfAllWikiPages = async () => {
    this.logger.info(
      `Retrieving list of all Azure DevOps wiki pages for wiki ${this.wikiIdentifier} in project ${this.project} in organization ${this.organization}`
    );

    const wikiPageDetails: WikiPageDetail[] = [];

    let hasMorePages = true;
    let continuationToken: string | null = null;

    this.logger.info(`Reading ADO wiki pages from wiki ${this.wikiIdentifier}`);

    while (hasMorePages) {
      const body: any = continuationToken !== null ? { continuationToken } : {};

      const response = await this.axiosClient.post(
        `/pagesBatch?api-version=6.0-preview.1`,
        JSON.stringify(body)
      );

      wikiPageDetails.push(...response.data.value);

      continuationToken = response.headers["x-ms-continuationtoken"];

      if (!continuationToken) {
        hasMorePages = false;
        this.logger.info(
          `Found ${wikiPageDetails.length} pages in wiki ${this.wikiIdentifier} in project ${this.project} in organization ${this.organization}`
        );
      }
    }

    return wikiPageDetails;
  };

  readSingleWikiPage = async (id: number): Promise<WikiPage | undefined> => {
    let rawPageContent;
    try {
      const pageResponse = await this.axiosClient.get(
        `/pages/${id}?includeContent=true`
      );

      rawPageContent = pageResponse.data;
      return rawPageContent;
    } catch (err) {
      this.logger.error(
        `Problem reading page with in wiki ${this.wikiIdentifier} with id ${id} - ${err} - ${rawPageContent}`
      );
      throw err;
    }
  };
}
