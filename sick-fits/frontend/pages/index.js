import Link from 'next/link';

export default () => (
  <div>
    <p>Home page</p>
    <Link href="/sell">
      <a>Sell!</a>
    </Link>
  </div>
);
