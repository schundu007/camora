module.exports = function (api) {
  api.cache(true);
  const isProduction = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip console.* in production builds. Apple privacy review and
      // basic hygiene both prefer no chatter from production binaries —
      // and this also avoids leaking PII through OS logs (Console.app on
      // iOS, logcat on Android).
      ...(isProduction
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
    ],
  };
};
