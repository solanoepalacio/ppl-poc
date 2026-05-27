import Link from 'next/link';

export default function Home() {
  return (
    <section>
      <h1>Pannico — Back office</h1>
      <p className="muted">Order intake PoC.</p>
      <div className="card">
        <p>
          <Link href="/links">→ Generate an order link</Link>
        </p>
        <p>
          <Link href="/orders">→ View orders by day</Link>
        </p>
      </div>
    </section>
  );
}
