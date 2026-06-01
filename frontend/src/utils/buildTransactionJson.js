export const buildTransactionJson = (pdfBase64, formData, transactionConfig, formConfig) => {
  let signerData;
  let count;

  if (formConfig?.transactionSigners?.length) {
    // Config-driven signer mapping: each entry is { firstName, lastName?, email }
    // where each value is a form field name to read from formData
    count = formConfig.transactionSigners.length;
    signerData = formConfig.transactionSigners.map((mapping, idx) => {
      const n = idx + 1;
      const fullName = (formData[mapping.firstName] || "Nombre").trim();
      let firstName, lastName;
      if (mapping.lastName) {
        firstName = fullName;
        lastName = formData[mapping.lastName] || "";
      } else {
        // split: last word → lastName, rest → firstName
        const parts = fullName.split(/\s+/);
        lastName = parts.length > 1 ? parts.pop() : fullName;
        firstName = parts.join(" ") || fullName;
      }
      const signer = {
        email:     formData[mapping.email] || "email@example.com",
        firstName,
        lastName,
      };
      return { id: `Signer${n}`, type: "SIGNER", index: n, name: `Signer${n}`, signers: [signer] };
    });
  } else {
    // Default Allaria-style: Firmante{n}Nombre / Firmante{n}Apellido / Firmante{n}Email
    count = parseInt(formData.NumeroFirmantes || "1", 10);
    signerData = [1, 2, 3, 4].slice(0, count).map(n => {
      const signer = {
        email:     formData[`Firmante${n}Email`]    || "email@example.com",
        firstName: formData[`Firmante${n}Nombre`]   || "Nombre",
        lastName:  formData[`Firmante${n}Apellido`] || "Apellido",
      };
      if (formData[`SmsRep${n}`]) {
        signer.auth = {
          scheme: "SMS",
          idvWorkflow: null,
          challenges: [{ question: formData[`RepresentanteTelefono${n}`] || "" }],
        };
      }
      return { id: `Signer${n}`, type: "SIGNER", index: n, name: `Signer${n}`, signers: [signer] };
    });
  }

  const activeRoles = new Set([...Array(count)].map((_, i) => `Signer${i + 1}`));
  const filteredApprovals = transactionConfig.approvals.filter(a => activeRoles.has(a.role));

  return {
    status: transactionConfig.status,
    name: transactionConfig.name,
    description: transactionConfig.description,
    roles: signerData,
    documents: [
      {
        name: transactionConfig.document.name,
        id: transactionConfig.document.id,
        base64Content: pdfBase64,
        approvals: filteredApprovals,
      },
    ],
  };
};
