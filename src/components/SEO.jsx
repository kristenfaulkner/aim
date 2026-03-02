const SITE_NAME = "AIM";
const DEFAULT_TITLE = "AIM — AI-Powered Performance Intelligence";
const DEFAULT_DESCRIPTION =
  "AIM connects all your fitness data — power, sleep, recovery, body composition, blood work — and uses AI to deliver actionable insights. Founded by Kristen Faulkner, 2x Olympic Gold Medalist.";
const DEFAULT_IMAGE = "https://aimfitness.ai/logos/aim-logo-badge-dark-4x.png";
const BASE_URL = "https://aimfitness.ai";

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "",
  image = DEFAULT_IMAGE,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const canonical = `${BASE_URL}${path}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
}
