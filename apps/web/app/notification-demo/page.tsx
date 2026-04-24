import Link from 'next/link';

export default function NotificationDemoPage() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Opened from notification</p>
        <h1>Notification destination</h1>
        <p className="hint">
          This page proves that a notification click can route the user to a specific URL in your
          app. Change the Click URL field to any internal path or full URL you want to test.
        </p>
        <Link className="linkButton" href="/">
          Back to sender
        </Link>
      </section>
    </main>
  );
}
