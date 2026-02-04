import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

//importing bootstrap
import 'bootstrap/dist/css/bootstrap.min.css';
import { APP_ID, PLUGIN_ID } from './utils/constants';
import {
  compareVersions,
  fetchWithCredentials,
  activateProtectedPlugins,
  handleAuthError
} from './utils/utils';
import { CompatibilityManager } from './utils/compatibility';
import { InteractionRecorder } from './utils/interactionRecorder';
import { activateLoginPlugin } from './plugins/login';
import { Signal } from '@lumino/signaling';
import { RegistrationState } from './utils/interfaces';
import { pushNotebookUpdateServicePlugin} from './plugins/pushNotebookUpdatePlugin';
import { Token} from '@lumino/coreutils'; 

// class and global instance of that class used to emit signals such as expired token to the dashboard panels to update the rendered element
export class AuthSignal {
  private _registrationStateChanged: Signal<this, RegistrationState>;

  constructor() {
    this._registrationStateChanged = new Signal<this, RegistrationState>(this);
  }

  get registrationStateChanged(): Signal<this, RegistrationState> {
    return this._registrationStateChanged;
  }
}
export const authSignal = new AuthSignal();

// to join to the Dashboard Interaction Data logging
export let CURRENT_NOTEBOOK_ID: string | null = null;
export function setCurrentNotebookId(id: string | null): void {
  CURRENT_NOTEBOOK_ID = id;
}

export let ARE_DASHBOARD_PLUGINS_ACTIVATED = false;
export function setDashboardPluginsActivated(value: boolean): void {
  ARE_DASHBOARD_PLUGINS_ACTIVATED = value;
}

const LOCAL_URL = 'http://localhost:1015';
export let BACKEND_API_URL = LOCAL_URL;
export let WEBSOCKET_API_URL = LOCAL_URL;

const activate = (
  app: JupyterFrontEnd,
  factory: IFileBrowserFactory,
  restorer: ILayoutRestorer,
  labShell: ILabShell,
  rendermime: IRenderMimeRegistry,
  settingRegistry: ISettingRegistry
): void => {
  console.log(`JupyterLab extension ${APP_ID} is activated!`);

  const targetVersion = '3.1.0';
  const appNumbers = app.version.match(/[0-9]+/g);

  if (appNumbers && compareVersions(app.version, targetVersion) >= 0) {
    const jupyterVersion = parseInt(appNumbers[0]);

    CompatibilityManager.setJupyterVersion(jupyterVersion).then(async () => {
      // load the necessary settings
      let settings: ISettingRegistry.ISettings | undefined;
      let endpointSettings: ISettingRegistry.ISettings | undefined;

      if (settingRegistry) {
        try {
          // load the settings
          [settings, endpointSettings] = await Promise.all([
            settingRegistry.load(`${APP_ID}:plugin`),
            settingRegistry.load(`${APP_ID}:endpoint`)
          ]);
          onSettingsChanged(settings);
          settings.changed.connect(onSettingsChanged);

          onEndpointChanged(endpointSettings);
          endpointSettings.changed.connect(onEndpointChanged);
        } catch (error) {
          console.error(`${APP_ID}: Failed to load settings.\n${error}`);
        }
      }

      activateLoginPlugin(
        app,
        factory,
        restorer,
        labShell,
        rendermime,
        settings
      );

      // check if the user can login with the tokens stored in localStorage
      fetchWithCredentials(`${BACKEND_API_URL}/jwt/check`)
        .then(loginResponse => {
          if (loginResponse.ok) {
            return loginResponse.json();
          } else {
            throw new Error('Unauthorized user');
          }
        })
        .then(loginJSON => {
          // dispatch the list of authorized notebooks to telemetry and activate the dashboard plugins
          activateProtectedPlugins(
            loginJSON,
            app,
            factory,
            restorer,
            labShell,
            rendermime,
            settings
          );
        })
        .catch(error => {
          handleAuthError();
          console.log(`${APP_ID}: Authentication error, ${error}`);
        });
    });
  } else {
    console.log(
      `${APP_ID}: Use a more recent version of JupyterLab (>=${targetVersion})`
    );
  }

  function onSettingsChanged(settings: ISettingRegistry.ISettings) {
    const commonDashboardSettings = settings.composite.commonDashboardSettings;
    if (commonDashboardSettings) {
      InteractionRecorder.setPermission(
        (commonDashboardSettings as any).dashboardCollection || false
      );
    } else {
      InteractionRecorder.setPermission(
        (settings.default('commonDashboardSettings') as any)
          ?.dashboardCollection || false
      );
    }
  }

  function onEndpointChanged(settings: ISettingRegistry.ISettings) {
    const useLocalBackend = settings.composite.useLocalBackend;
    const backendEndpoint = settings.composite.backendEndpoint;
    if (useLocalBackend) {
      BACKEND_API_URL = LOCAL_URL;
      WEBSOCKET_API_URL = LOCAL_URL;
    } else if (typeof backendEndpoint === 'string') {
      BACKEND_API_URL = backendEndpoint;
      WEBSOCKET_API_URL = backendEndpoint;
    } else {
      // default
      BACKEND_API_URL = LOCAL_URL;
      WEBSOCKET_API_URL = LOCAL_URL;
    }
  }
};

// export const CORE_READY = new Token<boolean>(`${APP_ID}:core-ready`); 

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  requires: [
    IFileBrowserFactory,
    ILayoutRestorer,
    ILabShell,
    IRenderMimeRegistry,
    ISettingRegistry
  ],
  optional: [],
  activate: activate
};

export default [plugin, pushNotebookUpdateServicePlugin]
