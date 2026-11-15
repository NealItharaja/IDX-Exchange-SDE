import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ROUTER_FUTURE } from "./routerFuture";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <React.StrictMode>
        <BrowserRouter future={ROUTER_FUTURE}>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
);
