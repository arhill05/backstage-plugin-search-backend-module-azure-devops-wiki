# backstage-plugin-search-backend-module-azure-devops-wiki

This plugin provides the pieces necessary to have Backstage index articles and entries from a wiki in an Azure DevOps project to make them available to search with the Backstage Search feature.

## Prerequisites

- You must have an Azure DevOps project with a wiki present
- You must be using the Backstage Search feature

## Getting started

In the root directory of your Backstage project:

```console
yarn add --cwd packages/backend @mdude2314/backstage-plugin-search-backend-module-azure-devops-wiki
```

Add the necessary configuration for this plugin to your app-config.yaml:

```yaml
# app-config.yaml

azureDevOpsWikiCollator:
  baseUrl: https://my-azure-instance.com  # The URL of your Azure DevOps instance. Required
  token: ${AZURE_TOKEN}                   # The PAT used to authenticate to the Azure DevOps REST API. Required.
  wikis:
    - wikiIdentifier: Wiki-Identifier.wiki    # The identifier of the wiki. This can be found by looking at the URL of the wiki in ADO. It is typically something like '{nameOfWiki}.wiki'. Required.
      organization: MyOrganization            # The name of the organization the wiki is contained in. Required.
      project: MyProject                      # The name of the project the wiki is contained in. Required.
      titleSuffix: " - My Suffix"             # A string to append to the title of articles to make them easier to identify as search results from the wiki. Optional
    - wikiIdentifier: Wiki-Identifier2.wiki
      organization: MyOrganization
      project: MyProject
      titleSuffix: " - Suffix 2"
```

Configure the search plugin to use the pieces from this package:

```typescript
// packages/backend/src/plugins/search.ts
import { AzureDevOpsWikiArticleCollatorFactory } from '@mdude2314/backstage-plugin-search-backend-module-azure-devops-wiki';

...

indexBuilder.addCollator({
  schedule,
  factory: AzureDevOpsWikiArticleCollatorFactory.fromConfig(env.config, {
    logger: env.logger,
  }),
});
```

From here, the collator will begin indexing all articles in the wiki into search. Once the indexing is done, the articles and their content will be searchable via the Backstage search feature.

If there are any errors with indexing the articles, they will be reported in the Backstage logs.