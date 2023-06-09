import {
  beforeEach, describe,
  expect,
  it,
  vi
} from "vitest";

import * as axiosClient from "../src/utils/axios-client";
import { AzureDevOpsWikiReader } from "../src/azure-devops-wiki-reader";
import { getVoidLogger } from "@backstage/backend-common";
import { AxiosInstance } from "axios";

const mockGet = vi.fn().mockImplementation(() => Promise.resolve({ data: {} }));
const mockPost = vi
  .fn()
  .mockImplementation(() => Promise.resolve({ data: {} }));
const client = {
  get: mockGet,
  post: mockPost,
} as unknown as AxiosInstance;

vi.spyOn(axiosClient, "getAxiosClient").mockImplementation(() => client);

let wikiReader: AzureDevOpsWikiReader;

describe("AzureDevOpsWikiReader", () => {
  beforeEach(() => {
    wikiReader = new AzureDevOpsWikiReader("", "", "", "", "", getVoidLogger());
  });
  it("should create", () => {
    expect(wikiReader).toBeTruthy();
  });

  describe("getListOfAllWikiPages", () => {
    it("should call pagesBatch to get wiki pages", async () => {
      mockPost.mockImplementation(() =>
        Promise.resolve({ data: { value: [] }, headers: {} })
      );

      await wikiReader.getListOfAllWikiPages();
      expect(mockPost).toHaveBeenCalledWith(
        `/pagesBatch?api-version=6.0-preview.1`,
        "{}"
      );
    });

    it("should call to get wiki pages multiple times until continuation token is no longer present", async () => {
      mockPost
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: { value: [] },
            headers: { "x-ms-continuationtoken": "123" },
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: { value: [] },
            headers: { "x-ms-continuationtoken": "123" },
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            data: { value: [] },
            headers: {},
          })
        );

      await wikiReader.getListOfAllWikiPages();
      expect(mockPost).toHaveBeenCalledTimes(4);
    });

    it("should return data from API call", async () => {
      const mockData = [
        {
          id: 1,
        },
        { id: 2 },
        { id: 3 },
      ];

      mockPost.mockImplementation(() =>
        Promise.resolve({ data: { value: mockData }, headers: {} })
      );

      const result = await wikiReader.getListOfAllWikiPages();

      expect(result).toEqual(mockData);
    });
  });

  describe("readSingleWikiPage", () => {
    it("should return data from API call", async () => {
      const mockData = { path: "123", remoteUrl: "456", content: "789" };
      mockGet.mockImplementation(() => Promise.resolve({ data: mockData }));

      const result = await wikiReader.readSingleWikiPage(1);
      expect(mockGet).toHaveBeenCalledWith(`/pages/1?includeContent=true`);
      expect(result).toEqual(mockData);
    });
  });
});
