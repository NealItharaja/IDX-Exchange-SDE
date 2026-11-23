import { Link, Route, Routes, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
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
    const { pathname } = useLocation();

    return (
        <div className="app">
            <header className="app__header">
                <Link to="/" className="app__logo">IDX Exchange</Link>
            </header>
            <ErrorBoundary key={pathname}>
                <Routes>
                    <Route path="/" element={<ListingsPage />} />
                    <Route path="/property/:id" element={<PropertyDetailPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </ErrorBoundary>
        </div>
    );
}

export default App;
