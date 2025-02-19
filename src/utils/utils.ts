import { NotebookPanel } from '@jupyterlab/notebook';
import {
  ACCESS_TOKEN_KEY,
  APP_ID,
  REFRESH_TOKEN_KEY,
  Selectors
} from './constants';
import { CompatibilityManager } from './compatibility';
import { IDashboardQueryArgs } from '../redux/types';
import {
  ARE_DASHBOARD_PLUGINS_ACTIVATED,
  BACKEND_API_URL,
  authSignal,
  setDashboardPluginsActivated
} from '..';
import { activateUploadNotebookPlugin } from '../plugins/uploadNotebook';
import { activateDashboardPlugins } from '../plugins/dashboards';
import {
  JupyterFrontEnd,
  ILabShell,
  ILayoutRestorer
} from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { RegistrationState } from './interfaces';

export const activateProtectedPlugins = (
  loginJSON: any,
  app: JupyterFrontEnd,
  factory: IFileBrowserFactory,
  restorer: ILayoutRestorer,
  labShell: ILabShell,
  rendermime: IRenderMimeRegistry,
  settings: ISettingRegistry.ISettings | undefined
) => {
  // emit the returned authorized notebooks to know which ones one to disable in telemetry extension
  emitAuthNotebooksToDisableToTelemetry(loginJSON.auth_notebooks);

  if (!ARE_DASHBOARD_PLUGINS_ACTIVATED) {
    activateDashboardPlugins(app, restorer, labShell, settings, rendermime);

    activateUploadNotebookPlugin(app, factory);
    // to avoid the possibility of activating the same plugins more than once
    setDashboardPluginsActivated(true);
  }
};

// handle authorization errors for other plugins
export const handleAuthError = () => {
  // no notebook is authorized for an unauthorized user
  emitAuthNotebooksToDisableToTelemetry([]);
};

export const generateQueryArgsString = (
  queryArgs: IDashboardQueryArgs,
  notebookId: string
) => {
  return (
    // use true for displayRealTime by default when it's not defined
    `displayRealTime=${queryArgs.displayRealTime[notebookId] ?? true}` +
    `${queryArgs.t1ISOString[notebookId] ? '&t1=' + queryArgs.t1ISOString[notebookId] : ''}` +
    `${queryArgs.t2ISOString[notebookId] ? '&t2=' + queryArgs.t2ISOString[notebookId] : ''}` +
    `${queryArgs.sortBy[notebookId] ? '&sortBy=' + queryArgs.sortBy[notebookId] : ''}` +
    `${queryArgs.selectedGroups[notebookId]?.length > 0 ? '&selectedGroups=' + encodeURIComponent(JSON.stringify(queryArgs.selectedGroups[notebookId])) : ''}`
  );
};

// adds the necessary request options to authenticate the user on the protected route (without overwriting the provided options)
export const fetchWithCredentials = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const response = await customFetch(url, options);

  // check if the response indicates an invalid token (e.g., 401 Unauthorized)
  if (response.status === 401) {
    const responseJSON = await response.clone().json();
    // if the token is expired
    if (responseJSON?.status === 'expired_token') {
      // attempt to refresh the token
      const tokenRefreshed = await refreshAccessToken();

      if (tokenRefreshed) {
        // retry the original request with the new access token
        return customFetch(url, options);
      } else {
        console.log(`${APP_ID}: Token refresh failed.`);

        // emit an EXPIREDTOKEN event that can be caught in PanelManager
        authSignal.registrationStateChanged.emit(
          RegistrationState.EXPIREDTOKEN
        );
      }
    }
  }

  return response;
};

const customFetch = async (url: string, options?: RequestInit) => {
  const defaultOptions: RequestInit = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`
    }
  };

  const combinedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options?.headers || {})
    }
  };

  return fetch(url, combinedOptions);
};

// async method that returns true if the access_token was successfully updated with the refresh_token
const refreshAccessToken = async (): Promise<boolean> => {
  const refreshResponse = await fetch(`${BACKEND_API_URL}/jwt/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem(REFRESH_TOKEN_KEY)}`
    }
  });
  if (refreshResponse.ok) {
    const refreshJSON = await refreshResponse.clone().json();
    if (refreshJSON?.access_token) {
      console.log(`${APP_ID}: access token refreshed`);
      localStorage.setItem(ACCESS_TOKEN_KEY, refreshJSON.access_token);
      return true;
    }
  }

  return false;
};

// emit message with the list of auth notebooks to retrieve and know which notebooks to disable in the telemetry extension
export const emitAuthNotebooksToDisableToTelemetry = (
  authNotebooks: string[] | null | undefined
) => {
  window.postMessage(
    {
      identifier: 'unianalytics',
      authNotebooks: authNotebooks || []
    },
    window.origin
  );
};

export const isNotebookValidForVisu = (
  panel: NotebookPanel | null
): boolean => {
  if (panel && !panel.isDisposed && panel.context.isReady) {
    if (
      CompatibilityManager.getMetadataComp(
        panel.context.model,
        Selectors.notebookId
      ) &&
      CompatibilityManager.getMetadataComp(
        panel.context.model,
        Selectors.cellMapping
      )
    ) {
      return true;
    }
  }
  return false;
};

export const areListsEqual = (
  list1: string[] | null | undefined,
  list2: string[] | null | undefined
): boolean => {
  // if any of them is not defined, return not equal
  if (!list1 || !list2) {
    return false;
  }
  // Check if the lengths are equal
  if (list1.length !== list2.length) {
    return false;
  }

  // Check if every element in list1 is equal to the corresponding element in list2
  return list1.every((item, index) => item === list2[index]);
};

// calculates the delay (in ms) to the next full second
export const calculateDelay = () => {
  const now = new Date();
  const milliseconds = now.getMilliseconds();
  const delay = 1000 - milliseconds;
  return delay;
};

export const compareVersions = (version1: string, version2: string): number => {
  // extract numeric parts by splitting at non-digit characters
  const parts1 = version1.split(/[^0-9]+/).map(Number);
  const parts2 = version2.split(/[^0-9]+/).map(Number);

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    const num1 = parts1[i];
    const num2 = parts2[i];

    if (num1 !== num2) {
      return num1 - num2;
    }
  }

  // if all numeric parts are equal, compare the string parts
  const str1 = version1.replace(/[0-9]+/g, '');
  const str2 = version2.replace(/[0-9]+/g, '');

  return str1.localeCompare(str2);
};

export const convertToLocaleString = (date: Date): string => {
  // using the Sweden format, since they use the ISO Format to represent dates as expected by the datetime-local input
  return date.toLocaleString('sv-SE').slice(0, -3); // removing seconds
};

export const convertToCompactLocaleString = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0!
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
};
