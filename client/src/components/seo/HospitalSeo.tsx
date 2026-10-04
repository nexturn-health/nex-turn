import { Helmet } from "react-helmet-async";

const SITE_URL =
  "https://www.nextsynq.health";

interface HospitalSeoProps {
  hospital: {
    name: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    logoUrl?: string;
  };
  hospitalSlug: string;
}

const makeAbsoluteUrl = (
  value?: string,
) => {
  if (!value) {
    return `${SITE_URL}/nextsynq.png`;
  }

  if (value.startsWith("http")) {
    return value;
  }

  return `${SITE_URL}${
    value.startsWith("/") ? "" : "/"
  }${value}`;
};

export default function HospitalSeo({
  hospital,
  hospitalSlug,
}: HospitalSeoProps) {
  const hospitalName =
    hospital.name?.trim() || "Hospital";

  const title =
    `Book Appointment at ${hospitalName} | NextSynq Health`;

  const description =
    `Book an appointment at ${hospitalName} online. Select a department, doctor, date, and available time slot using NextSynq Health.`;

  const canonicalUrl =
    `${SITE_URL}/book-appointment/${hospitalSlug}`;

  const imageUrl =
    makeAbsoluteUrl(hospital.logoUrl);

  const fullAddress = [
    hospital.address,
    hospital.city,
    hospital.district,
    hospital.state,
    hospital.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "@id": canonicalUrl,
    name: hospitalName,
    url: canonicalUrl,
    description,
    image: imageUrl,
    ...(hospital.phone
      ? {
          telephone: hospital.phone,
        }
      : {}),
    ...(fullAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress:
              hospital.address || "",
            addressLocality:
              hospital.city ||
              hospital.district ||
              "",
            addressRegion:
              hospital.state || "",
            postalCode:
              hospital.pincode || "",
            addressCountry: "IN",
          },
        }
      : {}),
  };

  return (
    <Helmet>
      <title>{title}</title>

      <meta
        name="description"
        content={description}
      />

      <meta
        name="robots"
        content="index,follow"
      />

      <link
        rel="canonical"
        href={canonicalUrl}
      />

      <meta
        property="og:type"
        content="website"
      />

      <meta
        property="og:site_name"
        content="NextSynq Health"
      />

      <meta
        property="og:title"
        content={title}
      />

      <meta
        property="og:description"
        content={description}
      />

      <meta
        property="og:url"
        content={canonicalUrl}
      />

      <meta
        property="og:image"
        content={imageUrl}
      />

      <meta
        name="twitter:card"
        content="summary_large_image"
      />

      <meta
        name="twitter:title"
        content={title}
      />

      <meta
        name="twitter:description"
        content={description}
      />

      <meta
        name="twitter:image"
        content={imageUrl}
      />

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}