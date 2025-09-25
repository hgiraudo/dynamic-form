export const buildTransactionJson = (pdfBase64, formData) => {
  const firstSignerName = formData.Firmante1Nombre || "Nombre";
  const firstSignerLastName = formData.Firmante1Apellido || "Apellido";
  const firstSignerEmail = formData.Firmante1Email || "email@example.com";

  return {
    status: "DRAFT",
    name: "Persona Juridica",
    description: "Alta Persona Juridica",
    roles: [
      {
        id: "Signer1",
        type: "SIGNER",
        index: 1,
        signers: [
          {
            email: firstSignerEmail,
            firstName: firstSignerName,
            lastName: firstSignerLastName,
          },
        ],
        name: "Signer1",
      },
    ],
    documents: [
      {
        name: "Persona Juridica",
        id: "Document1",
        approvals: [
          {
            role: "Signer1",
            id: "signature1",
            fields: [
              {
                width: 252.0,
                top: 880.0,
                height: 62.0,
                left: 225.0,
                page: 0,
                type: "SIGNATURE",
                subtype: "FULLNAME",
              },
            ],
          },
        ],
        base64Content: pdfBase64,
      },
    ],
  };
};
