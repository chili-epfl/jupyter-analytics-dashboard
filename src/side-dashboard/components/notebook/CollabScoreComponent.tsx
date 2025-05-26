import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { BACKEND_API_URL } from '../../..';
import { RootState } from '../../../redux/store';
import {
  fetchWithCredentials,
  generateQueryArgsString
} from '../../../utils/utils';
import ChartContainer from './ChartContainer';

import { CommandRegistry } from '@lumino/commands';
import { Container, Row } from 'react-bootstrap';
import { CollabScoreForGroup } from '../../../utils/interfaces';
import { SliderD3 } from './SliderD3';

const CollabScoreComponent = (props: {
  notebookId: string;
  commands: CommandRegistry;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sliderD3, setSliderD3] = useState<SliderD3 | null>(null);

  const dashboardQueryArgsRedux = useSelector(
    (state: RootState) => state.commondashboard.dashboardQueryArgs
  );
  const refreshRequired = useSelector(
    (state: RootState) => state.commondashboard.refreshBoolean
  );

  // fetching execution data
  useEffect(() => {
    if (!!containerRef.current) {
      setSliderD3(new SliderD3(containerRef.current));
      console.log("OK")
    }
  }, [containerRef.current]);
  
  useEffect(() => {
    if (!(props.notebookId in dashboardQueryArgsRedux.selectedGroups) || dashboardQueryArgsRedux.selectedGroups[props.notebookId]?.length == 0) {
      return;
    }
    fetchWithCredentials(
      `${BACKEND_API_URL}/dashboard/${props.notebookId}/collaboration_score?${generateQueryArgsString(dashboardQueryArgsRedux, props.notebookId)}`
    )
      .then(response => response.json())
      .then(newCollaborationScores => {
        if (!!sliderD3) {
          sliderD3.updateSlider(newCollaborationScores)
        }
      });
  }, [dashboardQueryArgsRedux, refreshRequired]);

  return (
    <ChartContainer
      PassedComponent={
        <Container>
          <Row className="justify-content-center overflow-y-auto me-1 ms-1">
            <p style={{fontSize: 12}}>The collaboration score ([0.0; 1.0], higher is better) is a value describing the alignement of the team collaboration scheme with the ideal collaboration scheme deducted from the DAG generated from the solution.</p>
          </Row>
          <Row style={{ "height": "250px" }}>
              <div ref={containerRef} id="main-s-slider" style={{ width: "100%", height: "250px" }} />
          </Row>
        </Container>
      }
      title="Collaboration score for the filtered group(s)"
    />
  );
};


export default CollabScoreComponent;
