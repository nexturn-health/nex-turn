import {
    Helmet,
} from "react-helmet-async";

interface HospitalSeoProps {
    hospital: {
        name: string;
        bookingSlug?: string;
        address?: string;
        city?: string;
        district?: string;
        state?: string;
        pincode?: string;
        phone?: string;
        logoUrl?: string;
    };
}

const HospitalSeo = ({
    hospital,
}: HospitalSeoProps) => {
    if (!hospital.bookingSlug) {
        return null;
    }

    const pageUrl =
        `https://www.nextsynq.health/book-appointment/${hospital.bookingSlug}`;

    const location = [
        hospital.city,
        hospital.district,
        hospital.state,
    ]
        .filter(Boolean)
        .join(", ");

    const description =
        `Book an appointment online at ${hospital.name}` +
        `${location ? ` in ${location}` : ""}. ` +
        "Choose a department, doctor, date and available appointment slot.";

    const logoUrl =
        hospital.logoUrl?.startsWith("http")
            ? hospital.logoUrl
            : hospital.logoUrl
                ? `https://www.nextsynq.health${hospital.logoUrl}`
                : undefined;

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "MedicalClinic",
        "@id": `${pageUrl}#hospital`,
        name: hospital.name,
        url: pageUrl,
        description,
        image: logoUrl,
        telephone: hospital.phone || undefined,
        address: {
            "@type": "PostalAddress",
            streetAddress: hospital.address || "",
            addressLocality:
                hospital.city || "",
            addressRegion:
                hospital.state || "",
            postalCode:
                hospital.pincode || "",
            addressCountry: "IN",
        },
    };

    return (
        <Helmet>
            <title>
                Book Appointment at {hospital.name}
                {location ? `, ${location}` : ""} | NextSynq Health
            </title>

            <meta
                name="description"
                content={description}
            />

            <meta
                name="robots"
                content="index, follow"
            />

            <link
                rel="canonical"
                href={pageUrl}
            />

            <meta
                property="og:type"
                content="website"
            />

            <meta
                property="og:title"
                content={`Book Appointment at ${hospital.name}`}
            />

            <meta
                property="og:description"
                content={description}
            />

            <meta
                property="og:url"
                content={pageUrl}
            />

            {logoUrl && (
                <meta
                    property="og:image"
                    content={logoUrl}
                />
            )}

            <script type="application/ld+json">
                {JSON.stringify(structuredData)}
            </script>
        </Helmet>
    );
};

export default HospitalSeo;