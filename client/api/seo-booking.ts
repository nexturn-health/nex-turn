const SITE_URL =
  "https://www.nextsynq.health";

const API_URL =
  "https://nex-turn-1.onrender.com/api";

type AnyRecord =
  Record<string, any>;

/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHtml(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   CONVERT SLUG TO NAME
============================================================ */

function humanizeSlug(
  slug: string,
): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

/* ============================================================
   UPDATE OR INSERT HTML TAG
============================================================ */

function upsertTag(
  html: string,
  pattern: RegExp,
  tag: string,
): string {
  if (pattern.test(html)) {
    return html.replace(
      pattern,
      tag,
    );
  }

  return html.replace(
    /<\/head>/i,
    `${tag}\n</head>`,
  );
}

/* ============================================================
   LOAD STATIC FRONTEND HTML
============================================================ */

async function getHtmlShell(
  request: any,
): Promise<string> {
  const host =
    request.headers?.[
      "x-forwarded-host"
    ] ||
    request.headers?.host ||
    "www.nextsynq.health";

  const protocol =
    request.headers?.[
      "x-forwarded-proto"
    ] || "https";

  const origin =
    `${protocol}://${host}`;

  const response =
    await fetch(
      `${origin}/index.html`,
    );

  if (!response.ok) {
    throw new Error(
      "Unable to load index.html",
    );
  }

  return response.text();
}

/* ============================================================
   VERCEL SERVERLESS FUNCTION
============================================================ */

export default async function handler(
  req: any,
  res: any,
) {
  try {
    const rawSlug =
      req.query?.hospitalSlug ||
      req.query?.slug ||
      "";

    const hospitalSlug =
      Array.isArray(rawSlug)
        ? String(rawSlug[0])
        : String(rawSlug);

    if (!hospitalSlug) {
      return res.status(400).send(
        "Hospital slug is required",
      );
    }

    let hospital:
      | AnyRecord
      | null = null;

    let hospitalNotFound =
      false;

    /* ----------------------------------------------------------
       FETCH HOSPITAL FROM BACKEND
    ---------------------------------------------------------- */

    try {
      const apiResponse =
        await fetch(
          `${API_URL}/public/hospitals/slug/${encodeURIComponent(
            hospitalSlug,
          )}`,
          {
            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const payload =
        (await apiResponse.json()) as AnyRecord;

      hospital =
        payload?.data?.hospital ||
        payload?.data ||
        payload?.hospital ||
        null;

      if (
        apiResponse.status === 404 ||
        (
          payload?.success === false &&
          !hospital
        )
      ) {
        hospitalNotFound = true;
      }
    } catch (error) {
      console.error(
        "SEO hospital API error:",
        error,
      );
    }

    /* ----------------------------------------------------------
       SEO DATA
    ---------------------------------------------------------- */

    const hospitalName =
      hospital?.name ||
      humanizeSlug(hospitalSlug);

    const title =
      `Book Appointment at ${hospitalName} | NextSynq Health`;

    const description =
      `Book an appointment at ${hospitalName} online. Select a department, doctor, date, and available time slot using NextSynq Health.`;

    const canonicalUrl =
      `${SITE_URL}/book-appointment/${hospitalSlug}`;

    const fullAddress = [
      hospital?.address,
      hospital?.city,
      hospital?.district,
      hospital?.state,
      hospital?.pincode,
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

      ...(hospital?.phone
        ? {
            telephone:
              hospital.phone,
          }
        : {}),

      ...(fullAddress
        ? {
            address: {
              "@type":
                "PostalAddress",
              streetAddress:
                hospital?.address || "",
              addressLocality:
                hospital?.city ||
                hospital?.district ||
                "",
              addressRegion:
                hospital?.state || "",
              postalCode:
                hospital?.pincode || "",
              addressCountry: "IN",
            },
          }
        : {}),
    };

    const jsonLd =
      JSON.stringify(
        structuredData,
      ).replace(
        /</g,
        "\\u003c",
      );

    /* ----------------------------------------------------------
       LOAD FRONTEND HTML
    ---------------------------------------------------------- */

    let html =
      await getHtmlShell(req);

    /* ----------------------------------------------------------
       TITLE
    ---------------------------------------------------------- */

    html = upsertTag(
      html,
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(
        title,
      )}</title>`,
    );

    /* ----------------------------------------------------------
       DESCRIPTION
    ---------------------------------------------------------- */

    html = upsertTag(
      html,
      /<meta[^>]*name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(
        description,
      )}" />`,
    );

    /* ----------------------------------------------------------
       ROBOTS
    ---------------------------------------------------------- */

    html = upsertTag(
      html,
      /<meta[^>]*name=["']robots["'][^>]*>/i,
      `<meta name="robots" content="index,follow" />`,
    );

    /* ----------------------------------------------------------
       CANONICAL
    ---------------------------------------------------------- */

    html = upsertTag(
      html,
      /<link[^>]*rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    );

    /* ----------------------------------------------------------
       OPEN GRAPH
    ---------------------------------------------------------- */

    html = upsertTag(
      html,
      /<meta[^>]*property=["']og:title["'][^>]*>/i,
      `<meta property="og:title" content="${escapeHtml(
        title,
      )}" />`,
    );

    html = upsertTag(
      html,
      /<meta[^>]*property=["']og:description["'][^>]*>/i,
      `<meta property="og:description" content="${escapeHtml(
        description,
      )}" />`,
    );

    html = upsertTag(
      html,
      /<meta[^>]*property=["']og:url["'][^>]*>/i,
      `<meta property="og:url" content="${canonicalUrl}" />`,
    );

    /* ----------------------------------------------------------
       TWITTER
    ---------------------------------------------------------- */

    html = upsertTag(
      html,
      /<meta[^>]*name=["']twitter:title["'][^>]*>/i,
      `<meta name="twitter:title" content="${escapeHtml(
        title,
      )}" />`,
    );

    html = upsertTag(
      html,
      /<meta[^>]*name=["']twitter:description["'][^>]*>/i,
      `<meta name="twitter:description" content="${escapeHtml(
        description,
      )}" />`,
    );

    /* ----------------------------------------------------------
       JSON-LD STRUCTURED DATA
    ---------------------------------------------------------- */

    html = html.replace(
      /<\/head>/i,
      `<script id="hospital-seo-jsonld" type="application/ld+json">${jsonLd}</script>\n</head>`,
    );

    /* ----------------------------------------------------------
       SEO FALLBACK CONTENT
    ---------------------------------------------------------- */

    const seoFallback = `
      <main>
        <h1>${escapeHtml(
          `Book an Appointment at ${hospitalName}`,
        )}</h1>

        <p>${escapeHtml(
          description,
        )}</p>
      </main>
    `;

    html = html.replace(
      /<div id="root">\s*<\/div>/i,
      `<div id="root">${seoFallback}</div>`,
    );

    /* ----------------------------------------------------------
       RESPONSE
    ---------------------------------------------------------- */

    res.status(
      hospitalNotFound ? 404 : 200,
    );

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8",
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );

    return res.send(html);
  } catch (error) {
    console.error(
      "SEO SSR error:",
      error,
    );

    return res.status(500).send(
      "Unable to render booking page",
    );
  }
}