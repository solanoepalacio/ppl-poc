/**
 * Back-office login. A plain HTML form posting to /login/submit — no client
 * JavaScript in the critical path, because the primary client is a TV browser
 * that cannot render the native credential dialog a challenge-based gate needs
 * and whose scripting support is not worth betting the only way in on.
 *
 * The failed-attempt message arrives as a query flag (?error=1) rather than
 * client state, so the whole flow is a form POST and a redirect.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const failed = error != null;

  return (
    <main className="login-shell">
      <section className="login-card">
        <h1 className="login-title">Pannico</h1>
        <p className="login-subtitle">Oficina de gestión</p>

        <form method="post" action="/login/submit" className="login-form">
          <input type="hidden" name="next" value={next ?? ''} />

          <label className="login-field">
            <span>Usuario</span>
            <input
              name="user"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {failed && (
            <p className="error" role="alert">
              Usuario o contraseña incorrectos.
            </p>
          )}

          <button type="submit" className="btn-primary login-submit">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
