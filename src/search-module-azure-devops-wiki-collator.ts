import {
  coreServices,
  createBackendModule,
} from "@backstage/backend-plugin-api";
import { searchIndexRegistryExtensionPoint } from "@backstage/plugin-search-backend-node/alpha";

import { AzureDevOpsWikiArticleCollatorFactory } from "./azure-devops-wiki-article-collator-factory";

export const searchModuleAzureDevopsWikiCollator = createBackendModule({
  moduleId: "searchModuleAzureDevopsWikiCollator",
  pluginId: "search",
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
        indexRegistry: searchIndexRegistryExtensionPoint,
      },
      async init({ config, scheduler, logger, indexRegistry }) {
        const defaultSchedule = {
          frequency: { minutes: 10 },
          timeout: { minutes: 15 },
          initialDelay: { seconds: 3 },
        };

        indexRegistry.addCollator({
          schedule: scheduler.createScheduledTaskRunner(defaultSchedule),
          factory: AzureDevOpsWikiArticleCollatorFactory.fromConfig(config, {
            logger,
          }),
        });
      },
    });
  },
});
