export const buildTransactionJson = (pdfBase64, formData, transactionConfig) => {
  const count = parseInt(formData.NumeroFirmantes || "1", 10);

  const signerData = [1, 2, 3, 4].slice(0, count).map(n => {
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

  const activeRoles = new Set([1, 2, 3, 4].slice(0, count).map(n => `Signer${n}`));
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