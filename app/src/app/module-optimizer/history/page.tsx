import { redirect } from 'next/navigation';

export default function HistoryRemovedRedirect() {
  // Redirect to the main optimizer page. The history UI has been removed.
  redirect('/module-optimizer');
  return null;
}
