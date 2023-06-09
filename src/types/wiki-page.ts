export type WikiPage = {
  id: number;
  gitItemPath: string;
  content: string;
  isNonConformant: boolean;
  isParentPage: boolean;
  order: number;
  path: string;
  remoteUrl: string;
  subPages: WikiPage[];
  url: string;
};
