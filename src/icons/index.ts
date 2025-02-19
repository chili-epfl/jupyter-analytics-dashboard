import { LabIcon } from '@jupyterlab/ui-components';
import extIconStr from '../../style/icons/analyticsGen.svg';
import analyticsReplayIconStr from '../../style/icons/analyticsReplayGen.svg';
import analyticsLoginIconStr from '../../style/icons/analyticsLoginGen.svg';
import hideIconStr from '../../style/icons/eyeSlash.svg';
import showIconStr from '../../style/icons/eyeFill.svg';
import { APP_ID } from '../utils/constants';

export const analyticsIcon = new LabIcon({
  name: `${APP_ID}:visu-icon`,
  svgstr: extIconStr
});

export const analyticsReplayIcon = new LabIcon({
  name: `${APP_ID}:analytics-replay-icon`,
  svgstr: analyticsReplayIconStr
});

export const analyticsLoginIcon = new LabIcon({
  name: `${APP_ID}:analytics-login-icon`,
  svgstr: analyticsLoginIconStr
});

export const hideIcon = new LabIcon({
  name: `${APP_ID}:hide-icon`,
  svgstr: hideIconStr
});

export const showIcon = new LabIcon({
  name: `${APP_ID}:show-icon`,
  svgstr: showIconStr
});
