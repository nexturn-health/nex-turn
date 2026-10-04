import { Helmet } from "react-helmet-async";

interface HospitalSeoProps {
  hospital: {
    name: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    phone?: string;
    logoUrl?: string;
  };
  hospitalSlug: string;
}

const SITE_URL = "https://www.nextsynq.health";

export default function HospitalSeo({
  hospital,
  hospitalSlug,
}: HospitalSeoProps) {
  const hospitalName =
    hospital.name?.trim() || "Hospital";

  const title =
    `${hospitalName} Online Appointment Booking | NextSynq Health`;

  const description =
    `Book an online appointment at ${hospitalName}. Select a department, doctor, date, and available time slot using NextSynq Health.`;

  const canonicalUrl =
    `${SITE_URL}/book-appointment/${hospitalSlug}`;

  const fullAddress = [
    hospital.address,
    hospital.city,
    hospital.district,
    hospital.state,
  ]
    .filter(Boolean)
    .join(", ");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: hospitalName,
    url: canonicalUrl,
    description,
    ...(hospital.phone
      ? { telephone: hospital.phone }
      : {}),
    ...(fullAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: hospital.address || "",
            addressLocality:
              hospital.city || hospital.district || "",
            addressRegion: hospital.state || "",
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

      <link
        rel="canonical"
        href={canonicalUrl}
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
        property="og:type"
        content="website"
      />

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}