import React from "react";
import WizardForm from "./components/forms/WizardForm";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 md:p-8">
      <h1 className="hidden md:block text-3xl font-bold text-center text-brand-primary mb-8">
        Persona Jurídica
      </h1>
      <WizardForm />
    </div>
  );
}

export default App;
