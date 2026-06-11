import { Helmet, HelmetProvider } from "react-helmet-async";

const APP_TITLE = "Traumatec Impact Platform";

function formatPageTitle(title: string): string {
  if (title.includes(APP_TITLE)) {
    return title;
  }
  if (title.endsWith(" | TIP")) {
    return `${title.slice(0, -6)} | ${APP_TITLE}`;
  }
  return `${title} | ${APP_TITLE}`;
}

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Helmet prioritizeSeoTags>
    <title>{formatPageTitle(title)}</title>
    <meta name="description" content={description} />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>
    <Helmet defaultTitle={APP_TITLE} />
    {children}
  </HelmetProvider>
);

export default PageMeta;
