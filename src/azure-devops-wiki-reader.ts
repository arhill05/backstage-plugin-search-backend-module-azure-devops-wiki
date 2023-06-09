import { Logger } from "winston";
import { WikiPageDetail } from "./types/wiki-page-detail";
import { WikiPage } from "./types/wiki-page";
import { AxiosInstance } from "axios";
import { getAxiosClient } from "./utils/axios-client";
import { buildBaseUrl } from "./utils/build-base-url";

export class AzureDevOpsWikiReader {
  private readonly logger: Logger;
  private readonly axiosClient: AxiosInstance;
  constructor(
    baseUrl: string,
    organization: string,
    project: string,
    token: string,
    wikiIdentifier: string,
    logger: Logger
  ) {
    this.logger = logger;

    this.axiosClient = getAxiosClient(
      buildBaseUrl(baseUrl, organization, project, wikiIdentifier),
      token
    );
  }

  getListOfAllWikiPages = async () => {
    this.logger.info("Retrieving list of all Azure DevOps wiki pages");

    const wikiPageDetails: WikiPageDetail[] = [];

    let hasMorePages = true;
    let continuationToken: string | null = null;

    this.logger.info("Reading ADO wiki pages");

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
        this.logger.info(`Found ${wikiPageDetails.length} pages`);
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
        `Problem reading page with id ${id} - ${err} - ${rawPageContent}`
      );
      throw err;
    }
  };
}
