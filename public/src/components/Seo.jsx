import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

// Reusable Open Graph / Twitter meta-tag injector.
//
// NOTE: tags are injected client-side, so they update as the SPA navigates but
// are NOT visible to social/link-preview crawlers (which don't execute JS).
// Real link previews would require the tags in the server's initial HTML.

const DEFAULT_IMAGE = 'https://services.german-emirates-club.com/uploads/background.webp';

export default function Seo({
    title,
    description,
    url,
    image = DEFAULT_IMAGE,
    type = 'website',
    twitterCard = 'summary_large_image',
    twitterImage,
}) {
    return (
        <Helmet>
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content={type} />
            <meta name="twitter:card" content={twitterCard} />
            <meta name="twitter:image" content={twitterImage ?? image} />
        </Helmet>
    );
}

Seo.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    image: PropTypes.string,
    type: PropTypes.string,
    twitterCard: PropTypes.string,
    twitterImage: PropTypes.string,
};
