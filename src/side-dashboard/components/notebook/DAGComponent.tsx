import { CommandRegistry } from '@lumino/commands';
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BACKEND_API_URL } from "../../..";
import { RootState } from "../../../redux/store";
import { APP_ID } from "../../../utils/constants";
import { JSONGraph, TocData } from "../../../utils/interfaces";
import { fetchWithCredentials, generateQueryArgsString } from "../../../utils/utils";
import ChartContainer from "./ChartContainer";
import GraphComponent from "./GraphComponent";
import { Card, Col, Container, Form, Row } from 'react-bootstrap';


const DAGComponent = (props: {
    notebookId: string;
    commands: CommandRegistry
}) => {
    const [nxJsonData, setnxJsonData] = useState<JSONGraph>({
        multigraph: false,
        directed: false,
        edges: [],
        nodes: [],
        graph: null
    });
    const [uploadMessage, setUploadMessage] = useState<string>("");
    const [isDagEnabled, setIsDagEnabled] = useState<boolean>(true);
    const dashboardQueryArgsRedux = useSelector(
        (state: RootState) => state.commondashboard.dashboardQueryArgs
    );
    const [cellUsers, setCellUsers] = useState<Map<string, number>>(new Map<string, number>());
    const refreshRequired = useSelector(
        (state: RootState) => state.commondashboard.refreshBoolean
    );
    const retrieveDag = () => {
        fetchWithCredentials(
            `${BACKEND_API_URL}/dashboard/${props.notebookId}/dag`
        )
            .then(response => {
                if (response.status == 404) {
                    setIsDagEnabled(false);
                }
                return response.json();
            })
            .then(newNxJsonData => {
                if (isDagEnabled) {
                    setnxJsonData(newNxJsonData);
                }
            });
    };
    useEffect(retrieveDag, []);
    useEffect(() => {
        if (!isDagEnabled) {
            return;
        }
        fetchWithCredentials(
            `${BACKEND_API_URL}/dashboard/${props.notebookId}/toc?${generateQueryArgsString(dashboardQueryArgsRedux, props.notebookId)}`
        )
            .then(response => response.json())
            .then((newCodeExecution: TocData) => setCellUsers(new Map(Object.entries(newCodeExecution.data.location_count))))
            .catch(error => console.log(`${APP_ID}: Failed to retrieve ToC data`, error));
    }, [refreshRequired]);

    async function onSolutionSelected(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length == 0) {
            return;
        }
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('notebook_content', JSON.stringify(JSON.parse(await file.text())));
        formData.append('name', file.name);

        fetchWithCredentials(`${BACKEND_API_URL}/notebook/dag/${props.notebookId}`, {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (response.ok) {
                    setUploadMessage("Successfully generated the DAG ! Refresh or re-open the notebook to see it.")
                } else {
                    response.text().then(t => setUploadMessage("Failed to upload the solution: " + t + ". Try again."));
                }
            })
            .catch(error => {
                setUploadMessage("Failed to upload the solution: " + error + "\nPlease try again.");
                return false
            });
    }

    return (<>
        <ChartContainer
            PassedComponent={isDagEnabled ?
                <GraphComponent commands={props.commands} nxJsonData={nxJsonData} cellUsers={cellUsers}></GraphComponent> :
                <Container>
                    <Row className="justify-content-center">
                        <Col md="auto">No DAG associated with this notebook.</Col>
                    </Row>
                    <Row className="justify-content-center">
                        <Col md="auto">
                            <Form.Group controlId="notebook-solution" className="text-decoration-underline" onChange={onSolutionSelected}>
                                <Form.Control type="file" />
                            </Form.Group>
                        </Col>
                    </Row>
                    {uploadMessage != "" &&
                        <Row className="justify-content-center">
                            <Col md="auto" className="text-info-emphasis">
                                {uploadMessage}
                            </Col>
                        </Row>}
                </Container>}
            title="Notebook DAG"
        />
    </>
    );
}

export default DAGComponent;
