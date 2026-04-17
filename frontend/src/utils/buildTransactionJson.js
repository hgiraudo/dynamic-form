export const buildTransactionJson = (pdfBase64, formData) => {
  const firstSignerName = formData.Firmante1Nombre || "Nombre";
  const firstSignerLastName = formData.Firmante1Apellido || "Apellido";
  const firstSignerEmail = formData.Firmante1Email || "email@example.com";

  return {
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
        base64Content: pdfBase64,
approvals: [
  {
    role: "Signer1",
    id: "Signature1",
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
  {
    role: "Signer1",
    id: "Signature2",
    fields: [
      {
        height: 59.0,
        top: 796.0,
        left: 95.0,
        page: 4,
        binding: "{signer.name}",
        type: "INPUT",
        subtype: "LABEL",
        width: 265.0,
        value: "{signer.name}",
      },
      {
        width: 265.0,
        top: 726.0,
        height: 59.0,
        left: 98.0,
        page: 4,
        type: "SIGNATURE",
        subtype: "FULLNAME",
      },
    ],
  },
  {
    role: "Signer1",
    id: "Signature3",
    fields: [
      {
        height: 30.0,
        top: 1034.0,
        left: 71.0,
        page: 5,
        binding: "{signer.name}",
        type: "INPUT",
        subtype: "LABEL",
        width: 265.0,
        value: "{signer.name}",
      },
      {
        width: 265.0,
        top: 976.0,
        height: 59.0,
        left: 72.0,
        page: 5,
        type: "SIGNATURE",
        subtype: "FULLNAME",
      },
    ],
  },
  {
    role: "Signer1",
    id: "Signature4",
    fields: [
      {
        height: 30.0,
        top: 882.0,
        left: 197.0,
        page: 6,
        binding: "{signer.name}",
        type: "INPUT",
        subtype: "LABEL",
        width: 265.0,
        value: "{signer.name}",
      },
      {
        width: 265.0,
        top: 815.0,
        height: 59.0,
        left: 199.0,
        page: 6,
        type: "SIGNATURE",
        subtype: "FULLNAME",
      },
    ],
  },
  {
    role: "Signer1",
    id: "Signature5",
    fields: [
      {
        height: 30.0,
        top: 824.0,
        left: 144.0,
        page: 8,
        binding: "{signer.name}",
        type: "INPUT",
        subtype: "LABEL",
        width: 265.0,
        value: "{signer.name}",
      },
      {
        width: 265.0,
        top: 758.0,
        height: 59.0,
        left: 124.0,
        page: 8,
        type: "SIGNATURE",
        subtype: "FULLNAME",
      },
    ],
  },
  {
    role: "Signer1",
    id: "Signature6",
    fields: [
      {
        height: 30.0,
        top: 891.0,
        left: 123.0,
        page: 10,
        binding: "{signer.name}",
        type: "INPUT",
        subtype: "LABEL",
        width: 265.0,
        value: "{signer.name}",
      },
      {
        width: 265.0,
        top: 826.0,
        height: 59.0,
        left: 99.0,
        page: 10,
        type: "SIGNATURE",
        subtype: "FULLNAME",
      },
    ],
  },
  {
    role: "Signer1",
    id: "Signature7",
    fields: [
      {
        height: 59.0,
        top: 699.0,
        left: 451.0,
        page: 12,
        binding: "{signer.name}",
        type: "INPUT",
        subtype: "LABEL",
        width: 265.0,
        value: "{signer.name}",
      },
      {
        width: 265.0,
        top: 701.0,
        height: 59.0,
        left: 159.0,
        page: 12,
        type: "SIGNATURE",
        subtype: "FULLNAME",
      },
    ],
  },
],        
      
      },
    ],
  };
};