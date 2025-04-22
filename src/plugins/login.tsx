import {
  CommandIDs,
  APP_ID,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  DASHBOARD_USERNAME_KEY
} from '../utils/constants';
import React, { useState } from 'react';
import { showDialog } from '@jupyterlab/apputils';
import { BACKEND_API_URL } from '..';
import { analyticsLoginIcon } from '../icons';
import { Button, Form, Spinner } from 'react-bootstrap';
import { activateProtectedPlugins } from '../utils/utils';
import {
  JupyterFrontEnd,
  ILabShell,
  ILayoutRestorer
} from '@jupyterlab/application';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { BoxArrowUpRight } from 'react-bootstrap-icons';

const LoginDialogBox = (props: {
  app: JupyterFrontEnd;
  factory: IFileBrowserFactory;
  restorer: ILayoutRestorer;
  labShell: ILabShell;
  rendermime: IRenderMimeRegistry;
  settings: ISettingRegistry.ISettings | undefined;
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginResponse, setLoginResponse] = useState<{
    text: string;
    isSuccess: boolean;
  }>({ text: '', isSuccess: false });

  const handleLoginClick = () => {
    setLoading(true);
    const postedUsername = username;
    fetch(`${BACKEND_API_URL}/jwt/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: postedUsername,
        password
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(async loginResponse => {
        // parse the JSON no matter the response status
        const loginJSON = await loginResponse.json();
        return { responseOk: loginResponse.ok, loginJSON: loginJSON };
      })
      .then(({ responseOk, loginJSON }) => {
        setLoading(false);
        if (responseOk) {
          // save the tokens
          localStorage.setItem(ACCESS_TOKEN_KEY, loginJSON.access_token);
          localStorage.setItem(REFRESH_TOKEN_KEY, loginJSON.refresh_token);
          localStorage.setItem(DASHBOARD_USERNAME_KEY, postedUsername);

          // dispatch the list of authorized notebooks to telemetry and activate the dashboard plugins
          activateProtectedPlugins(
            loginJSON,
            props.app,
            props.factory,
            props.restorer,
            props.labShell,
            props.rendermime,
            props.settings
          );
          setLoginResponse({
            text: 'Login successful: dashboards activated.',
            isSuccess: true
          });
        } else {
          setLoginResponse({
            text: `Login failed: ${loginJSON.error || 'Unknown reason'}.`,
            isSuccess: false
          });
        }
      })
      .catch(error => {
        setLoading(false);
        console.error(`${APP_ID}: Login error, ${error}`);
        setLoginResponse({
          text: `${error}`,
          isSuccess: false
        });
      });
  };

  return (
    <div className="dashboard-loginbox-content">
      <Form>
        <Form.Group controlId="formUsername">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
          />
        </Form.Group>
        <Form.Group
          controlId="formPassword"
          className="dashboard-loginbox-password-group"
        >
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </Form.Group>
        <Button
          variant="primary"
          type="submit"
          onClick={handleLoginClick}
          disabled={!username || !password || loading}
          className="dashboard-loginbox-btn"
        >
          Log In
        </Button>
      </Form>
      <div className="dashboard-loginbox-signup">
        <a
          href={`${BACKEND_API_URL}/jwt/signup`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Not registered? Sign up
          <BoxArrowUpRight className="dashboard-loginbox-signup-icon" />
        </a>
      </div>
      <div className="dashboard-loginbox-current-username">
        {`Current User: ${localStorage.getItem(DASHBOARD_USERNAME_KEY)}`}
      </div>
      <div className="dashboard-loginbox-response-container">
        {loading ? (
          <div className="dashboard-loginbox-spinner-container">
            <Spinner
              animation="border"
              role="status"
              variant="primary"
              className="dashboard-loginbox-spinner"
            />
          </div>
        ) : (
          <div
            className={`dashboard-loginbox-response ${!loginResponse.isSuccess ? 'dashboard-loginbox-error-text' : ''}`}
          >
            {loginResponse.text}
          </div>
        )}
      </div>
    </div>
  );
};

export function activateLoginPlugin(
  app: JupyterFrontEnd,
  factory: IFileBrowserFactory,
  restorer: ILayoutRestorer,
  labShell: ILabShell,
  rendermime: IRenderMimeRegistry,
  settings: ISettingRegistry.ISettings | undefined
) {
  console.log(`JupyterLab extension ${APP_ID}: login plugin is activated!`);

  app.commands.addCommand(CommandIDs.openLogin, {
    label: 'Login to Access Unianalytics Dashboards',
    icon: analyticsLoginIcon,
    execute: args => {
      showDialog({
        title: (
          <div className="dashboard-loginbox-title-container">
            <div className="dashboard-loginbox-icon-container">
              <analyticsLoginIcon.react className="dashboard-loginbox-icon" />
            </div>
            <div className="dashboard-loginbox-title">
              Login: Unianalytics Dashboards
            </div>
          </div>
        ),
        body: (
          <LoginDialogBox
            app={app}
            factory={factory}
            restorer={restorer}
            labShell={labShell}
            rendermime={rendermime}
            settings={settings}
          />
        ),
        focusNodeSelector: 'input[type="text"]',
        buttons: [
          // close button
          {
            accept: false,
            actions: [],
            ariaLabel: 'Close',
            caption: '',
            className: '',
            displayType: 'default',
            iconClass: '',
            iconLabel: '',
            label: 'Close'
          }
        ]
      })
        .then(result => {})
        .catch(e => console.log(`${APP_ID} Error with Login: ${e}`));
    }
  });
}
