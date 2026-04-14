import { useEffect } from 'react';
import DocsPage from '../../components/capra/docs/DocsPage';

export default function PreparePage() {
  useEffect(() => {
    document.title = 'Prepare | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return <DocsPage />;
}
