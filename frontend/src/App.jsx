import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import FormLoader from "./components/forms/FormLoader";
import HomePage from "./components/HomePage";
import CompanyPage from "./components/CompanyPage";
import DocsPage from "./components/DocsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:company" element={<CompanyPage />} />
        <Route path="/:company/:form/docs" element={<DocsPage />} />
        <Route path="/:company/:form" element={<FormLoader />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
