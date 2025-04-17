import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BACKEND_API_URL } from "../../..";
import { RootState } from "../../../redux/store";
import { CodeExecution, JSONGraph } from "../../../utils/interfaces";
import { fetchWithCredentials, generateQueryArgsString } from "../../../utils/utils";
import ChartContainer from "./ChartContainer";
import GraphComponent from "./GraphComponent";

const DAGComponent = (props: { notebookId: string }) => {
    const [nxJsonData, setnxJsonData] = useState<JSONGraph>({
        multigraph: false,
        directed: false,
        edges: [],
        nodes: [],
        graph: null
    });

    const dashboardQueryArgsRedux = useSelector(
        (state: RootState) => state.commondashboard.dashboardQueryArgs
    );
    const [codeExecution, setCodeExecution] = useState<CodeExecution[]>([]);
    const refreshRequired = useSelector(
        (state: RootState) => state.commondashboard.refreshBoolean
    );
    useEffect(() => {
        fetchWithCredentials(
            `${BACKEND_API_URL}/dashboard/${props.notebookId}/dag`
        )
            .then(response => response.json())
            .then(newNxJsonData => setnxJsonData(newNxJsonData));
    }, [])
    useEffect(() => {
        fetchWithCredentials(
            `${BACKEND_API_URL}/dashboard/${props.notebookId}/user_code_execution?${generateQueryArgsString(dashboardQueryArgsRedux, props.notebookId)}`
        )
            .then(response => response.json())
            .then(newCodeExecution => setCodeExecution(newCodeExecution));
    }, [refreshRequired]);

    return (
        <ChartContainer
            PassedComponent={<GraphComponent nxJsonData={nxJsonData} codeExecution={codeExecution}></GraphComponent>}
            title="Notebook DAG"
        />
    );
}

export default DAGComponent;
