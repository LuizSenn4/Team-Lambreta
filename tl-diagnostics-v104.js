(() => {
  'use strict';
  if (window.TeamDiagnostics) return;

  const codePattern = /^TL-(NAV|IMG|AUTH|SUPA|PRES|CHAT|FORUM|ADMIN|ASSET|PERF|BANNER)-\d{3}$/;
  const normalizeError = error => error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : error && typeof error === 'object'
      ? { message: String(error.message || error.error_description || 'Erro sem mensagem'), code: error.code, details: error.details, hint: error.hint }
      : error == null ? null : { message: String(error) };

  function emit(level, code, module, description, context, originalError) {
    const safeCode = codePattern.test(String(code || '')) ? code : 'TL-ASSET-001';
    const payload = {
      code: safeCode,
      module: String(module || 'core'),
      description: String(description || 'Falha não classificada'),
      context: context && typeof context === 'object' ? context : {},
      originalError: normalizeError(originalError),
      at: new Date().toISOString()
    };
    console[level](`[${safeCode}] ${payload.description}`, payload);
    window.dispatchEvent(new CustomEvent('tl:diagnostic', { detail: payload }));
    return payload;
  }

  window.TeamDiagnostics = Object.freeze({
    error: (code, module, description, context = {}, originalError = null) => emit('error', code, module, description, context, originalError),
    warn: (code, module, description, context = {}, originalError = null) => emit('warn', code, module, description, context, originalError)
  });
})();
