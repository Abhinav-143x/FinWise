import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#1e1c1a",
            color: "#f8f8f7",
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#f8f8f7" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#f8f8f7" } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
