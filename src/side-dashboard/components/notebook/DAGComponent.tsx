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

    const [isDagEnabled, setIsDagEnabled] = useState<boolean>(true);
    const dashboardQueryArgsRedux = useSelector(
        (state: RootState) => state.commondashboard.dashboardQueryArgs
    );
    const [cellUsers, setCellUsers] = useState<Map<string, number>>(new Map<string, number>());
    const refreshRequired = useSelector(
        (state: RootState) => state.commondashboard.refreshBoolean
    );
    useEffect(() => {
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
                    setnxJsonData(newNxJsonData)
                }
            });
    }, []);
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

    return (<>
        {isDagEnabled &&
            <ChartContainer
                PassedComponent={<GraphComponent commands={props.commands} nxJsonData={nxJsonData} cellUsers={cellUsers}></GraphComponent>}
                title="Notebook DAG"
            />
        }
    </>
    );
}

export default DAGComponent;
