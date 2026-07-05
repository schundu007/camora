import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import JobsSubNav from '../components/jobsearch/JobsSubNav';
import JobSeekerProfilePanel from '../components/jobsearch/JobSeekerProfilePanel';
import { T } from '../components/jobsearch/theme';

/**
 * Job Profile page under the Apply section (/jobs/profile). Reuses the shared
 * JobSeekerProfilePanel (also used to live as a /profile tab before the Apply
 * consolidation). Auth is enforced by the ProtectedRoute wrapper in App.tsx.
 */
export default function JobProfilePage() {
  return (
    <div style={T.pageBg}>
      <SiteNav />
      <JobsSubNav />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <JobSeekerProfilePanel />
      </main>
      <SiteFooter />
    </div>
  );
}
