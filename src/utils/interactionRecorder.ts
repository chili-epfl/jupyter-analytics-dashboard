import { InteractionClick } from './interfaces';
import { BACKEND_API_URL, CURRENT_NOTEBOOK_ID } from '..';
import { fetchWithCredentials } from './utils';

export class InteractionRecorder {
  private static _isInteractionRecordingEnabled = false;

  // this method is called in the dashboard plugin activation, which listens to setting updates
  static setPermission(value: boolean): void {
    InteractionRecorder._isInteractionRecordingEnabled = value;
  }

  static sendInteraction = (interactionData: InteractionClick): void => {
    if (InteractionRecorder._isInteractionRecordingEnabled) {
      // send data
      fetchWithCredentials(`${BACKEND_API_URL}/dashboard_interaction/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...interactionData,
          time: new Date().toISOString(),
          notebook_id: CURRENT_NOTEBOOK_ID
        })
      });
      // .then(response => {});
    }
  };
}
