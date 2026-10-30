import Link from 'next/link';

export default function Home() {
  const members = [
    { num: 1, title: 'Identity & Account Security', path: '/login', desc: 'Signup, login, Google OAuth, role-aware navigation, JWT access/refresh' },
    { num: 2, title: 'Customer Booking & Fee Quote', path: '/booking', desc: 'Booking form, weight & dimensions, server-side pricing engine' },
    { num: 3, title: 'Tracking, History & Receipt', path: '/tracking/SWIFT-DEMO', desc: 'Public tracking, timeline, authenticated history & receipts' },
    { num: 4, title: 'Courier Task Execution', path: '/tasks', desc: 'Assigned job list, status state machine, proof photo upload' },
    { num: 5, title: 'Dispatch & Service Configuration', path: '/dispatch', desc: 'Unassigned parcel view, courier workload balancing, pricing config' },
    { num: 6, title: 'Merchant Account & Partner API', path: '/portal', desc: 'Merchant onboarding, B2B order creation, API credentials & rate limiting' },
    { num: 7, title: 'Notifications & Delivery Inbox', path: '/inbox', desc: 'Customer/courier delivery inbox, alert preferences, RabbitMQ consumer' },
    { num: 8, title: 'Merchant Webhook Center', path: '/webhooks', desc: 'Endpoint config, HMAC payload signing, retry engine & Dead-Letter Queue' },
    { num: 9, title: 'Delivery Reports & Analytics', path: '/analytics', desc: 'Daily delivery trends, success/failure rate, courier performance' },
    { num: 10, title: 'Parcel Support & Exceptions', path: '/exceptions', desc: 'Failed delivery triage, support audit logs, exception resolution workflow' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1.5rem' }}>
      <section style={{ textAlign: 'center', padding: '3rem 1rem', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: 16, border: '1px solid #334155', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem', color: '#38bdf8' }}>
          ⚡ SwiftDrop Platform Hub
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: 700, margin: '0 auto 1.5rem' }}>
          Enterprise Courier & Parcel Delivery System — 10 Member Architecture, AI Automation & Kubernetes Deployment.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ background: '#0284c7', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.85rem' }}>
            🤖 AI Integration Workstream
          </span>
          <span style={{ background: '#0d9488', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.85rem' }}>
            ☸️ Kubernetes Deployed
          </span>
          <span style={{ background: '#7c3aed', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.85rem' }}>
            🐇 RabbitMQ Event-Driven
          </span>
        </div>
      </section>

      <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '1.25rem' }}>
        Team Member Feature Packages
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {members.map((m) => (
          <Link
            key={m.num}
            href={m.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: 12,
              padding: '1.25rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s, transform 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ background: '#1e293b', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                Member {m.num}
              </span>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Explore &rarr;</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', margin: '0.25rem 0' }}>{m.title}</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, flex: 1 }}>{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
