import { Link, Route, Routes } from "react-router-dom";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import "./App.css";

function NotFoundPage() {
    return (
        <main className="app__not-found">
            <h1>Page not found</h1>
            <p>That page doesn't exist.</p>
            <Link to="/">Back to listings</Link>
        </main>
    );
}

function App() {
    return (
        <div className="app">
            <header className="app__header">
                <Link to="/" className="app__logo">IDX Exchange</Link>
            </header>
            <Routes>
                <Route path="/" element={<ListingsPage />} />
                <Route path="/property/:id" element={<PropertyDetailPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </div>
    );
}

export default App;
