import {
  beforeEach, describe,
  expect,
  it,
  vi
} from "vitest";
import { AzureDevOpsWikiArticleCollatorFactory } from "../src/azure-devops-wiki-article-collator-factory";
import { ConfigReader } from "@backstage/config";

import * as wikiReader from "../src/azure-devops-wiki-reader";
import { getVoidLogger } from "@backstage/backend-common";
import { IndexableDocument } from "@backstage/plugin-search-common";

const mockGetListOfAllWikiPages = vi
  .fn()
  .mockImplementation(() => Promise.resolve([{}, {}]));
const mockReadSingleWikiPage = vi
  .fn()
  .mockImplementation(() => Promise.resolve({}));

const wikiReaderSpy = vi
  .spyOn(wikiReader, "AzureDevOpsWikiReader")
  .mockImplementation(() => {
    return {
      getListOfAllWikiPages: mockGetListOfAllWikiPages,
      readSingleWikiPage: mockReadSingleWikiPage,
    } as unknown as wikiReader.AzureDevOpsWikiReader;
  });

describe("AzureDevOpsWikiArticleCollatorFactory", () => {
  let collator: AzureDevOpsWikiArticleCollatorFactory;
  const logger = getVoidLogger();
  const defaultConfig = {
    azureDevOpsWikiCollator: {
      baseUrl: "a",
      organization: "b",
      project: "c",
      token: "e",
      wikiIdentifier: "f",
    },
  };
  beforeEach(() => {
    collator = AzureDevOpsWikiArticleCollatorFactory.fromConfig(
      new ConfigReader(defaultConfig),
      {
        logger,
      }
    );
  });
  it("should create", () => {
    expect(collator).toBeTruthy();
  });

  it("should log errors when config values are missing", async () => {
    collator = AzureDevOpsWikiArticleCollatorFactory.fromConfig(
      new ConfigReader({}),
      {
        logger,
      }
    );
    const spy = vi.spyOn(logger, "error");
    await collator.execute().next();

    expect(spy).toHaveBeenCalled();
  });

  it("should return something on a happy path", async () => {
    const res = await collator.execute().next();
    expect(res).toBeTruthy();
  });

  it("should not yield anything if no values are successful", async () => {
    mockReadSingleWikiPage.mockRejectedValue({});
    const results: IndexableDocument[] = [];
    for await (const value of collator.execute()) {
      results.push(value);
    }

    expect(results.length).toBe(0);
  });

  it("should call readSingleWikiPage for each article returned from getList", async () => {
    const mockArticleDetails = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockGetListOfAllWikiPages.mockResolvedValue(mockArticleDetails);

    const results: IndexableDocument[] = [];
    for await (const value of collator.execute()) {
      results.push(value);
    }

    expect(mockReadSingleWikiPage).toHaveBeenCalledWith(1);
    expect(mockReadSingleWikiPage).toHaveBeenCalledWith(2);
    expect(mockReadSingleWikiPage).toHaveBeenCalledWith(3);
  });

  it("should yield article for each article returned from getList", async () => {
    const mockArticleDetails = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockGetListOfAllWikiPages.mockResolvedValue(mockArticleDetails);

    const mockValues = [
      {
        path: "path 1",
        remoteUrl: "remote url 1",
        content: "content 1",
      },
      {
        path: "path 2",
        remoteUrl: "remote url 2",
        content: "content 2",
      },
      {
        path: "path 3",
        remoteUrl: "remote url 3",
        content: "content 3",
      },
    ];

    mockReadSingleWikiPage
      .mockReturnValueOnce(mockValues[0])
      .mockReturnValueOnce(mockValues[1])
      .mockReturnValueOnce(mockValues[2]);

    const results: IndexableDocument[] = [];
    for await (const value of collator.execute()) {
      results.push(value);
    }

    expect(results[0]).toEqual({
      title: "path 1",
      location: "remote url 1",
      text: "content 1",
    });
    expect(results[1]).toEqual({
      title: "path 2",
      location: "remote url 2",
      text: "content 2",
    });
    expect(results[2]).toEqual({
      title: "path 3",
      location: "remote url 3",
      text: "content 3",
    });
  });

  it("should set unknown title if article path is not present", async () => {
    const mockArticleDetails = [{ id: 1 }];
    mockGetListOfAllWikiPages.mockResolvedValue(mockArticleDetails);

    const mockValue = {
      path: undefined,
      remoteUrl: "remote url 1",
      content: "content 1",
    };
    mockReadSingleWikiPage.mockReturnValue(mockValue);

    const results: IndexableDocument[] = [];
    for await (const value of collator.execute()) {
      results.push(value);
    }

    expect(results[0]).toEqual({
      title: "Unknown Title",
      location: "remote url 1",
      text: "content 1",
    });
  });

  it("should append titleSuffix to article title if it is present in configuration", async () => {
    collator = AzureDevOpsWikiArticleCollatorFactory.fromConfig(
      new ConfigReader({
        azureDevOpsWikiCollator: {
          ...defaultConfig.azureDevOpsWikiCollator,
          titleSuffix: " - suffix",
        },
      }),
      {
        logger,
      }
    );
    const mockArticleDetails = [{ id: 1 }];
    mockGetListOfAllWikiPages.mockResolvedValue(mockArticleDetails);

    const mockValue = {
      path: "test title",
      remoteUrl: "remote url 1",
      content: "content 1",
    };
    mockReadSingleWikiPage.mockReturnValue(mockValue);

    const results: IndexableDocument[] = [];
    for await (const value of collator.execute()) {
      results.push(value);
    }

    expect(results[0]).toEqual({
      title: "test title - suffix",
      location: "remote url 1",
      text: "content 1",
    });
  });
});
