'use client';
import {useState} from 'react';
import useSWR from 'swr';
import NextLink from 'next/link';
import {useRouter} from 'next/navigation';
import {ChevronLeft, Newspaper, PanelRight, Trash2, UserRound} from 'lucide-react';
import CandidateForm from "@/features/candidate/ui/candidate-form";
import CandidateNews from "@/features/news/ui/candidate-news";
import {deleteCandidate, fetchOneCandidate} from "@/shared/api/candidates.api";
import {fetchAllNominations} from "@/shared/api/nominations.api";
import {useEditionStore} from "@/shared/store/edition.store";
import {Card, EmptyState, Skeleton} from "@/shared/ui/Card";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import Tabs from "@/shared/ui/Tabs";
import {toast} from "@/shared/ui/toast";
import {confirmAction} from "@/shared/ui/confirm";
import {fmtNum, photoUrl, voteStats} from "@/shared/lib/format";
import {Avatar} from "@/widgets/candidate/ui/CandidateSheet";

// Standalone deep link for a candidate (same form + news as the drawer).
const Page = ({params: {id}}) => {
    const router = useRouter();
    const {year, editions} = useEditionStore();
    const wilson = editions.find(e => e.year === year)?.ratingFormula === 'wilson';
    const [tab, setTab] = useState('profile');
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    const {data: candidate, error, mutate} = useSWR(year ? ['candidate', id, year] : null, () => fetchOneCandidate(id, year));
    const {data: nominations} = useSWR(year ? ['nominations', year] : null, () => fetchAllNominations(year));

    const remove = async () => {
        if (!await confirmAction({tone: 'danger', title: 'Удалить кандидата?', confirmText: 'Удалить кандидата',
            description: `«${candidate?.ru?.name}» будет удалён вместе с его новостями. Действие необратимо.`})) return;
        try {
            await deleteCandidate(id);
            toast.success('Кандидат удалён');
            router.push(`/?n=${candidate.nomination}`);
        } catch (e) { toast.fromError(e, 'Не удалось удалить'); }
    };

    if (error || (candidate && !candidate._id)) return (
        <Card><EmptyState icon={UserRound} title="Кандидат не найден" description={`Возможно, он относится к другому году (сейчас выбран ${year}).`}
                          action={<Button href="/">К номинациям</Button>}/></Card>
    );
    if (!candidate || !nominations) return (
        <div className="grid gap-4"><Skeleton className="h-6 w-40"/><Skeleton className="h-28 rounded-2xl"/><Skeleton className="h-96 rounded-2xl"/></div>
    );
    const s = voteStats(candidate);
    const nom = nominations.find(n => n._id === candidate.nomination);

    return (
        <div className="mx-auto max-w-3xl">
            <NextLink href={`/?n=${candidate.nomination}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
                <ChevronLeft size={16}/>{nom?.ru?.name ?? 'Номинации'}
            </NextLink>
            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-start gap-4 px-5 pt-5 sm:px-6">
                    <Avatar src={photoUrl(candidate.photo)} name={candidate.ru?.name} size={64}/>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-semibold text-zinc-900">{candidate.ru?.name}</h1>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                            {candidate.ru?.description}{candidate.isCompany && <Badge tone="blue">компания</Badge>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Badge tone="green">За {fmtNum(s.pro)}</Badge>
                            <Badge tone="red">Против {fmtNum(s.con)}</Badge>
                            <Badge>Поддержка {s.support}%</Badge>
                            {wilson && <Badge>Балл {Number(s.score).toFixed(2)}</Badge>}
                        </div>
                    </div>
                    <Button size="sm" icon={PanelRight} href={`/?c=${id}`}>В панели</Button>
                </div>
                <Tabs className="mt-4 px-5 sm:px-6" value={tab} onChange={setTab}
                      items={[{value: 'profile', label: 'Профиль', icon: UserRound}, {value: 'news', label: 'Новости', icon: Newspaper, count: candidate.newsCount}]}/>
                <div className="px-5 py-6 sm:px-6">
                    <div className={tab === 'profile' ? '' : 'hidden'}>
                        <CandidateForm key={candidate._id} type="update" formId="candidate-page-form" candidate={candidate} nominations={nominations}
                                       onBusy={setBusy} onDirty={setDirty} onSaved={() => { setDirty(false); return mutate(); }}/>
                    </div>
                    {tab === 'news' && <CandidateNews id={id} candidate={candidate} onChanged={() => mutate()}/>}
                </div>
                {tab === 'profile' && (
                    <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 sm:px-6">
                        <Button variant="danger-ghost" icon={Trash2} onClick={remove}>Удалить</Button>
                        <Button type="submit" form="candidate-page-form" variant="primary" loading={busy} disabled={!dirty}>Сохранить</Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Page;
