export const buildTransactionJson = (pdfBase64, formData, transactionConfig) => {
  const count = parseInt(formData.NumeroFirmantes || "1", 10);

  const signerData = [1, 2, 3, 4].slice(0, count).map(n => ({
    id: `Signer${n}`,
    type: "SIGNER",
    index: n,
    name: `Signer${n}`,
    signers: [{
      email:     formData[`Firmante${n}Email`]    || "email@example.com",
      firstName: formData[`Firmante${n}Nombre`]   || "Nombre",
      lastName:  formData[`Firmante${n}Apellido`] || "Apellido",
    }],
  }));

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
        approvals: transactionConfig.approvals,
      },
    ],
  };
};