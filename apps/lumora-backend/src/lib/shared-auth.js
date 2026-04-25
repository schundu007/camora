/**
 * Thin re-export of @camora/shared-auth. The two backends used to keep
 * verbatim copies of this module — easy to drift, easy to forget to apply
 * a security fix to both. The canonical implementation now lives in
 * packages/shared-auth and is the only place that should be edited.
 */
export { verifyToken, createToken, authenticate, setSSOCookie, clearSSOCookie } from '@camora/shared-auth';
