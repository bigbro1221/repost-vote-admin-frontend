import {redirect} from 'next/navigation';
// legacy deep link → nominations workspace with this nomination expanded
export default function Page({params: {id}}) { redirect(`/?n=${encodeURIComponent(id)}`); }
