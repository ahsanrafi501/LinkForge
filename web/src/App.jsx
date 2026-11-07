import React, { useEffect, useRef, useState } from 'react';

function Icon({ name, ...props }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    link: <><path d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M13 9l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    external: <><path d="M14 3h7v7m0-7L10 14" /><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

async function request(path, options) {
  const response = await fetch(path, options);
  if (response.status === 204) return null;
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Something went wrong. Please try again.');
  return result?.data;
}

export default function App() {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [created, setCreated] = useState(null);
  const listGeneration = useRef(0);
  const pendingMutations = useRef(0);

  async function loadLinks() {
    if (pendingMutations.current) return;
    const generation = ++listGeneration.current;
    try {
      const data = await request('/api/links');
      if (generation === listGeneration.current) setLinks(data);
    } catch (err) {
      if (generation === listGeneration.current) setError(err.message === 'Failed to fetch' ? 'Cannot reach the server. Check that the API is running, then refresh.' : err.message);
    } finally {
      if (generation === listGeneration.current) setLoading(false);
    }
  }

  function beginMutation() {
    pendingMutations.current += 1;
    listGeneration.current += 1;
  }

  function finishMutation() {
    pendingMutations.current -= 1;
    if (!pendingMutations.current) loadLinks();
  }

  useEffect(() => {
    loadLinks();
    const refresh = () => loadLinks();
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      listGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(''), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  async function shorten(event) {
    event.preventDefault();
    setError('');
    let parsed;
    try { parsed = new URL(url.trim()); } catch { setError('Enter a complete URL, starting with https:// or http://.'); return; }
    if (!['http:', 'https:'].includes(parsed.protocol)) { setError('Only http:// and https:// URLs can be shortened.'); return; }
    if (alias.trim() && !/^[a-zA-Z0-9_-]{3,32}$/.test(alias.trim())) { setError('Use 3–32 letters, numbers, hyphens, or underscores for your custom alias.'); return; }
    setSaving(true);
    beginMutation();
    try {
      const link = await request('/api/links', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), ...(alias.trim() ? { customAlias: alias.trim() } : {}) })
      });
      setLinks(current => [link, ...current.filter(item => item.code !== link.code)]);
      setCreated(link); setUrl(''); setAlias('');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); finishMutation(); }
  }

  async function copy(link) {
    try { await navigator.clipboard.writeText(link.shortUrl); setCopied(link.code); }
    catch { setError('Could not copy automatically. Select and copy the short link instead.'); }
  }

  async function remove(link) {
    if (!window.confirm(`Delete /${link.code}? This short link will stop working.`)) return;
    setDeleting(link.code); setError('');
    beginMutation();
    try {
      await request(`/api/links/${encodeURIComponent(link.code)}`, { method: 'DELETE' });
      setLinks(current => current.filter(item => item.code !== link.code));
      if (created?.code === link.code) setCreated(null);
    } catch (err) { setError(err.message); }
    finally { setDeleting(''); finishMutation(); }
  }

  const clicks = links.reduce((sum, item) => sum + item.clicks, 0);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="LinkForge home"><span className="brand-mark"><Icon name="link" /></span>linkforge<span className="brand-dot">.</span></a>
        <a href="#your-links" className="header-link">Your links <span>↗</span></a>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span /> A LITTLE LINK GOES A LONG WAY</div>
            <h1 id="hero-title">Less link.<br /><span>More possibility.</span></h1>
            <p className="hero-description">Good things come in short links. Turn your long URLs into something clean, memorable, and ready to share.</p>
            <div className="hero-note"><span className="note-star">✳</span> Simple to make. Easy to share. Yours to track.</div>
          </div>
          <div className="shortener-card">
            <div className="card-heading"><span className="mini-icon"><Icon name="link" /></span><span>Make a long story short</span></div>
            <form onSubmit={shorten}>
              <label htmlFor="url">Destination URL</label>
              <input id="url" type="url" placeholder="https://example.com/something-great" value={url} onChange={event => setUrl(event.target.value)} required autoComplete="url" />
              <div className="label-row"><label htmlFor="alias">Custom back-half</label><span>optional</span></div>
              <div className="alias-input"><span>your-link /</span><input id="alias" value={alias} onChange={event => setAlias(event.target.value)} placeholder="make-it-yours" maxLength={32} autoComplete="off" /></div>
              <p className="input-hint">3–32 letters, numbers, hyphens, or underscores.</p>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Creating your link…' : 'Shorten link'}<Icon name="arrow" /></button>
            </form>
            <p className="card-footnote">A smaller link. The same big destination.</p>
          </div>
        </section>

        {error && <div className="notice error" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
        {created && <div className="notice success" role="status"><span><strong>Your link is ready.</strong> <a href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl}</a></span><button type="button" onClick={() => copy(created)}>{copied === created.code ? 'Copied!' : 'Copy link'}<Icon name={copied === created.code ? 'check' : 'copy'} /></button></div>}

        <section className="links-section" id="your-links" aria-labelledby="links-title">
          <div className="section-header"><div><div className="eyebrow section-eyebrow">YOUR LITTLE CORNER OF THE INTERNET</div><h2 id="links-title">Your links<span className="count-badge">{links.length}</span></h2></div><div className="click-summary"><strong>{clicks.toLocaleString()}</strong><span>total clicks <span aria-hidden="true">↗</span></span></div></div>
          <div className="links-panel">
            {loading ? <div className="empty-state" role="status"><span className="empty-symbol">↗</span><h3>Gathering your links…</h3><p>One moment while we load your collection.</p></div> : links.length === 0 ? <div className="empty-state"><span className="empty-symbol"><Icon name="link" width="28" height="28" /></span><h3>Your next great link starts above.</h3><p>Shorten your first URL and give it a home right here.</p><span className="empty-arrow" aria-hidden="true">↑</span></div> : <><div className="table-header"><span>LINK & DESTINATION</span><span>CLICKS</span><span>ACTIONS</span></div><ul className="links-list">{links.map(link => <li key={link.code} className="link-row"><div className="link-avatar"><Icon name="link" /></div><div className="link-details"><a className="short-link" href={link.shortUrl} target="_blank" rel="noreferrer">{link.shortUrl.replace(/^https?:\/\//, '')}<Icon name="external" width="13" height="13" /></a><a className="destination" href={link.url} target="_blank" rel="noreferrer" title={link.url}>{link.url}</a><span className="link-date">{new Date(link.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><span className="click-count">{link.clicks.toLocaleString()}<span> clicks</span></span><div className="link-actions"><button type="button" className={copied === link.code ? 'icon-button copied' : 'icon-button'} onClick={() => copy(link)} aria-label={`Copy link ${link.code}`} title={copied === link.code ? 'Copied!' : 'Copy link'}><Icon name={copied === link.code ? 'check' : 'copy'} /></button><button type="button" className="icon-button delete-button" disabled={deleting === link.code} onClick={() => remove(link)} aria-label={`Delete link ${link.code}`} title="Delete link"><Icon name="trash" /></button></div></li>)}</ul></>}
          </div>
          <p className="storage-note"><span aria-hidden="true">◌</span> This workspace uses temporary storage. Links reset when the server restarts.</p>
        </section>
      </main>
      <footer><span>Small links. Big connections.</span><span>Made with purpose. Shared with ease. <span className="footer-star">✳</span></span></footer>
      <span className="sr-only" role="status" aria-live="polite">{copied ? 'Link copied to clipboard.' : ''}</span>
    </div>
  );
}
