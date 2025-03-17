import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { BACKEND_API_URL } from "../../..";
import { RootState } from "../../../redux/store";
import { JSONGraph } from "../../../utils/interfaces";
import { fetchWithCredentials } from "../../../utils/utils";
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
    const refreshRequired = useSelector(
        (state: RootState) => state.commondashboard.refreshBoolean
    );
    useEffect(() => {
        fetchWithCredentials(
            `${BACKEND_API_URL}/dashboard/${props.notebookId}/dag`
        )
            .then(response => response.json())
            .then(newNxJsonData => setnxJsonData(newNxJsonData));
    }, [refreshRequired]);

    return (
        <ChartContainer
            PassedComponent={<GraphComponent nxJsonData={nxJsonData}></GraphComponent>}
            title="Notebook DAG"
        />
    );
}

export default DAGComponent;
