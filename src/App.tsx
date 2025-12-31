import GameComponent from "./components/GameComponent";
import UIOverlay from "./components/UIOverlay";
import "./App.css";

function App() {
  return (
    <div className="app" style={{ position: 'relative' }}>
      <UIOverlay />
      <GameComponent />
    </div>
  );
}

export default App;
