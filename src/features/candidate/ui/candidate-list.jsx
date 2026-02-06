'use client';

export const dynamic = 'force-dynamic';
import {fetchCandidatesNames} from "@/shared/api/candidates.api";
import CandidateItem from "@/features/candidate/ui/candidate-item";
import useSWR from 'swr';

const CandidateList = ({id}) => {
    const {data: candidates, isLoading, mutate} = useSWR(
        'candidates',
        () => fetchCandidatesNames(id)
    )

    const deleteCandidate = (id) => {
        mutate(candidates.filter(({_id}) => _id !== id), {
            revalidate: false
        })
    }

    if (isLoading) return 'Загрузка...'

    return (
            <ul className={'flex flex-col gap-2'}>
                {candidates.map(candidate => (
                    <CandidateItem
                        candidate={candidate}
                        onDelete={deleteCandidate}
                        key={candidate._id}
                    />
                ))}
            </ul>

    );
};

export default CandidateList;
