export const buildTransactionJson = (pdfBase64) => ({
  status: "SENT",
  name: "Persona Juridica",
  description: "Alta Persona Juridica",
  roles: [
    {
      id: "Signer1",
      type: "SIGNER",
      index: 1,
      signers: [
        {
          email: "hgiraudo@yahoo.com",
          firstName: "Hernan",
          lastName: "Yahoo",
        },
      ],
      name: "Signer1",
    },
  ],
  documents: [
    {
      name: "Persona Juridica",
      description: "Click para aceptar",
      id: "Document1",
      approvals: [
        {
          role: "Signer1",
          id: "signature1",
          fields: [],
        },
      ],
      base64Content: pdfBase64,
    },
  ],
});
