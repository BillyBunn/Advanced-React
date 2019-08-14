// fixes FOUC with styled-components and server-side rendering

import Document, { Head, Main, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';

// _document is only rendered on the server side and not on the client side. https://github.com/zeit/next.js#custom-document
// https://www.styled-components.com/docs/advanced#nextjs



export default class MyDocument extends Document {
  static getInitialProps({ renderPage }) {

    // renders app and crawls every component to see if there are any styles that need to be collected
    const sheet = new ServerStyleSheet();
    const page = renderPage(App => props =>
      sheet.collectStyles(<App {...props} />)
    );
    const styleTags = sheet.getStyleElement();
    // compiles all the styles and puts them on the page
    return { ...page, styleTags };
  }

  render() {
    return (
      <html>
        <Head>{this.props.styleTags}</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
