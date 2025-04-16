import React, { useEffect, useRef } from "react";
import { CodeExecution, JSONGraph } from "../../../utils/interfaces";
import Loader from "../placeholder/Loader";
import { initGraph, updateGraph } from "./GraphD3";


const GraphComponent = (props: ({ nxJsonData: JSONGraph, codeExecution: CodeExecution[] })) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (containerRef.current) {
            initGraph(containerRef.current, props.nxJsonData, props.codeExecution);
        }
    }, [props.nxJsonData]);  // only watch code execution updates since nxJsonGraph is static


    useEffect(() => {
        updateGraph(props.codeExecution);
    }, [props.codeExecution]);

    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <svg height="30px" width="100%">
                    <defs>
                        <linearGradient id="blue-gradient" x1="0%" x2="100%" y1="0%" y2="0%"><stop offset="0%" stop-color="rgb(247, 251, 255)"></stop><stop offset="10%" stop-color="rgb(227, 238, 249)"></stop><stop offset="20%" stop-color="rgb(207, 225, 242)"></stop><stop offset="30%" stop-color="rgb(181, 212, 233)"></stop><stop offset="40%" stop-color="rgb(147, 195, 223)"></stop><stop offset="50%" stop-color="rgb(109, 174, 213)"></stop><stop offset="60%" stop-color="rgb(75, 151, 201)"></stop><stop offset="70%" stop-color="rgb(47, 126, 188)"></stop><stop offset="80%" stop-color="rgb(24, 100, 170)"></stop><stop offset="90%" stop-color="rgb(10, 74, 144)"></stop><stop offset="100%" stop-color="rgb(8, 48, 107)"></stop></linearGradient>
                    </defs>
                    <rect x="10" y="0" width="100%" height="10" stroke="#000000" stroke-width="1" style={{ fill: 'url(#blue-gradient)' }}></rect>
                    <text x="50%" y="25" text-anchor="middle" style={{ fontSize: 8 }}>- activity +</text>
                </svg>
            </div>
            <div className="row justify-content-center">
                <div className="col-auto">
                    <p className="text-end">Cell level</p>
                </div>
                <div className="d-flex col-auto">
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" role="switch" id="levelSwitch" defaultChecked></input>
                    </div>
                </div>
                <div className="col-auto">
                    <p>Part level</p>
                </div>
            </div>
            <div className="row" style={{ "height": "250px" }}>
                <div id="dagLoader"><Loader /></div>
                <div ref={containerRef} id="main-s" style={{ width: "100%", height: "250px" }} />
            </div>
        </div>
    );
};

export default GraphComponent;
