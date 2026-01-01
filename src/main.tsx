import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameserverProvider } from "@agent8/gameserver";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameserverProvider>
      <App />
    </GameserverProvider>
  </StrictMode>
);
