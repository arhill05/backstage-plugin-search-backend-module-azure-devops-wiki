import { IndexableDocument } from '@backstage/plugin-search-common';

export interface WikiArticleDocument extends IndexableDocument {
  link: string;
}
