import ListingsPage from "./pages/ListingsPage";
import "./App.css";

function App() {
    return (
        <div className="app">
            <header className="app__header">
                <span className="app__logo">IDX Exchange</span>
            </header>
            <ListingsPage />
        </div>
    );
}

export default App;
