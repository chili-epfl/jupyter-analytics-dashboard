// adapt the app ids in the schema/*.json if this value is changed
export const APP_ID = 'jupyterlab_unianalytics_dashboard';
// A plugin id has to be of the form APP_ID:<schema name without .json>
export const PLUGIN_ID = `${APP_ID}:plugin`;

export const ACCESS_TOKEN_KEY = `${APP_ID}/access_token`;
export const REFRESH_TOKEN_KEY = `${APP_ID}/refresh_token`;
export const DASHBOARD_USERNAME_KEY = `${APP_ID}/dashboard_username`;

export const PAGE_CONTAINER_ELEMENT_ID = 'unianalytics-page-container';

export const TOC_DASHBOARD_RENDER_TIMEOUT = 1000;

export namespace CommandIDs {
  export const dashboardOpenDashboardPlayback = `${APP_ID}:dashboard-open-playback`;

  export const uploadNotebook = `${APP_ID}:dashboard-upload-notebook`;

  export const copyDownloadLink = `${APP_ID}:dashboard-copy-download-link`;

  export const openLogin = `${APP_ID}:dashboard-open-login`;
}

export const visuIconClass = 'jp-icon3';

export const notebookSelector =
  '.jp-DirListing-item[data-file-type="notebook"]';

// notebook metadata field names
const SELECTOR_ID = 'unianalytics';
export namespace Selectors {
  export const notebookId = `${SELECTOR_ID}_notebook_id`;

  export const cellMapping = `${SELECTOR_ID}_cell_mapping`;
}
