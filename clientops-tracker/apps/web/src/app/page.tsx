const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export default function Home() {
  return (
    <main className="page-shell">
      <section className="status-panel" aria-labelledby="page-title">
        <p className="eyebrow">ClientOps Tracker</p>
        <h1 id="page-title">Full-stack foundation is ready.</h1>
        <p className="summary">
          Next.js, Express, PostgreSQL, Drizzle, Docker, and CI are wired for the next
          implementation phase.
        </p>
        <dl className="status-grid">
          <div>
            <dt>Web</dt>
            <dd>http://localhost:3000</dd>
          </div>
          <div>
            <dt>API</dt>
            <dd>{apiUrl}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{apiUrl}/health</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

