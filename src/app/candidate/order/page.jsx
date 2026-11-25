import {redirect} from 'next/navigation';
// legacy route → everything lives in the nominations workspace now
export default function Page() { redirect('/'); }
